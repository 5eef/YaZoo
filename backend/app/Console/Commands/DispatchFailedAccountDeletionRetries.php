<?php

namespace App\Console\Commands;

use App\Jobs\RetryAccountDeletionPurge;
use App\Models\DataDeletionRequest;
use App\Support\AccountDeletionRetryPolicy;
use Illuminate\Console\Command;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class DispatchFailedAccountDeletionRetries extends Command
{
    protected $signature = 'yazoo:dispatch-account-deletion-retries {--limit= : Maximum requests to queue}';

    protected $description = 'Queue bounded recovery for failed purges and expired account-deletion processing leases.';

    public function handle(): int
    {
        $configuredLimit = max(1, (int) config('operations.account_deletion_retry_batch_size', 25));
        $limit = min(max(1, (int) ($this->option('limit') ?: $configuredLimit)), 100);
        $queued = 0;
        $exhausted = 0;

        DataDeletionRequest::query()
            ->where(function (Builder $query): void {
                $query
                    ->where(function (Builder $failed): void {
                        $failed
                            ->where('status', 'failed')
                            ->where('failure_code', 'storage_cleanup_failed')
                            ->whereNotNull('database_anonymized_at')
                            ->whereNotNull('purge_manifest');
                    })
                    ->orWhere(function (Builder $processing): void {
                        $processing
                            ->where('status', 'processing')
                            ->whereNotNull('processing_started_at')
                            ->where(
                                'processing_started_at',
                                '<=',
                                now()->subSeconds(AccountDeletionRetryPolicy::processingLeaseSeconds()),
                            );
                    });
            })
            ->oldest('updated_at')
            ->limit($limit * 4)
            ->get()
            ->filter(fn (DataDeletionRequest $request): bool => $this->retryIsDue($request))
            ->take($limit)
            ->each(function (DataDeletionRequest $request) use (&$exhausted, &$queued): void {
                $candidate = DB::transaction(function () use ($request): ?array {
                    $locked = DataDeletionRequest::query()->lockForUpdate()->find($request->id);

                    if (! $locked || ! AccountDeletionRetryPolicy::isAutomaticallyRecoverable($locked)) {
                        return null;
                    }

                    if ($locked->processing_attempts >= AccountDeletionRetryPolicy::maxProcessingAttempts()) {
                        $failureCode = AccountDeletionRetryPolicy::exhaustedFailureCode($locked);
                        $locked->forceFill([
                            'status' => 'failed',
                            'failure_code' => $failureCode,
                            'processing_started_at' => null,
                        ])->save();

                        return ['exhausted' => true, 'failure_code' => $failureCode];
                    }

                    return [
                        'exhausted' => false,
                        'processing_attempts' => (int) $locked->processing_attempts,
                    ];
                });

                if ($candidate === null) {
                    return;
                }

                if ($candidate['exhausted']) {
                    $exhausted++;
                    Log::critical('Account deletion recovery reached its configured processing-attempt limit.', [
                        'deletion_request_id' => $request->id,
                        'failure_code' => $candidate['failure_code'],
                        'processing_attempts' => $request->processing_attempts,
                    ]);

                    return;
                }

                RetryAccountDeletionPurge::dispatch(
                    $request->id,
                    $candidate['processing_attempts'],
                );
                $queued++;
            });

        $this->info("Account deletion purge retries queued={$queued}.");
        $this->info("Account deletion recoveries exhausted={$exhausted}.");

        return self::SUCCESS;
    }

    private function retryIsDue(DataDeletionRequest $request): bool
    {
        if (AccountDeletionRetryPolicy::hasExpiredProcessingLease($request)) {
            return true;
        }

        $delaySeconds = match ((int) $request->processing_attempts) {
            0, 1 => 60,
            2 => 300,
            3 => 900,
            default => 3600,
        };

        return $request->updated_at?->lte(now()->subSeconds($delaySeconds)) ?? false;
    }
}
