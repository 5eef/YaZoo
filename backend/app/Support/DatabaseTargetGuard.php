<?php

namespace App\Support;

final class DatabaseTargetGuard
{
    /**
     * @return array<int, string>
     */
    public function failures(): array
    {
        $connection = (string) config('database.default');
        $host = $this->normalizeHost(config("database.connections.{$connection}.host"));
        $port = trim((string) config("database.connections.{$connection}.port"));
        $database = trim((string) config("database.connections.{$connection}.database"));
        $expectedHost = $this->normalizeHost(config('operations.expected_database_host'));
        $expectedPort = trim((string) config('operations.expected_database_port'));
        $expectedDatabase = trim((string) config('operations.expected_database_name'));
        $protectedDatabases = collect(config('operations.protected_database_names', []))
            ->map(fn (mixed $name): string => mb_strtolower(trim((string) $name)))
            ->filter()
            ->values();
        $failures = [];

        if ($protectedDatabases->contains(mb_strtolower($database))) {
            $failures[] = 'Configured database is protected from deployment migrations.';
        }

        if (! (bool) config('operations.require_expected_database')) {
            return $failures;
        }

        foreach ([
            'YAZOO_EXPECTED_DB_HOST' => $expectedHost,
            'YAZOO_EXPECTED_DB_PORT' => $expectedPort,
            'YAZOO_EXPECTED_DB_NAME' => $expectedDatabase,
        ] as $name => $value) {
            if ($value === '') {
                $failures[] = "{$name} is required when the database target guard is enabled.";
            }
        }

        if ($expectedHost !== '' && $host !== $expectedHost) {
            $failures[] = 'Configured database host does not match YAZOO_EXPECTED_DB_HOST.';
        }

        if ($expectedPort !== '' && $port !== $expectedPort) {
            $failures[] = 'Configured database port does not match YAZOO_EXPECTED_DB_PORT.';
        }

        if ($expectedDatabase !== '' && strcasecmp($database, $expectedDatabase) !== 0) {
            $failures[] = 'Configured database name does not match YAZOO_EXPECTED_DB_NAME.';
        }

        return array_values(array_unique($failures));
    }

    private function normalizeHost(mixed $host): string
    {
        return mb_strtolower(rtrim(trim((string) $host), '.'));
    }
}
