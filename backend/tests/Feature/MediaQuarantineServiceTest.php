<?php

namespace Tests\Feature;

use App\Contracts\MediaScanner;
use App\Models\MediaAsset;
use App\Models\User;
use App\Services\Media\MediaQuarantineService;
use App\ValueObjects\MediaScanResult;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class MediaQuarantineServiceTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('private');
        Storage::fake('public');
        config([
            'media.filesystem_disk' => 'public',
            'media.scanning.quarantine_disk' => 'private',
        ]);
    }

    public function test_clean_file_stays_private_until_scan_then_is_published(): void
    {
        $service = new MediaQuarantineService(new FakeMediaScanner(MediaScanResult::clean()));
        $asset = $service->quarantine(
            User::factory()->create(),
            $this->imageUpload(),
            'posts',
            'image',
            dispatchScan: false,
        );
        $quarantinePath = $asset->path;

        $this->assertSame(MediaAsset::STATE_PENDING, $asset->state);
        Storage::disk('private')->assertExists($quarantinePath);
        Storage::disk('public')->assertMissing('posts/'.basename($quarantinePath));

        $asset = $service->scan($asset);

        $this->assertSame(MediaAsset::STATE_CLEAN, $asset->state);
        $this->assertSame('public', $asset->disk);
        Storage::disk('private')->assertMissing($quarantinePath);
        Storage::disk('public')->assertExists($asset->path);
    }

    public function test_infected_file_remains_isolated_and_is_never_published(): void
    {
        $service = new MediaQuarantineService(new FakeMediaScanner(MediaScanResult::infected()));
        $asset = $service->quarantine(
            User::factory()->create(),
            $this->imageUpload(),
            'posts',
            'image',
            dispatchScan: false,
        );

        $asset = $service->scan($asset);

        $this->assertSame(MediaAsset::STATE_INFECTED, $asset->state);
        $this->assertSame('private', $asset->disk);
        Storage::disk('private')->assertExists($asset->path);
        Storage::disk('public')->assertMissing('posts/'.basename($asset->path));
    }

    public function test_unavailable_scanner_fails_closed_and_keeps_quarantine(): void
    {
        $service = new MediaQuarantineService(new FakeMediaScanner(MediaScanResult::failed(), available: false));
        $asset = $service->quarantine(
            User::factory()->create(),
            $this->imageUpload(),
            'posts',
            'image',
            dispatchScan: false,
        );

        $asset = $service->scan($asset);

        $this->assertSame(MediaAsset::STATE_SCAN_FAILED, $asset->state);
        $this->assertSame('private', $asset->disk);
        Storage::disk('private')->assertExists($asset->path);
    }

    public function test_worker_does_not_scan_an_asset_claimed_by_another_worker(): void
    {
        $scanner = new FakeMediaScanner(MediaScanResult::clean());
        $service = new MediaQuarantineService($scanner);
        $asset = $service->quarantine(
            User::factory()->create(),
            $this->imageUpload(),
            'posts',
            'image',
            dispatchScan: false,
        );
        $asset->forceFill(['state' => MediaAsset::STATE_SCANNING])->save();

        $result = $service->scan($asset);

        $this->assertSame(MediaAsset::STATE_SCANNING, $result->state);
        $this->assertSame(0, $scanner->scanCalls);
        Storage::disk('private')->assertExists($asset->path);
        Storage::disk('public')->assertMissing('posts/'.basename($asset->path));
    }

    public function test_quarantine_revalidates_extension_mime_and_size(): void
    {
        $service = new MediaQuarantineService(new FakeMediaScanner(MediaScanResult::clean()));

        $this->expectException(ValidationException::class);
        $service->quarantine(
            User::factory()->create(),
            UploadedFile::fake()->create('payload.exe', 10, 'application/octet-stream'),
            'posts',
            'document',
            dispatchScan: false,
        );
    }

    private function imageUpload(): UploadedFile
    {
        return UploadedFile::fake()->createWithContent(
            'safe.png',
            base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+X2FoAAAAASUVORK5CYII='),
        );
    }
}

final class FakeMediaScanner implements MediaScanner
{
    public int $scanCalls = 0;

    public function __construct(
        private readonly MediaScanResult $result,
        private readonly bool $available = true,
    ) {}

    public function isAvailable(): bool
    {
        return $this->available;
    }

    public function scan($stream, array $metadata): MediaScanResult
    {
        $this->scanCalls++;

        return $this->result;
    }
}
