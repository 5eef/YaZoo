<?php

namespace Tests\Feature;

use App\Contracts\MediaScanner;
use App\Models\MediaAsset;
use App\Models\User;
use App\Services\MediaAssetService;
use App\ValueObjects\MediaScanResult;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Tests\TestCase;

class ScannedUploadPolicyTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');
        Storage::fake('private');
        config(['media.scanning.enabled' => true]);
    }

    private function scanner(MediaScanResult $result): void
    {
        $this->app->instance(MediaScanner::class, new class($result) implements MediaScanner
        {
            public function __construct(private MediaScanResult $result) {}

            public function isAvailable(): bool
            {
                return true;
            }

            public function scan($stream, array $metadata): MediaScanResult
            {
                return $this->result;
            }
        });
    }

    private function image(): UploadedFile
    {
        return UploadedFile::fake()->createWithContent('valid.png', base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZK1sAAAAASUVORK5CYII='));
    }

    public function test_private_post_is_scanned_and_remains_private_after_clean_result(): void
    {
        $this->scanner(MediaScanResult::clean());
        $asset = app(MediaAssetService::class)->registerPostUpload(User::factory()->create(), $this->image(), 'image');
        $this->assertSame(MediaAsset::STATE_CLEAN, $asset->state);
        $this->assertSame('private', $asset->disk);
        Storage::disk('private')->assertExists($asset->path);
        $this->assertSame([], Storage::disk('public')->allFiles());
    }

    public function test_infected_upload_cannot_be_attached_or_published(): void
    {
        $this->scanner(MediaScanResult::infected());
        try {
            app(MediaAssetService::class)->registerUpload(User::factory()->create(), $this->image(), 'avatars', 'image');
            $this->fail('An infected upload must fail closed.');
        } catch (HttpException $exception) {
            $this->assertSame(503, $exception->getStatusCode());
        }
        $asset = MediaAsset::query()->sole();
        $this->assertSame(MediaAsset::STATE_INFECTED, $asset->state);
        $this->assertNull($asset->attachable_id);
        $this->assertSame([], Storage::disk('public')->allFiles());
        Storage::disk('private')->assertExists($asset->path);
    }

    public function test_production_profile_cannot_bypass_scan_with_disabled_flags(): void
    {
        config([
            'operations.deployment_profile' => 'production',
            'media.scanning.enabled' => false,
            'media.scanning.required_in_production' => false,
        ]);
        $this->assertTrue(app(MediaAssetService::class)->requiresScan());
        $this->scanner(MediaScanResult::failed('scanner_unavailable'));
        $this->expectException(HttpException::class);
        app(MediaAssetService::class)->registerUpload(User::factory()->create(), $this->image(), 'avatars', 'image');
    }
}
