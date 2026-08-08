<?php

namespace Tests\Integration;

use App\Models\DataDeletionRequest;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseMigrations;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Symfony\Component\Process\Process;
use Tests\TestCase;

class AccountDeletionMySqlConcurrencyTest extends TestCase
{
    use DatabaseMigrations;

    private string $cachePrefix;

    protected function setUp(): void
    {
        parent::setUp();

        if (config('database.default') !== 'mysql' || env('YAZOO_MYSQL_CONCURRENCY_TEST') !== 'true') {
            $this->markTestSkipped('Requires the explicitly enabled disposable MySQL concurrency environment.');
        }

        $this->cachePrefix = 'yazoo_concurrency_'.Str::lower((string) Str::uuid()).'_';
        config([
            'cache.prefix' => $this->cachePrefix,
            'operations.account_deletion_unique_lock_store' => 'redis',
            'operations.account_deletion_retry_max_attempts' => 5,
            'operations.account_deletion_processing_lease_seconds' => 60,
        ]);
    }

    public function test_two_workers_recover_one_expired_pre_anonymization_lease_once(): void
    {
        $admin = User::factory()->admin()->create();
        $user = User::factory()->create();
        $request = DataDeletionRequest::query()->create([
            'user_id' => $user->id,
            'status' => 'processing',
            'processing_attempts' => 1,
            'processing_started_at' => now()->subMinutes(10),
            'reviewed_by' => $admin->id,
            'reviewed_at' => now()->subMinutes(10),
        ]);

        $this->runConcurrently('process', $request->id, $admin->id);

        $request->refresh();
        $this->assertSame('completed', $request->status);
        $this->assertSame(2, $request->processing_attempts);
        $this->assertNotNull($request->database_anonymized_at);
        $this->assertNotNull($request->purge_completed_at);
    }

    public function test_two_workers_resume_a_post_anonymization_partial_purge_idempotently(): void
    {
        $path = 'concurrency-tests/'.Str::uuid().'/remaining.txt';
        Storage::disk('public')->put($path, 'temporary concurrency fixture');

        try {
            $admin = User::factory()->admin()->create();
            $user = User::factory()->create([
                'email' => 'deleted.'.Str::random(20).'@deleted.invalid',
                'is_suspended' => true,
                'banned_at' => now(),
            ]);
            $request = DataDeletionRequest::query()->create([
                'user_id' => $user->id,
                'status' => 'processing',
                'processing_attempts' => 1,
                'processing_started_at' => now()->subMinutes(10),
                'database_anonymized_at' => now()->subMinutes(10),
                'purge_manifest' => [
                    'private' => [],
                    'public' => ['concurrency-tests/already-removed.txt', $path],
                ],
                'reviewed_by' => $admin->id,
                'reviewed_at' => now()->subMinutes(10),
            ]);

            $this->runConcurrently('process', $request->id, $admin->id);

            $request->refresh();
            $this->assertSame('completed', $request->status);
            $this->assertSame(2, $request->processing_attempts);
            Storage::disk('public')->assertMissing($path);
        } finally {
            Storage::disk('public')->delete($path);
        }
    }

    public function test_two_dispatchers_create_one_unique_database_job(): void
    {
        $admin = User::factory()->admin()->create();
        $user = User::factory()->create();
        $request = DataDeletionRequest::query()->create([
            'user_id' => $user->id,
            'status' => 'failed',
            'processing_attempts' => 1,
            'failure_code' => 'storage_cleanup_failed',
            'database_anonymized_at' => now()->subHour(),
            'purge_manifest' => ['private' => [], 'public' => []],
            'reviewed_by' => $admin->id,
            'reviewed_at' => now()->subHour(),
        ]);
        $request->forceFill(['updated_at' => now()->subHour()])->saveQuietly();

        $this->runConcurrently('dispatch', $request->id, $admin->id);

        $this->assertSame(1, DB::table('jobs')->count());
    }

    public function test_recent_lease_is_not_recovered_and_exhausted_lease_is_terminal(): void
    {
        $admin = User::factory()->admin()->create();
        $recentUser = User::factory()->create();
        $recent = DataDeletionRequest::query()->create([
            'user_id' => $recentUser->id,
            'status' => 'processing',
            'processing_attempts' => 1,
            'processing_started_at' => now(),
            'reviewed_by' => $admin->id,
            'reviewed_at' => now(),
        ]);
        $exhaustedUser = User::factory()->create();
        $exhausted = DataDeletionRequest::query()->create([
            'user_id' => $exhaustedUser->id,
            'status' => 'processing',
            'processing_attempts' => 5,
            'processing_started_at' => now()->subMinutes(10),
            'reviewed_by' => $admin->id,
            'reviewed_at' => now()->subMinutes(10),
        ]);

        $this->runConcurrently('dispatch', $recent->id, $admin->id);

        $this->assertSame(0, DB::table('jobs')->count());
        $this->assertSame('processing', $recent->fresh()->status);
        $this->assertSame(1, $recent->fresh()->processing_attempts);
        $this->assertSame('failed', $exhausted->fresh()->status);
        $this->assertSame('processing_recovery_exhausted', $exhausted->fresh()->failure_code);
        $this->assertSame(5, $exhausted->fresh()->processing_attempts);
    }

    private function runConcurrently(string $operation, int $requestId, int $reviewerId): void
    {
        $barrier = sys_get_temp_dir().DIRECTORY_SEPARATOR.'yazoo-concurrency-'.Str::uuid();
        mkdir($barrier, 0700, true);
        $worker = base_path('tests/Integration/fixtures/account_deletion_worker.php');
        $environment = $this->childEnvironment();
        $processes = [
            new Process([PHP_BINARY, $worker, $operation, (string) $requestId, (string) $reviewerId, $barrier], base_path(), $environment),
            new Process([PHP_BINARY, $worker, $operation, (string) $requestId, (string) $reviewerId, $barrier], base_path(), $environment),
        ];

        try {
            foreach ($processes as $process) {
                $process->setTimeout(30);
                $process->start();
            }

            $deadline = microtime(true) + 15;
            while (count(glob($barrier.DIRECTORY_SEPARATOR.'ready-*') ?: []) < 2 && microtime(true) < $deadline) {
                usleep(20_000);
            }

            $this->assertCount(2, glob($barrier.DIRECTORY_SEPARATOR.'ready-*') ?: [], 'Both workers must reach the concurrency barrier.');
            file_put_contents($barrier.DIRECTORY_SEPARATOR.'start', 'start', LOCK_EX);

            foreach ($processes as $process) {
                $process->wait();
                $this->assertSame(0, $process->getExitCode(), 'A concurrency worker exited unsuccessfully.');
            }
        } finally {
            foreach (glob($barrier.DIRECTORY_SEPARATOR.'*') ?: [] as $temporaryFile) {
                unlink($temporaryFile);
            }
            rmdir($barrier);
        }
    }

    /**
     * @return array<string, string>
     */
    private function childEnvironment(): array
    {
        return [
            'APP_ENV' => 'testing',
            'APP_KEY' => (string) config('app.key'),
            'CACHE_PREFIX' => $this->cachePrefix,
            'CACHE_STORE' => 'redis',
            'DB_CONNECTION' => 'mysql',
            'DB_HOST' => (string) config('database.connections.mysql.host'),
            'DB_PORT' => (string) config('database.connections.mysql.port'),
            'DB_DATABASE' => (string) config('database.connections.mysql.database'),
            'DB_USERNAME' => (string) config('database.connections.mysql.username'),
            'DB_PASSWORD' => (string) config('database.connections.mysql.password'),
            'FILESYSTEM_DISK' => 'public',
            'MEDIA_STORAGE_DRIVER' => 'filesystem',
            'MEDIA_FILESYSTEM_DISK' => 'public',
            'PROFESSIONAL_VERIFICATIONS_DISK' => 'private',
            'QUEUE_CONNECTION' => 'database',
            'REDIS_CLIENT' => (string) config('database.redis.client'),
            'REDIS_HOST' => (string) config('database.redis.default.host'),
            'REDIS_PORT' => (string) config('database.redis.default.port'),
            'REDIS_PASSWORD' => (string) (config('database.redis.default.password') ?? ''),
            'YAZOO_ACCOUNT_DELETION_PROCESSING_LEASE_SECONDS' => '60',
            'YAZOO_ACCOUNT_DELETION_RETRY_MAX_ATTEMPTS' => '5',
            'YAZOO_ACCOUNT_DELETION_UNIQUE_LOCK_STORE' => 'redis',
        ];
    }
}
