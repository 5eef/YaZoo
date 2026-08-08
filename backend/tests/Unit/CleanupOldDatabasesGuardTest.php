<?php

namespace Tests\Unit;

use InvalidArgumentException;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;
use RuntimeException;

require_once __DIR__.'/../../cleanup_old_databases.php';

class CleanupOldDatabasesGuardTest extends TestCase
{
    public function test_cleanup_is_a_dry_run_by_default(): void
    {
        $this->assertSame([
            'execute' => false,
            'confirmation' => null,
        ], yazooCleanupParseOptions(['cleanup_old_databases.php']));
    }

    public function test_cleanup_rejects_unknown_options(): void
    {
        $this->expectException(InvalidArgumentException::class);

        yazooCleanupParseOptions(['cleanup_old_databases.php', '--force']);
    }

    /**
     * @param  array<string, string>  $override
     */
    #[DataProvider('unsafeEnvironmentProvider')]
    public function test_cleanup_rejects_unsafe_execution_environments(array $override): void
    {
        $this->expectException(RuntimeException::class);

        yazooCleanupValidateExecution(
            array_replace($this->safeEnvironment(), $override),
            YAZOO_CLEANUP_CONFIRMATION,
        );
    }

    /**
     * @return array<string, array{array<string, string>}>
     */
    public static function unsafeEnvironmentProvider(): array
    {
        return [
            'production environment' => [['APP_ENV' => 'production']],
            'missing explicit gate' => [['YAZOO_ALLOW_LEGACY_DATABASE_CLEANUP' => 'false']],
            'remote MySQL host' => [['DB_HOST' => 'mysql.example.com']],
            'active MySQL target' => [['DB_DATABASE' => YAZOO_LEGACY_MYSQL_DATABASE]],
            'remote MongoDB host' => [['MEDIA_MONGODB_URI' => 'mongodb://mongo.example.com:27017']],
            'active MongoDB target' => [['MEDIA_MONGODB_DATABASE' => YAZOO_LEGACY_MONGO_DATABASE]],
        ];
    }

    public function test_cleanup_requires_the_exact_confirmation(): void
    {
        $this->expectException(RuntimeException::class);

        yazooCleanupValidateExecution($this->safeEnvironment(), 'yes');
    }

    public function test_cleanup_accepts_only_a_fully_guarded_local_configuration(): void
    {
        yazooCleanupValidateExecution($this->safeEnvironment(), YAZOO_CLEANUP_CONFIRMATION);

        $this->addToAssertionCount(1);
    }

    /**
     * @return array<string, string>
     */
    private function safeEnvironment(): array
    {
        return [
            'APP_ENV' => 'local',
            'YAZOO_ALLOW_LEGACY_DATABASE_CLEANUP' => 'true',
            'DB_HOST' => '127.0.0.1',
            'DB_DATABASE' => 'yazoo',
            'MEDIA_MONGODB_URI' => 'mongodb://127.0.0.1:27017',
            'MEDIA_MONGODB_DATABASE' => 'yazoo_active_media',
        ];
    }
}
