<?php

namespace Tests\Integration;

use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use RuntimeException;
use Tests\TestCase;

class Database2CompatibilityTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        if (
            config('database.default') !== 'mysql'
            || ! filter_var(env('YAZOO_MYSQL_CONCURRENCY_TEST', false), FILTER_VALIDATE_BOOL)
        ) {
            $this->markTestSkipped('Requires the explicitly enabled DATABASE #2 MySQL/MariaDB environment.');
        }
    }

    public function test_transactions_json_decimals_and_dates_match_application_expectations(): void
    {
        $cacheKey = 'database2-rollback-'.Str::uuid();

        try {
            DB::transaction(function () use ($cacheKey): never {
                DB::table('cache')->insert([
                    'key' => $cacheKey,
                    'value' => 'temporary',
                    'expiration' => now()->addMinute()->timestamp,
                ]);

                throw new RuntimeException('intentional rollback');
            });
        } catch (RuntimeException $exception) {
            $this->assertSame('intentional rollback', $exception->getMessage());
        }

        $this->assertFalse(DB::table('cache')->where('key', $cacheKey)->exists());
        $values = DB::selectOne(<<<'SQL'
            SELECT
                JSON_UNQUOTE(JSON_EXTRACT('{"currency":"MAD"}', '$.currency')) AS currency,
                CAST(12.34 AS DECIMAL(10, 2)) AS amount,
                TIMESTAMPDIFF(MINUTE, '2026-01-01 10:00:00', '2026-01-01 11:30:00') AS minutes
            SQL);

        $this->assertSame('MAD', $values->currency);
        $this->assertSame('12.34', (string) $values->amount);
        $this->assertSame(90, (int) $values->minutes);
    }

    public function test_foreign_keys_and_search_indexes_are_enforced(): void
    {
        try {
            DB::table('veterinarian_availability_slots')->insert([
                'veterinarian_id' => PHP_INT_MAX,
                'starts_at' => now()->addDay(),
                'ends_at' => now()->addDay()->addHour(),
                'is_available' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            $this->fail('The veterinarian foreign key accepted a missing parent.');
        } catch (QueryException) {
            $this->addToAssertionCount(1);
        }

        $schema = (string) DB::getDatabaseName();
        $foreignKeys = DB::table('information_schema.REFERENTIAL_CONSTRAINTS')
            ->where('CONSTRAINT_SCHEMA', $schema)
            ->count();
        $fullTextIndexes = DB::table('information_schema.STATISTICS')
            ->where('TABLE_SCHEMA', $schema)
            ->where('INDEX_TYPE', 'FULLTEXT')
            ->distinct()
            ->count('INDEX_NAME');

        $this->assertGreaterThan(0, $foreignKeys);
        $this->assertGreaterThan(0, $fullTextIndexes);
    }
}
