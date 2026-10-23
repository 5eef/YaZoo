<?php

namespace Tests\Unit\Support;

use PHPUnit\Framework\TestCase;
use Tests\Support\DisposableDatabaseTarget;

class DisposableDatabaseTargetTest extends TestCase
{
    public function test_only_memory_sqlite_or_the_explicit_loopback_mysql_fixture_is_permitted(): void
    {
        $fixture = ['host' => '127.0.0.1', 'port' => '3306', 'database' => 'yazoo_concurrency', 'username' => 'yazoo_test', 'url' => null];
        $this->assertTrue(DisposableDatabaseTarget::permits('testing', 'sqlite', ['database' => ':memory:'], false));
        $this->assertTrue(DisposableDatabaseTarget::permits('testing', 'mysql', $fixture, true));
        $this->assertFalse(DisposableDatabaseTarget::permits('testing', 'mysql', $fixture, false));
        $this->assertFalse(DisposableDatabaseTarget::permits('production', 'mysql', $fixture, true));
        foreach ([
            ['host' => 'gateway.tidbcloud.com'],
            ['port' => '4000'],
            ['database' => 'yazoo_showcase_afwaj'],
            ['username' => 'root'],
            ['url' => 'mysql://remote/anything'],
        ] as $override) {
            $this->assertFalse(DisposableDatabaseTarget::permits('testing', 'mysql', array_replace($fixture, $override), true));
        }
        $this->assertFalse(DisposableDatabaseTarget::permits('testing', 'sqlite', ['database' => '/tmp/persistent.sqlite'], true));
    }
}
