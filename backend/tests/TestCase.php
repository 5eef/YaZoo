<?php

namespace Tests;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    public function createApplication()
    {
        $app = parent::createApplication();

        // Check before RefreshDatabase can run migrations, even with cached config.
        if (isset($this->traitsUsedByTest[RefreshDatabase::class])) {
            if (! $app->environment('testing')
                || config('database.default') !== 'sqlite'
                || config('database.connections.sqlite.database') !== ':memory:'
                || ! empty(config('database.connections.sqlite.url'))) {
                throw new \RuntimeException('Destructive feature tests require testing with SQLite :memory:.');
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
