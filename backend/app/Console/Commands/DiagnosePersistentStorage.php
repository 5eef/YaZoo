<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;
use Throwable;

class DiagnosePersistentStorage extends Command
{
    protected $signature = 'yazoo:diagnose-storage {--write-test : Create, verify and remove one random temporary probe}';

    protected $description = 'Diagnose persistent media paths without listing or reading user media.';

    public function handle(): int
    {
        $root = rtrim((string) config('operations.persistent_storage_path'), '/\\');
        $failures = [];

        foreach (['app/public', 'app/private'] as $relative) {
            $path = $root.DIRECTORY_SEPARATOR.str_replace('/', DIRECTORY_SEPARATOR, $relative);
            $exists = is_dir($path);
            $readable = $exists && is_readable($path);
            $writable = $exists && is_writable($path);
            $this->line("{$relative}: exists=".($exists ? 'yes' : 'no')
                .', readable='.($readable ? 'yes' : 'no')
                .', writable='.($writable ? 'yes' : 'no'));

            if (! $exists || ! $readable || ! $writable) {
                $failures[] = $relative;

                continue;
            }

            if ($this->option('write-test') && ! $this->writeProbe($path)) {
                $failures[] = "{$relative}:write-test";
            }
        }

        if ($failures !== []) {
            $this->error('Persistent storage diagnostic failed.');

            return self::FAILURE;
        }

        $this->info('Persistent storage diagnostic passed.');

        return self::SUCCESS;
    }

    private function writeProbe(string $path): bool
    {
        $probe = $path.DIRECTORY_SEPARATOR.'.yazoo-storage-probe-'.bin2hex(random_bytes(8));
        $payload = random_bytes(32);

        try {
            return File::put($probe, $payload, true) !== false
                && hash_equals(hash('sha256', $payload), hash_file('sha256', $probe));
        } catch (Throwable) {
            return false;
        } finally {
            if (is_file($probe)) {
                File::delete($probe);
            }
        }
    }
}
