<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

class BackupMedia extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'yazoo:backup-media
        {--disk= : Backup disk name}
        {--keep=7 : Number of backup directories to keep}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Backup public media files to the configured backup disk';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        if ((string) config('media.driver', 'filesystem') !== 'filesystem') {
            $this->warn('Le backup media automatique est prevu pour le driver filesystem.');

            return self::FAILURE;
        }

        $sourceDiskName = (string) config('media.filesystem_disk', 'public');
        $backupDiskName = (string) ($this->option('disk') ?: env('MEDIA_BACKUP_DISK', 'backups'));
        if ($sourceDiskName === $backupDiskName) {
            $this->error('Source and backup disks must be different.');

            return self::FAILURE;
        }
        $sourceDisk = Storage::disk($sourceDiskName);
        $backupDisk = Storage::disk($backupDiskName);
        $backupDirectory = 'media/'.now()->format('Ymd_His');
        $files = $sourceDisk->allFiles();

        foreach ($files as $file) {
            $stream = $sourceDisk->readStream($file);

            if (! is_resource($stream)) {
                $this->error('Media backup read failed; previous backups have been preserved.');

                return self::FAILURE;
            }

            try {
                if (! $backupDisk->writeStream($backupDirectory.'/'.$file, $stream)) {
                    $this->error('Media backup write failed; previous backups have been preserved.');

                    return self::FAILURE;
                }
            } finally {
                fclose($stream);
            }
        }

        $this->pruneOldBackups($backupDiskName, (int) $this->option('keep'));

        $this->info(sprintf(
            '%d fichier(s) media sauvegarde(s) dans %s:%s',
            count($files),
            $backupDiskName,
            $backupDirectory,
        ));

        return self::SUCCESS;
    }

    /**
     * Remove old backup directories beyond the retention threshold.
     */
    protected function pruneOldBackups(string $backupDiskName, int $keep): void
    {
        $directories = collect(Storage::disk($backupDiskName)->directories('media'))
            ->sort()
            ->values();

        if ($keep < 1 || $directories->count() <= $keep) {
            return;
        }

        $directories
            ->slice(0, $directories->count() - $keep)
            ->each(fn (string $directory) => Storage::disk($backupDiskName)->deleteDirectory($directory));
    }
}
