<?php

namespace Tests\Feature;

use App\Jobs\RetryAccountDeletionPurge;
use App\Models\DataDeletionRequest;
use App\Models\User;
use App\Services\Privacy\AccountDeletionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use RuntimeException;
use Tests\TestCase;

class AccountDeletionRetryTest extends TestCase
{
    use RefreshDatabase;

    public function test_dispatch_command_queues_only_due_storage_retries(): void
    {
        Queue::fake();
        $admin = User::factory()->admin()->create();
        $due = $this->failedRequest($admin, attempts: 1, updatedAt: now()->subMinutes(10));
        $this->failedRequest($admin, attempts: 1, updatedAt: now());
        $this->failedRequest($admin, attempts: 5, updatedAt: now()->subDay());
        $this->processingRequest($admin, attempts: 1, stale: false);

        $this->artisan('yazoo:dispatch-account-deletion-retries')
            ->expectsOutput('Account deletion purge retries queued=1.')
            ->expectsOutput('Account deletion recoveries exhausted=1.')
            ->assertSuccessful();

        Queue::assertPushed(
            RetryAccountDeletionPurge::class,
            fn (RetryAccountDeletionPurge $job): bool => $job->deletionRequestId === $due->id,
        );
        Queue::assertPushed(RetryAccountDeletionPurge::class, 1);
    }

    public function test_expired_processing_leases_are_recovered_before_and_after_anonymization(): void
    {
        Queue::fake();
        $admin = User::factory()->admin()->create();
        $before = $this->processingRequest($admin, attempts: 1, stale: true);
        $after = $this->processingRequest($admin, attempts: 2, stale: true, anonymized: true);
        $recent = $this->processingRequest($admin, attempts: 1, stale: false);

        $this->artisan('yazoo:dispatch-account-deletion-retries')
            ->expectsOutput('Account deletion purge retries queued=2.')
            ->expectsOutput('Account deletion recoveries exhausted=0.')
            ->assertSuccessful();

        Queue::assertPushed(
            RetryAccountDeletionPurge::class,
            fn (RetryAccountDeletionPurge $job): bool => $job->deletionRequestId === $before->id,
        );
        Queue::assertPushed(
            RetryAccountDeletionPurge::class,
            fn (RetryAccountDeletionPurge $job): bool => $job->deletionRequestId === $after->id,
        );
        Queue::assertNotPushed(
            RetryAccountDeletionPurge::class,
            fn (RetryAccountDeletionPurge $job): bool => $job->deletionRequestId === $recent->id,
        );
    }

    public function test_configured_processing_limit_is_the_single_source_for_queue_attempts(): void
    {
        foreach ([2 => 1, 5 => 4, 8 => 7] as $configuredLimit => $remainingQueueAttempts) {
            config(['operations.account_deletion_retry_max_attempts' => $configuredLimit]);
            $job = new RetryAccountDeletionPurge(123, processingAttemptsAtDispatch: 1);

            $this->assertSame($remainingQueueAttempts, $job->tries());
            $this->assertGreaterThanOrEqual(7200, $job->uniqueFor());
        }
    }

    public function test_limits_two_five_and_above_five_all_end_in_a_terminal_state(): void
    {
        $admin = User::factory()->admin()->create();

        foreach ([2, 5, 8] as $configuredLimit) {
            config(['operations.account_deletion_retry_max_attempts' => $configuredLimit]);
            $request = $this->failedRequest(
                $admin,
                attempts: $configuredLimit,
                updatedAt: now()->subDay(),
            );
            $job = new RetryAccountDeletionPurge(
                $request->id,
                processingAttemptsAtDispatch: $configuredLimit,
            );

            $job->handle(app(AccountDeletionService::class));
            $job->handle(app(AccountDeletionService::class));

            $request->refresh();
            $this->assertSame('failed', $request->status);
            $this->assertSame('storage_cleanup_exhausted', $request->failure_code);
            $this->assertSame($configuredLimit, $request->processing_attempts);
        }
    }

    public function test_two_dispatchers_rely_on_the_unique_lock_and_queue_once(): void
    {
        Queue::fake();
        config(['operations.account_deletion_unique_lock_store' => 'array']);
        $admin = User::factory()->admin()->create();
        $request = $this->failedRequest($admin, attempts: 1, updatedAt: now()->subMinutes(10));

        $this->artisan('yazoo:dispatch-account-deletion-retries')->assertSuccessful();
        $this->artisan('yazoo:dispatch-account-deletion-retries')->assertSuccessful();

        Queue::assertPushed(
            RetryAccountDeletionPurge::class,
            fn (RetryAccountDeletionPurge $job): bool => $job->deletionRequestId === $request->id,
        );
        Queue::assertPushed(RetryAccountDeletionPurge::class, 1);
    }

    public function test_retry_job_completes_a_persisted_purge_manifest(): void
    {
        Storage::fake('public');
        Storage::fake('private');
        Storage::disk('public')->put('avatars/queued-retry.jpg', 'avatar');
        Storage::disk('private')->put('professional-verifications/queued-retry.pdf', 'document');

        $admin = User::factory()->admin()->create();
        $request = $this->failedRequest($admin, attempts: 1, updatedAt: now()->subMinutes(10), manifest: [
            'private' => ['professional-verifications/queued-retry.pdf'],
            'public' => ['avatars/queued-retry.jpg'],
        ]);

        (new RetryAccountDeletionPurge($request->id))->handle(app(AccountDeletionService::class));

        $request->refresh();
        $this->assertSame('completed', $request->status);
        $this->assertSame(2, $request->processing_attempts);
        $this->assertNotNull($request->purge_completed_at);
        Storage::disk('public')->assertMissing('avatars/queued-retry.jpg');
        Storage::disk('private')->assertMissing('professional-verifications/queued-retry.pdf');
    }

    public function test_retry_job_recovers_a_stale_pre_anonymization_crash(): void
    {
        Storage::fake('public');
        Storage::fake('private');
        $admin = User::factory()->admin()->create();
        $request = $this->processingRequest($admin, attempts: 1, stale: true);

        (new RetryAccountDeletionPurge($request->id, 1))->handle(app(AccountDeletionService::class));

        $request->refresh();
        $this->assertSame('completed', $request->status);
        $this->assertSame(2, $request->processing_attempts);
        $this->assertNotNull($request->database_anonymized_at);
        $this->assertNotNull($request->purge_completed_at);
    }

    public function test_retry_without_an_admin_reviewer_requires_manual_review(): void
    {
        Log::spy();
        $reviewer = User::factory()->create();
        $request = $this->failedRequest($reviewer, attempts: 1, updatedAt: now()->subMinutes(10));

        (new RetryAccountDeletionPurge($request->id))->handle(app(AccountDeletionService::class));

        $this->assertSame('retry_reviewer_unavailable', $request->fresh()->failure_code);
        Log::shouldHaveReceived('critical')->once();
    }

    public function test_exhausted_queue_retries_are_terminal_and_alerted(): void
    {
        Log::spy();
        $admin = User::factory()->admin()->create();
        $request = $this->failedRequest($admin, attempts: 5, updatedAt: now()->subDay());
        $job = new RetryAccountDeletionPurge($request->id, 5);

        $this->assertSame([60, 300, 900, 3600], $job->backoff());
        $this->assertSame('account-deletion-purge:'.$request->id, $job->uniqueId());

        $job->failed(new RuntimeException('test failure'));

        $this->assertSame('storage_cleanup_exhausted', $request->fresh()->failure_code);
        Log::shouldHaveReceived('critical')->once();
    }

    public function test_processing_attempt_exhaustion_is_terminal_and_never_dispatched_again(): void
    {
        Queue::fake();
        Log::spy();
        config(['operations.account_deletion_retry_max_attempts' => 2]);
        $admin = User::factory()->admin()->create();
        $before = $this->processingRequest($admin, attempts: 2, stale: true);
        $after = $this->failedRequest($admin, attempts: 2, updatedAt: now()->subDay());

        $this->artisan('yazoo:dispatch-account-deletion-retries')
            ->expectsOutput('Account deletion purge retries queued=0.')
            ->expectsOutput('Account deletion recoveries exhausted=2.')
            ->assertSuccessful();
        $this->artisan('yazoo:dispatch-account-deletion-retries')->assertSuccessful();

        $this->assertSame('processing_recovery_exhausted', $before->fresh()->failure_code);
        $this->assertSame('storage_cleanup_exhausted', $after->fresh()->failure_code);
        Queue::assertNothingPushed();
        Log::shouldHaveReceived('critical')->twice();
    }

    /**
     * @param  array{private: array<int, string>, public: array<int, string>}|null  $manifest
     */
    private function failedRequest(
        User $reviewer,
        int $attempts,
        \DateTimeInterface $updatedAt,
        ?array $manifest = null,
    ): DataDeletionRequest {
        $user = User::factory()->create([
            'email' => 'deleted.'.fake()->unique()->numerify('########').'@deleted.invalid',
            'is_suspended' => true,
            'banned_at' => now(),
        ]);
        $request = DataDeletionRequest::query()->create([
            'user_id' => $user->id,
            'status' => 'failed',
            'processing_attempts' => $attempts,
            'failure_code' => 'storage_cleanup_failed',
            'database_anonymized_at' => now()->subHour(),
            'purge_manifest' => $manifest ?? ['private' => [], 'public' => []],
            'reviewed_by' => $reviewer->id,
            'reviewed_at' => now()->subHour(),
        ]);
        $request->forceFill(['updated_at' => $updatedAt])->saveQuietly();

        return $request->fresh();
    }

    private function processingRequest(
        User $reviewer,
        int $attempts,
        bool $stale,
        bool $anonymized = false,
    ): DataDeletionRequest {
        $user = User::factory()->create();

        return DataDeletionRequest::query()->create([
            'user_id' => $user->id,
            'status' => 'processing',
            'processing_attempts' => $attempts,
            'processing_started_at' => $stale ? now()->subHour() : now(),
            'database_anonymized_at' => $anonymized ? now()->subHour() : null,
            'purge_manifest' => $anonymized ? ['private' => [], 'public' => []] : null,
            'reviewed_by' => $reviewer->id,
            'reviewed_at' => now()->subHour(),
        ]);
    }
}
