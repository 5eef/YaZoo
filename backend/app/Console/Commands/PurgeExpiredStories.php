<?php

namespace App\Console\Commands;

use App\Models\MediaAsset;
use App\Models\Story;
use App\Services\StoryService;
use App\Support\MediaStorage;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;
use RuntimeException;
use Throwable;

class PurgeExpiredStories extends Command
{
    protected $signature = 'yazoo:purge-expired-stories {--limit=200 : Maximum stories per run} {--dry-run : Count without deleting}';

    protected $description = 'Remove expired stories and their attached media using the existing deletion lifecycle.';

    public function handle(StoryService $stories): int
    {
        $limit = filter_var($this->option('limit'), FILTER_VALIDATE_INT);
        if ($limit === false || $limit < 1 || $limit > 1000) {
            $this->error('Limit must be between 1 and 1000.');

            return self::INVALID;
        }
        $expired = Story::query()->where('expires_at', '<=', now())->orderBy('id')->limit($limit)->get();
        if ($this->option('dry-run')) {
            $this->info('Expired stories selected: '.$expired->count());

            return self::SUCCESS;
        }
        $failed = false;
        foreach ($expired as $story) {
            try {
                // Expired stories are already unreadable. Keep retryable relational
                // references until storage confirms removal of unshared objects.
                foreach ($story->mediaAssets as $asset) {
                    if (MediaAsset::query()->where('disk', $asset->disk)->where('path', $asset->path)->whereKeyNot($asset->id)->exists()) {
                        continue;
                    }
                    if ($asset->disk === 'mongodb' || $asset->disk === config('media.filesystem_disk', 'public')) {
                        MediaStorage::deleteStoredFilesOrFail([$asset->path]);
                    } elseif (Storage::disk($asset->disk)->exists($asset->path) && ! Storage::disk($asset->disk)->delete($asset->path)) {
                        throw new RuntimeException('Expired story media removal failed.');
                    }
                }
                if ($story->mediaAssets->isEmpty()
                    && ! MediaAsset::query()->where('path', $story->media_path)->exists()
                    && ! Story::query()->where('media_path', $story->media_path)->whereKeyNot($story->id)->exists()) {
                    MediaStorage::deleteStoredFilesOrFail([$story->media_path]);
                }
                $stories->delete($story);
            } catch (Throwable $exception) {
                report($exception);
                $failed = true;
                $this->error('Story cleanup failed: '.$story->getKey());
            }
        }

        return $failed ? self::FAILURE : self::SUCCESS;
    }
}
