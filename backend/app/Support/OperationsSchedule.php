<?php

namespace App\Support;

use App\Jobs\QueueHeartbeat;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Support\Facades\Cache;

class OperationsSchedule
{
    public static function register(Schedule $schedule): void
    {
        if (config('operations.deployment_profile') === 'showcase'
            && config('operations.showcase_bootstrap_enabled')) {
            $schedule->command('yazoo:refresh-showcase-availability')
                ->dailyAt('04:45')
                ->timezone('Africa/Casablanca')
                ->name('showcase:refresh-availability')
                ->withoutOverlapping(30)
                ->onOneServer();
        }

        $schedule
            ->call(fn () => Cache::put(
                'operations:scheduler-heartbeat',
                now()->toISOString(),
                max(60, (int) config('operations.scheduler_heartbeat_ttl_seconds', 180)),
            ))
            ->everyMinute()
            ->name('operations:scheduler-heartbeat')
            ->withoutOverlapping()
            ->onOneServer();

        if (config('queue.default') !== 'sync') {
            $schedule
                ->job(new QueueHeartbeat)
                ->everyMinute()
                ->name('operations:queue-heartbeat-dispatch')
                ->withoutOverlapping()
                ->onOneServer();
        }

        $schedule
            ->command('sanctum:prune-expired --hours=0')
            ->daily()
            ->withoutOverlapping()
            ->onOneServer();

        $schedule
            ->command('yazoo:purge-professional-documents')
            ->dailyAt('04:15')
            ->name('retention:purge-professional-documents')
            ->withoutOverlapping()
            ->onOneServer();

        if (config('queue.default') !== 'sync') {
            $schedule
                ->command('yazoo:dispatch-account-deletion-retries')
                ->everyFiveMinutes()
                ->name('privacy:dispatch-account-deletion-retries')
                ->withoutOverlapping()
                ->onOneServer();
        }

        if (! (bool) config('media.backup.enabled', false)) {
            return;
        }

        $schedule
            ->command('yazoo:backup-media --keep='.(int) config('media.backup.keep_days', 7))
            ->dailyAt((string) config('media.backup.schedule', '03:30'))
            ->withoutOverlapping()
            ->onOneServer();
    }
}
