<?php

namespace App\Console\Commands;

use App\Support\DatabaseTargetGuard;
use Illuminate\Console\Command;

class VerifyDatabaseTarget extends Command
{
    protected $signature = 'yazoo:verify-database-target';

    protected $description = 'Verify and print only the non-sensitive resolved database target.';

    public function handle(DatabaseTargetGuard $guard): int
    {
        $failures = $guard->failures();

        foreach ($failures as $failure) {
            $this->error($failure);
        }

        if ($failures !== []) {
            return self::FAILURE;
        }

        $connection = (string) config('database.default');
        $this->line('connection='.$connection);
        $this->line('host='.(string) config("database.connections.{$connection}.host"));
        $this->line('port='.(string) config("database.connections.{$connection}.port"));
        $this->line('database='.(string) config("database.connections.{$connection}.database"));
        $this->info('Database target guard passed.');

        return self::SUCCESS;
    }
}
