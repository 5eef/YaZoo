<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Cache;

class RunProductionMigrations extends Command
{
    protected $signature = 'yazoo:migrate-production
        {--force : Run the controlled migration step even when startup migrations are disabled}';

    protected $description = 'Run production migrations once under a distributed cache lock.';

    public function handle(): int
    {
        if (! (bool) config('operations.run_migrations') && ! (bool) $this->option('force')) {
            $this->info('Startup migrations are disabled.');

            return self::SUCCESS;
        }

        $lock = Cache::lock(
            'operations:production-migrations',
            max(60, (int) config('operations.migration_lock_seconds', 1800)),
        );

        if (! $lock->get()) {
            $this->error('Another migration process owns the distributed lock.');

            return self::FAILURE;
        }

        try {
            $exitCode = Artisan::call('migrate', [
                '--force' => true,
                '--no-interaction' => true,
            ]);
            $this->output->write(Artisan::output());

            return $exitCode === self::SUCCESS ? self::SUCCESS : self::FAILURE;
        } finally {
            $lock->release();
        }
    }
}
