<?php

namespace App\Jobs;

use App\Models\DataDeletionRequest;
use App\Services\Privacy\AccountDeletionService;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;
use RuntimeException;
use Throwable;

class RetryAccountDeletionPurge implements ShouldBeUnique, ShouldQueue
{
    use Queueable;

    public int $tries = 4;

    public int $timeout = 120;

    public bool $failOnTimeout = true;

    public int $uniqueFor = 7200;

    public function __construct(public readonly int $deletionRequestId)
    {
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

    public function handle(AccountDeletionService $accountDeletion): void
    {
        $deletionRequest = DataDeletionRequest::query()
            ->with('reviewer')
            ->find($this->deletionRequestId);

        if (
            ! $deletionRequest
            || $deletionRequest->status === 'completed'
            || $deletionRequest->failure_code !== 'storage_cleanup_failed'
        ) {
            return;
        }

        if ($deletionRequest->processing_attempts >= $this->maxProcessingAttempts()) {
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
        DataDeletionRequest::query()
            ->whereKey($this->deletionRequestId)
            ->where('status', 'failed')
            ->where('failure_code', 'storage_cleanup_failed')
            ->update([
                'failure_code' => 'storage_cleanup_exhausted',
                'updated_at' => now(),
            ]);

        Log::critical('Automated account deletion purge retries exhausted.', [
            'deletion_request_id' => $this->deletionRequestId,
            'exception' => $exception !== null ? $exception::class : null,
        ]);
    }

    private function maxProcessingAttempts(): int
    {
        return max(2, (int) config('operations.account_deletion_retry_max_attempts', 5));
    }
}
