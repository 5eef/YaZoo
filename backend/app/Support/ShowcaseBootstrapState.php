<?php

namespace App\Support;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

final class ShowcaseBootstrapState
{
    public const KEY = 'yazoo_showcase_bootstrap_v2';

    public function isComplete(): bool
    {
        return $this->hasDurableMarker()
            || Cache::store('database')->get(self::KEY) === 'complete';
    }

    // Call only after the bootstrap target guard, before clearing legacy cache.
    public function preserveCompleted(): bool
    {
        if ($this->hasDurableMarker()) {
            return true;
        }

        if (Cache::store('database')->get(self::KEY) !== 'complete') {
            return false;
        }

        $this->recordCompletion('legacy-cache-v2');

        return true;
    }

    public function recordCompletion(string $source = 'bootstrap'): void
    {
        DB::table('operation_markers')->insertOrIgnore([
            'key' => self::KEY,
            'completed_at' => now(),
            'metadata' => json_encode(['source' => $source], JSON_THROW_ON_ERROR),
        ]);

        // Compatibility mirror for older readers; never the only durable proof.
        Cache::store('database')->forever(self::KEY, 'complete');
    }

    private function hasDurableMarker(): bool
    {
        return DB::table('operation_markers')
            ->where('key', self::KEY)
            ->whereNotNull('completed_at')
            ->exists();
    }
}
