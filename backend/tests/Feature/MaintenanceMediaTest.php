<?php

namespace Tests\Feature;

use App\Jobs\ScanQuarantinedMedia;
use App\Models\MediaAsset;
use App\Models\User;
use App\Services\Media\MediaQuarantineService;
use App\Support\LegacyDataMigrator;
use App\Support\LegacyMediaMigrator;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Storage;
use ReflectionMethod;
use RuntimeException;
use Tests\TestCase;

class MaintenanceMediaTest extends TestCase
{
    use RefreshDatabase;

    public function test_media_backup_is_repeatable_and_prunes_only_expired_backup_directories(): void
    {
        Storage::fake('public');
        Storage::fake('backups');
        config(['media.driver' => 'filesystem', 'media.filesystem_disk' => 'public']);
        Storage::disk('public')->put('animals/photo.jpg', 'safe fixture');
        Storage::disk('backups')->put('media/20260101_000000/old.txt', 'old');
        Storage::disk('backups')->put('media/20260102_000000/older.txt', 'older');
        Carbon::setTestNow('2026-08-14 12:00:00');

        try {
            $this->artisan('yazoo:backup-media', ['--disk' => 'backups', '--keep' => 2])
                ->assertExitCode(0);
            $this->artisan('yazoo:backup-media', ['--disk' => 'backups', '--keep' => 2])
                ->assertExitCode(0);
        } finally {
            Carbon::setTestNow();
        }

        Storage::disk('backups')->assertMissing('media/20260101_000000/old.txt');
        Storage::disk('backups')->assertExists('media/20260102_000000/older.txt');
        Storage::disk('backups')->assertExists('media/20260814_120000/animals/photo.jpg');
    }

    public function test_media_scan_job_is_idempotent_for_a_published_asset_and_fails_closed_after_retries(): void
    {
        $owner = User::factory()->create();
        $asset = $owner->ownedMediaAssets()->create([
            'disk' => 'public',
            'path' => 'animals/clean.jpg',
            'path_hash' => hash('sha256', 'animals/clean.jpg'),
            'kind' => 'image',
            'state' => MediaAsset::STATE_ACTIVE,
            'visibility' => MediaAsset::VISIBILITY_PUBLIC,
        ]);
        $job = new ScanQuarantinedMedia($asset->id);

        $job->handle(app(MediaQuarantineService::class));
        $this->assertSame(MediaAsset::STATE_ACTIVE, $asset->fresh()->state);

        $asset->forceFill(['state' => MediaAsset::STATE_PENDING])->save();
        $job->failed(new RuntimeException('scanner unavailable'));
        $this->assertSame(MediaAsset::STATE_SCAN_FAILED, $asset->fresh()->state);
    }

    public function test_legacy_normalizers_are_deterministic_for_retryable_migrations(): void
    {
        $normalizeJson = new ReflectionMethod(LegacyDataMigrator::class, 'normalizeJsonColumn');
        $decodePaths = new ReflectionMethod(LegacyMediaMigrator::class, 'decodeJsonArray');
        $extractPath = new ReflectionMethod(LegacyMediaMigrator::class, 'extractPublicDiskRelativePath');
        config(['app.url' => 'https://api.yazoo.test']);

        $this->assertSame('["chat"]', $normalizeJson->invoke(null, '["chat"]'));
        $this->assertSame('"invalid-json"', $normalizeJson->invoke(null, 'invalid-json'));
        $this->assertSame(['a.jpg', 'a.jpg'], $decodePaths->invoke(null, '["a.jpg","","a.jpg"]'));
        $this->assertSame(
            'animals/photo.jpg',
            $extractPath->invoke(null, 'https://api.yazoo.test/storage/animals/photo.jpg'),
        );
        $this->assertNull($extractPath->invoke(null, 'https://external.test/photo.jpg'));
    }
}
