<?php

namespace App\Console\Commands;

use App\Jobs\RetryAccountDeletionPurge;
use App\Models\DataDeletionRequest;
use Illuminate\Console\Command;

class DispatchFailedAccountDeletionRetries extends Command
{
    protected $signature = 'yazoo:dispatch-account-deletion-retries {--limit= : Maximum requests to queue}';

    protected $description = 'Queue bounded, idempotent retries for account deletions whose physical purge failed.';

    public function handle(): int
    {
        $configuredLimit = max(1, (int) config('operations.account_deletion_retry_batch_size', 25));
        $limit = min(max(1, (int) ($this->option('limit') ?: $configuredLimit)), 100);
        $maxAttempts = max(2, (int) config('operations.account_deletion_retry_max_attempts', 5));
        $queued = 0;

        DataDeletionRequest::query()
            ->where('status', 'failed')
            ->where('failure_code', 'storage_cleanup_failed')
            ->whereNotNull('database_anonymized_at')
            ->whereNotNull('purge_manifest')
            ->where('processing_attempts', '<', $maxAttempts)
            ->oldest('updated_at')
            ->limit($limit * 4)
            ->get()
            ->filter(fn (DataDeletionRequest $request): bool => $this->retryIsDue($request))
            ->take($limit)
            ->each(function (DataDeletionRequest $request) use (&$queued): void {
                RetryAccountDeletionPurge::dispatch($request->id);
                $queued++;
            });

        $this->info("Account deletion purge retries queued={$queued}.");

        return self::SUCCESS;
    }

    private function retryIsDue(DataDeletionRequest $request): bool
    {
        $delaySeconds = match ((int) $request->processing_attempts) {
            0, 1 => 60,
            2 => 300,
            3 => 900,
            default => 3600,
        };

        return $request->updated_at?->lte(now()->subSeconds($delaySeconds)) ?? false;
    }
}
