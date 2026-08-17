<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        if (app()->isProduction()) {
            throw new \RuntimeException(
                'Demo seeders are disabled in production. Use the guarded yazoo:bootstrap-release-admin command for a new release database.',
            );
        }

        $this->call([
            DemoContentSeeder::class,
        ]);
    }
}
