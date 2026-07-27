<?php

namespace App\Jobs;

use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Cache;

class QueueHeartbeat implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    public function handle(): void
    {
        Cache::put(
            'operations:queue-heartbeat',
            now()->toISOString(),
            max(60, (int) config('operations.queue_heartbeat_ttl_seconds', 180)),
        );
    }
}
