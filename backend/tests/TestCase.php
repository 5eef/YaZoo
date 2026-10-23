<?php

namespace Tests;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Tests\Support\DisposableDatabaseTarget;

abstract class TestCase extends BaseTestCase
{
    public function createApplication()
    {
        $app = parent::createApplication();

        // Check before RefreshDatabase can run migrations, even with cached config.
        if (isset($this->traitsUsedByTest[RefreshDatabase::class])) {
            $driver = (string) config('database.default');
            if (! DisposableDatabaseTarget::permits(
                $app->environment(),
                $driver,
                config("database.connections.{$driver}", []),
                filter_var(env('YAZOO_MYSQL_CONCURRENCY_TEST', false), FILTER_VALIDATE_BOOL),
            )) {
                throw new \RuntimeException('Destructive feature tests require SQLite :memory: or the explicitly enabled loopback MySQL CI fixture.');
            }
        }

        return $app;
    }

    protected function setUp(): void
    {
        parent::setUp();

        $this->withHeader('Accept-Language', 'fr');
    }
}
