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

        $this->artisan('yazoo:dispatch-account-deletion-retries')
            ->expectsOutput('Account deletion purge retries queued=1.')
            ->assertSuccessful();

        Queue::assertPushed(
            RetryAccountDeletionPurge::class,
            fn (RetryAccountDeletionPurge $job): bool => $job->deletionRequestId === $due->id,
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
        $request = $this->failedRequest($admin, attempts: 4, updatedAt: now()->subDay());
        $job = new RetryAccountDeletionPurge($request->id);

        $this->assertSame([60, 300, 900, 3600], $job->backoff());
        $this->assertSame('account-deletion-purge:'.$request->id, $job->uniqueId());

        $job->failed(new RuntimeException('test failure'));

        $this->assertSame('storage_cleanup_exhausted', $request->fresh()->failure_code);
        Log::shouldHaveReceived('critical')->once();
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
}
