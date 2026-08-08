<?php

namespace App\Jobs;

use App\Models\MediaAsset;
use App\Services\Media\MediaQuarantineService;
use Illuminate\Contracts\Cache\Repository;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Throwable;

final class ScanQuarantinedMedia implements ShouldBeUnique, ShouldQueue
{
    use Queueable;

    public int $timeout;

    public bool $failOnTimeout = true;

    public function __construct(public readonly string $mediaAssetId)
    {
        $this->timeout = max(5, min(120, (int) config('media.scanning.timeout_seconds', 30)));
    }

    public function tries(): int
    {
        return max(1, min(10, (int) config('media.scanning.max_attempts', 3)));
    }

    /** @return array<int, int> */
    public function backoff(): array
    {
        return [60, 300, 900];
    }

    public function uniqueId(): string
    {
        return 'media-scan:'.$this->mediaAssetId;
    }

    public function uniqueVia(): Repository
    {
        return Cache::store((string) config(
            'media.scanning.unique_lock_store',
            config('cache.default'),
        ));
    }

    public function handle(MediaQuarantineService $quarantine): void
    {
        $asset = MediaAsset::query()->find($this->mediaAssetId);

        if (! $asset || in_array($asset->state, [MediaAsset::STATE_CLEAN, MediaAsset::STATE_INFECTED, MediaAsset::STATE_ACTIVE], true)) {
            return;
        }

        $asset = $quarantine->scan($asset);

        if ($asset->state === MediaAsset::STATE_SCAN_FAILED) {
            throw new \RuntimeException('Media scanning failed closed.');
        }
    }

    public function failed(?Throwable $exception): void
    {
        MediaAsset::query()
            ->whereKey($this->mediaAssetId)
            ->whereIn('state', [MediaAsset::STATE_PENDING, MediaAsset::STATE_SCANNING, MediaAsset::STATE_SCAN_FAILED])
            ->update(['state' => MediaAsset::STATE_SCAN_FAILED, 'updated_at' => now()]);

        Log::critical('Media scan retries exhausted; asset remains quarantined.', [
            'media_asset_id' => $this->mediaAssetId,
            'exception' => $exception !== null ? $exception::class : null,
        ]);
    }
}
