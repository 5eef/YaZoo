<?php

namespace Tests\Support;

final class DisposableDatabaseTarget
{
    public static function permits(string $environment, string $driver, array $connection, bool $mysqlFixtureEnabled): bool
    {
        if ($environment !== 'testing' || ! empty($connection['url'])) {
            return false;
        }

        if ($driver === 'sqlite') {
            return ($connection['database'] ?? null) === ':memory:';
        }

        return $mysqlFixtureEnabled
            && $driver === 'mysql'
            && ($connection['host'] ?? null) === '127.0.0.1'
            && (string) ($connection['port'] ?? '') === '3306'
            && ($connection['database'] ?? null) === 'yazoo_concurrency'
            && ($connection['username'] ?? null) === 'yazoo_test';
    }
}
