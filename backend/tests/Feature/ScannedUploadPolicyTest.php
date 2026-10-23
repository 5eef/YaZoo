<?php

namespace Tests\Feature;

use App\Contracts\MediaScanner;
use App\Models\MediaAsset;
use App\Models\User;
use App\Services\Media\VerifiedDemoMediaScanner;
use App\Services\MediaAssetService;
use App\ValueObjects\MediaScanResult;
use Carbon\Carbon;
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

    public function test_demo_manifest_mode_cannot_be_bypassed_by_disabling_scan_or_using_another_account(): void
    {
        config(['media.scanning.enabled' => false, 'media.scanning.driver' => 'verified_demo_manifest', 'media.scanning.demo_allowed_user_ids' => []]);
        $this->assertTrue(app(MediaAssetService::class)->requiresScan());
        $this->expectException(HttpException::class);
        app(MediaAssetService::class)->registerUpload(User::factory()->create(), $this->image(), 'avatars', 'image');
    }

    public function test_real_pre_scanned_release_asset_is_published_privately_but_modified_bytes_stay_quarantined(): void
    {
        $manifest = json_decode(file_get_contents(resource_path('demo-media-manifest.json')), true);
        $this->travelTo(Carbon::parse($manifest['scanned_at'])->addMinute());
        $owner = User::factory()->create();
        config(['operations.deployment_profile' => 'showcase', 'media.scanning.driver' => 'verified_demo_manifest', 'media.scanning.demo_allowed_user_ids' => [$owner->id]]);
        $this->app->instance(MediaScanner::class, new VerifiedDemoMediaScanner(resource_path('demo-media-manifest.json'), 'showcase', [$owner->id]));
        $bytes = file_get_contents(database_path('seeders/assets/marketplace/dresseur_chien.png'));
        $asset = app(MediaAssetService::class)->registerPostUpload($owner, UploadedFile::fake()->createWithContent('demo.png', $bytes), 'image');
        $this->assertSame(MediaAsset::STATE_CLEAN, $asset->state);
        $this->assertSame('private', $asset->disk);
        $this->assertSame($bytes, Storage::disk('private')->get($asset->path));
        try {
            app(MediaAssetService::class)->registerPostUpload($owner, UploadedFile::fake()->createWithContent('demo.png', $bytes.'changed'), 'image');
            $this->fail('Changed bytes must stay in quarantine.');
        } catch (HttpException $exception) {
            $this->assertSame(503, $exception->getStatusCode());
        }
        $this->assertDatabaseHas('media_assets', ['owner_id' => $owner->id, 'state' => MediaAsset::STATE_SCAN_FAILED]);
        $this->assertSame([], Storage::disk('public')->allFiles());
    }
}
