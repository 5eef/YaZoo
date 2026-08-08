<?php

namespace App\Support;

use App\Models\DataDeletionRequest;

final class AccountDeletionRetryPolicy
{
    public const MIN_PROCESSING_ATTEMPTS = 2;

    public const MAX_PROCESSING_ATTEMPTS = 50;

    /**
     * The initial administrator-triggered processing attempt is included.
     */
    public static function maxProcessingAttempts(): int
    {
        return min(
            self::MAX_PROCESSING_ATTEMPTS,
            max(
                self::MIN_PROCESSING_ATTEMPTS,
                (int) config('operations.account_deletion_retry_max_attempts', 5),
            ),
        );
    }

    public static function remainingProcessingAttempts(int $attemptsAlreadyStarted): int
    {
        return max(0, self::maxProcessingAttempts() - max(0, $attemptsAlreadyStarted));
    }

    public static function processingLeaseSeconds(): int
    {
        return max(60, (int) config('operations.account_deletion_processing_lease_seconds', 900));
    }

    public static function hasExpiredProcessingLease(DataDeletionRequest $request): bool
    {
        return $request->status === 'processing'
            && $request->processing_started_at !== null
            && $request->processing_started_at->lte(now()->subSeconds(self::processingLeaseSeconds()));
    }

    public static function isTerminal(DataDeletionRequest $request): bool
    {
        return in_array($request->failure_code, [
            'storage_cleanup_exhausted',
            'processing_recovery_exhausted',
            'retry_reviewer_unavailable',
        ], true);
    }

    public static function isAutomaticallyRecoverable(DataDeletionRequest $request): bool
    {
        if ($request->status === 'completed' || self::isTerminal($request)) {
            return false;
        }

        return ($request->status === 'failed' && $request->failure_code === 'storage_cleanup_failed')
            || self::hasExpiredProcessingLease($request);
    }

    public static function exhaustedFailureCode(DataDeletionRequest $request): string
    {
        return $request->database_anonymized_at !== null
            ? 'storage_cleanup_exhausted'
            : 'processing_recovery_exhausted';
    }
}
