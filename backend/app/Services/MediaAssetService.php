<?php

namespace App\Services;

use App\Models\MediaAsset;
use App\Models\User;
use App\Services\Media\MediaQuarantineService;
use App\Support\MediaStorage;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Throwable;

class MediaAssetService
{
    public function registerPostUpload(User $owner, UploadedFile $file, string $kind): MediaAsset
    {
        if ($this->requiresScan()) {
            return $this->scannedUpload($owner, $file, 'feed/posts', $kind, MediaAsset::VISIBILITY_PRIVATE);
        }
        if (in_array(config('media.driver'), ['mongodb', 'r2'], true)) {
            return $this->registerUpload($owner, $file, 'feed/posts', $kind, MediaAsset::VISIBILITY_PRIVATE);
        }

        $path = $file->store('feed/posts', 'private');
        if (! is_string($path) || $path === '') {
            throw new \RuntimeException('Post media storage failed.');
        }
        try {
            return $this->registerStoredPath($owner, $path, $kind, MediaAsset::VISIBILITY_PRIVATE, (string) $file->getMimeType(), $file->getSize() ?: null, $file->getClientOriginalName(), 'private');
        } catch (Throwable $exception) {
            Storage::disk('private')->delete($path);

            throw $exception;
        }
    }

    public function registerUpload(
        User $owner,
        UploadedFile $file,
        string $directory,
        string $kind,
        string $visibility = MediaAsset::VISIBILITY_PUBLIC,
    ): MediaAsset {
        if ($this->requiresScan()) {
            return $this->scannedUpload($owner, $file, $directory, $kind, $visibility);
        }
        $path = MediaStorage::storeUploadedFile($file, $directory);

        try {
            return $this->registerStoredPath(
                $owner,
                $path,
                $kind,
                $visibility,
                (string) $file->getMimeType(),
                $file->getSize() ?: null,
                $file->getClientOriginalName(),
            );
        } catch (Throwable $exception) {
            MediaStorage::deleteStoredFiles([$path]);

            throw $exception;
        }
    }

    public function requiresScan(): bool
    {
        return (bool) config('media.scanning.enabled')
            || config('media.scanning.driver') === 'verified_demo_manifest'
            || config('operations.deployment_profile') === 'production';
    }

    private function scannedUpload(User $owner, UploadedFile $file, string $directory, string $kind, string $visibility): MediaAsset
    {
        if (config('media.scanning.driver') === 'verified_demo_manifest') {
            abort_unless(in_array((int) $owner->id, (array) config('media.scanning.demo_allowed_user_ids', []), true), 403, 'This account is not authorized for pre-scanned demo uploads.');
        }
        $service = app(MediaQuarantineService::class);
        $asset = $service->quarantine($owner, $file, $directory, $kind, $visibility, dispatchScan: false);
        $asset = $service->scan($asset);
        if ($asset->state !== MediaAsset::STATE_CLEAN) {
            abort(503, 'Media scanning did not authorize publication.');
        }

        return $asset;
    }

    public function registerStoredPath(
        User $owner,
        string $path,
        string $kind,
        string $visibility = MediaAsset::VISIBILITY_PUBLIC,
        ?string $mimeType = null,
        ?int $size = null,
        ?string $originalName = null,
        ?string $diskName = null,
    ): MediaAsset {
        $disk = $diskName ?? (MediaStorage::isMongoReference($path)
            ? 'mongodb'
            : (str_starts_with($path, 'media/') && config('media.driver') === 'r2' ? 'r2' : (string) config('media.filesystem_disk', 'public')));

        return $owner->ownedMediaAssets()->firstOrCreate(
            ['disk' => $disk, 'path_hash' => hash('sha256', $path)],
            [
                'path' => $path,
                'kind' => $kind,
                'state' => MediaAsset::STATE_ACTIVE,
                'visibility' => $visibility,
                'mime_type' => $mimeType,
                'size' => $size,
                'original_name' => $originalName,
            ],
        );
    }

    public function ownedReference(User $owner, ?string $assetId, ?Model $current = null): ?MediaAsset
    {
        if (! $assetId) {
            return null;
        }

        $asset = MediaAsset::query()
            ->whereKey($assetId)
            ->where('owner_id', $owner->id)
            ->whereIn('state', [MediaAsset::STATE_ACTIVE, MediaAsset::STATE_CLEAN])
            ->first();

        if (! $asset || ($asset->attachable_id !== null && ! $this->isAttachedTo($asset, $current))) {
            throw ValidationException::withMessages([
                'media_asset_ids' => [__('validation.exists', ['attribute' => 'media asset'])],
            ]);
        }

        return $asset;
    }

    /**
     * @param  array<int, string>  $assetIds
     * @return Collection<int, MediaAsset>
     */
    public function ownedReferences(User $owner, array $assetIds, ?Model $current = null): Collection
    {
        return collect($assetIds)
            ->filter()
            ->unique()
            ->map(fn (string $assetId): MediaAsset => $this->ownedReference($owner, $assetId, $current));
    }

    public function attach(MediaAsset $asset, Model $model, string $role, int $position = 0): void
    {
        $asset->forceFill([
            'attachable_type' => $model->getMorphClass(),
            'attachable_id' => $model->getKey(),
            'role' => $role,
            'position' => $position,
        ])->save();
    }

    public function replaceRole(Model $model, User $owner, string $role, ?MediaAsset $replacement): void
    {
        $current = MediaAsset::query()
            ->where('attachable_type', $model->getMorphClass())
            ->where('attachable_id', $model->getKey())
            ->where('role', $role)
            ->get();

        if ($replacement) {
            abort_unless((int) $replacement->owner_id === (int) $owner->id, 403);
            $this->attach($replacement, $model, $role);
        }

        foreach ($current->where('id', '!=', $replacement?->id) as $asset) {
            $this->deleteOwnedAsset($asset, $owner, $model);
        }
    }

    /** @param Collection<int, MediaAsset> $desired */
    public function sync(Model $model, User $owner, Collection $desired, string $mainRole): void
    {
        DB::transaction(function () use ($model, $owner, $desired, $mainRole): void {
            $desiredIds = $desired->pluck('id');
            $current = MediaAsset::query()
                ->where('attachable_type', $model->getMorphClass())
                ->where('attachable_id', $model->getKey())
                ->lockForUpdate()
                ->get();

            foreach ($desired->values() as $position => $asset) {
                abort_unless((int) $asset->owner_id === (int) $owner->id, 403);
                $this->attach($asset, $model, $position === 0 ? $mainRole : 'gallery', $position);
            }

            foreach ($current->whereNotIn('id', $desiredIds) as $asset) {
                $this->deleteOwnedAsset($asset, $owner, $model);
            }
        });
    }

    public function deleteAttached(Model $model, User $owner): void
    {
        MediaAsset::query()
            ->where('attachable_type', $model->getMorphClass())
            ->where('attachable_id', $model->getKey())
            ->get()
            ->each(fn (MediaAsset $asset) => $this->deleteOwnedAsset($asset, $owner, $model));
    }

    public function discardUnattached(MediaAsset $asset, User $owner): void
    {
        $asset = MediaAsset::query()->find($asset->getKey());

        if (! $asset || (int) $asset->owner_id !== (int) $owner->id || $asset->attachable_id !== null) {
            return;
        }

        $path = $asset->path;
        $asset->delete();
        $this->deletePhysicalFileAfterCommit($asset->disk, $path);
    }

    private function deleteOwnedAsset(MediaAsset $asset, User $owner, Model $model): void
    {
        abort_unless((int) $asset->owner_id === (int) $owner->id && $this->isAttachedTo($asset, $model), 403);

        $path = $asset->path;
        $asset->delete();
        $this->deletePhysicalFileAfterCommit($asset->disk, $path);
    }

    private function isAttachedTo(MediaAsset $asset, ?Model $model): bool
    {
        return $model !== null
            && $asset->attachable_type === $model->getMorphClass()
            && (string) $asset->attachable_id === (string) $model->getKey();
    }

    private function deletePhysicalFile(string $disk, string $path): void
    {
        if ($disk === 'mongodb' || $disk === (string) config('media.filesystem_disk', 'public')) {
            MediaStorage::deleteStoredFiles([$path]);

            return;
        }

        Storage::disk($disk)->delete($path);
    }

    private function deletePhysicalFileAfterCommit(string $disk, string $path): void
    {
        DB::afterCommit(function () use ($disk, $path): void {
            // A shared object must survive removal of one relational reference.
            if (! MediaAsset::query()->where('disk', $disk)->where('path', $path)->exists()) {
                $this->deletePhysicalFile($disk, $path);
            }
        });
    }
}
