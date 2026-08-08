<?php

namespace App\Jobs;

use App\Models\DataDeletionRequest;
use App\Services\Privacy\AccountDeletionService;
use App\Support\AccountDeletionRetryPolicy;
use Illuminate\Contracts\Cache\Repository;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use RuntimeException;
use Throwable;

class RetryAccountDeletionPurge implements ShouldBeUnique, ShouldQueue
{
    use Queueable;

    public int $timeout = 120;

    public bool $failOnTimeout = true;

    public function __construct(
        public readonly int $deletionRequestId,
        public readonly int $processingAttemptsAtDispatch = 1,
    ) {}

    public function tries(): int
    {
        return max(
            1,
            AccountDeletionRetryPolicy::remainingProcessingAttempts($this->processingAttemptsAtDispatch),
        );
    }

    public function uniqueFor(): int
    {
        return max(
            7200,
            ($this->tries() * 3600) + $this->timeout + AccountDeletionRetryPolicy::processingLeaseSeconds(),
        );
    }

    /**
     * @return array<int, int>
     */
    public function backoff(): array
    {
        return [60, 300, 900, 3600];
    }

    public function uniqueId(): string
    {
        return 'account-deletion-purge:'.$this->deletionRequestId;
    }

    public function uniqueVia(): Repository
    {
        return Cache::store((string) config(
            'operations.account_deletion_unique_lock_store',
            config('cache.default'),
        ));
    }

    public function handle(AccountDeletionService $accountDeletion): void
    {
        $deletionRequest = DataDeletionRequest::query()
            ->with('reviewer')
            ->find($this->deletionRequestId);

        if (! $deletionRequest || ! AccountDeletionRetryPolicy::isAutomaticallyRecoverable($deletionRequest)) {
            return;
        }

        if ($deletionRequest->processing_attempts >= AccountDeletionRetryPolicy::maxProcessingAttempts()) {
            $this->markExhausted($deletionRequest);

            return;
        }

        $reviewer = $deletionRequest->reviewer;

        if (! $reviewer || ! $reviewer->is_admin) {
            $deletionRequest->forceFill([
                'failure_code' => 'retry_reviewer_unavailable',
            ])->save();
            Log::critical('Automated account deletion retry requires manual review.', [
                'deletion_request_id' => $deletionRequest->id,
            ]);

            return;
        }

        Log::info('Automated account deletion purge retry started.', [
            'deletion_request_id' => $deletionRequest->id,
            'processing_attempt' => $deletionRequest->processing_attempts + 1,
        ]);

        try {
            $processed = $accountDeletion->process($deletionRequest, $reviewer);
        } catch (Throwable $exception) {
            Log::warning('Automated account deletion purge retry failed.', [
                'deletion_request_id' => $deletionRequest->id,
                'exception' => $exception::class,
            ]);

            throw $exception;
        }

        if ($processed->status !== 'completed') {
            throw new RuntimeException('Account deletion retry did not reach a terminal state.');
        }

        Log::info('Automated account deletion purge retry completed.', [
            'deletion_request_id' => $deletionRequest->id,
        ]);
    }

    public function failed(?Throwable $exception): void
    {
        $deletionRequest = DataDeletionRequest::query()->find($this->deletionRequestId);

        if ($deletionRequest && $deletionRequest->processing_attempts >= AccountDeletionRetryPolicy::maxProcessingAttempts()) {
            $this->markExhausted($deletionRequest);

            return;
        }

        Log::error('Account deletion queue job exhausted before the processing-attempt budget.', [
            'deletion_request_id' => $this->deletionRequestId,
            'exception' => $exception !== null ? $exception::class : null,
        ]);
    }

    private function markExhausted(DataDeletionRequest $deletionRequest): void
    {
        if (! AccountDeletionRetryPolicy::isAutomaticallyRecoverable($deletionRequest)) {
            return;
        }

        $failureCode = AccountDeletionRetryPolicy::exhaustedFailureCode($deletionRequest);
        $updated = DataDeletionRequest::query()
            ->whereKey($deletionRequest->id)
            ->where('status', '!=', 'completed')
            ->where(function ($query): void {
                $query
                    ->whereNull('failure_code')
                    ->orWhereNotIn('failure_code', [
                        'storage_cleanup_exhausted',
                        'processing_recovery_exhausted',
                        'retry_reviewer_unavailable',
                    ]);
            })
            ->update([
                'status' => 'failed',
                'failure_code' => $failureCode,
                'processing_started_at' => null,
                'updated_at' => now(),
            ]);

        if ($updated > 0) {
            Log::critical('Automated account deletion processing attempts exhausted.', [
                'deletion_request_id' => $deletionRequest->id,
                'failure_code' => $failureCode,
                'processing_attempts' => $deletionRequest->processing_attempts,
            ]);
        }
    }
}
