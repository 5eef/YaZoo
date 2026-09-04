<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Redis;
use Throwable;

class HealthController extends Controller
{
    public function live(): JsonResponse
    {
        return response()->json([
            'status' => 'ok',
            'service' => 'yazoo-api',
            'version' => config('app.version'),
        ]);
    }

    public function ready(): JsonResponse
    {
        $checks = [
            'database' => $this->checkDatabase(),
            'redis' => $this->checkRedis(),
            'queue' => $this->checkHeartbeat(
                'operations:queue-heartbeat',
                config('queue.default') !== 'sync',
            ),
            'scheduler' => $this->checkHeartbeat(
                'operations:scheduler-heartbeat',
                (bool) config('operations.require_scheduler_heartbeat'),
            ),
            'persistentStorage' => $this->checkPersistentStorage(),
            'reverb' => $this->checkReverb(),
        ];

        $ready = collect($checks)->every(fn (array $check): bool => $check['ok']);

        return response()->json([
            'status' => $ready ? 'ok' : 'degraded',
            'service' => 'yazoo-api',
            'version' => config('app.version'),
            'checks' => $checks,
        ], $ready ? 200 : 503);
    }

    private function checkDatabase(): array
    {
        try {
            DB::select('select 1');

            return ['ok' => true];
        } catch (Throwable) {
            return [
                'ok' => false,
                'error' => 'database_unavailable',
            ];
        }
    }

    private function checkRedis(): array
    {
        if (! $this->usesRedis()) {
            return ['ok' => true, 'skipped' => true];
        }

        try {
            Redis::connection()->ping();

            return ['ok' => true];
        } catch (Throwable) {
            return [
                'ok' => false,
                'error' => 'redis_unavailable',
            ];
        }
    }

    private function usesRedis(): bool
    {
        return collect([
            config('cache.default'),
            config('queue.default'),
            config('session.driver'),
        ])->contains('redis');
    }

    private function checkHeartbeat(string $key, bool $required): array
    {
        if (! $required) {
            return ['ok' => true, 'skipped' => true];
        }

        $heartbeat = Cache::get($key);

        return $heartbeat
            ? ['ok' => true, 'lastHeartbeatAt' => $heartbeat]
            : ['ok' => false, 'error' => 'heartbeat_missing'];
    }

    private function checkPersistentStorage(): array
    {
        if (! (bool) config('operations.require_persistent_storage')) {
            return ['ok' => true, 'skipped' => true];
        }

        $path = rtrim((string) config('operations.persistent_storage_path'), '/\\');
        $public = $path.DIRECTORY_SEPARATOR.'app'.DIRECTORY_SEPARATOR.'public';
        $private = $path.DIRECTORY_SEPARATOR.'app'.DIRECTORY_SEPARATOR.'private';
        $ok = is_dir($public)
            && is_readable($public)
            && is_writable($public)
            && is_dir($private)
            && is_readable($private)
            && is_writable($private);

        return $ok
            ? ['ok' => true]
            : ['ok' => false, 'error' => 'persistent_storage_unavailable'];
    }

    private function checkReverb(): array
    {
        if (! (bool) config('operations.require_reverb_health')) {
            return ['ok' => true, 'skipped' => true];
        }

        $host = (string) config('reverb.apps.apps.0.options.host');
        $port = (int) config('reverb.apps.apps.0.options.port');
        if ($host === '' || $port <= 0) {
            return ['ok' => false, 'error' => 'reverb_configuration_incomplete'];
        }

        try {
            $socket = @fsockopen($host, $port, $errorCode, $errorMessage, 1.0);
            if (! is_resource($socket)) {
                return ['ok' => false, 'error' => 'reverb_unavailable'];
            }
            fclose($socket);

            return ['ok' => true];
        } catch (Throwable) {
            return ['ok' => false, 'error' => 'reverb_unavailable'];
        }
    }
}
