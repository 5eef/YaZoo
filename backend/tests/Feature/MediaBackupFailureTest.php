<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Storage;
use Mockery;
use Tests\TestCase;

class MediaBackupFailureTest extends TestCase
{
    public function test_failed_backup_write_does_not_report_success_or_prune_previous_backups(): void
    {
        config(['media.driver' => 'filesystem', 'media.filesystem_disk' => 'public']);
        $source = Mockery::mock();
        $destination = Mockery::mock();
        $stream = fopen('php://temp', 'w+b');
        $source->shouldReceive('allFiles')->once()->andReturn(['fixture.jpg']);
        $source->shouldReceive('readStream')->once()->with('fixture.jpg')->andReturn($stream);
        $destination->shouldReceive('writeStream')->once()->andReturn(false);
        $destination->shouldNotReceive('directories');
        $destination->shouldNotReceive('deleteDirectory');
        Storage::shouldReceive('disk')->with('public')->andReturn($source);
        Storage::shouldReceive('disk')->with('backups')->andReturn($destination);

        $this->artisan('yazoo:backup-media', ['--disk' => 'backups'])
            ->expectsOutput('Media backup write failed; previous backups have been preserved.')
            ->assertFailed();
        $this->assertFalse(is_resource($stream));
    }

    public function test_gridfs_and_same_disk_backups_fail_without_claiming_recovery_coverage(): void
    {
        config(['media.driver' => 'mongodb']);
        $this->artisan('yazoo:backup-media')->assertFailed();
        config(['media.driver' => 'filesystem', 'media.filesystem_disk' => 'public']);
        $this->artisan('yazoo:backup-media', ['--disk' => 'public'])->assertFailed();
    }
}
