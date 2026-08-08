<?php

namespace App\Services\Media;

use App\Contracts\MediaScanner;
use App\Jobs\ScanQuarantinedMedia;
use App\Models\MediaAsset;
use App\Models\User;
use App\ValueObjects\MediaScanResult;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use RuntimeException;
use Throwable;

final class MediaQuarantineService
{
    public function __construct(private readonly MediaScanner $scanner) {}

    public function quarantine(
        User $owner,
        UploadedFile $file,
        string $directory,
        string $kind,
        string $visibility = MediaAsset::VISIBILITY_PUBLIC,
        bool $dispatchScan = true,
    ): MediaAsset {
        $this->validateUpload($file);
        $diskName = (string) config('media.scanning.quarantine_disk', 'private');
        $safeDirectory = trim(str_replace(['..', '\\'], ['', '/'], $directory), '/');
        $extension = strtolower($file->getClientOriginalExtension());
        $filename = (string) Str::uuid().($extension !== '' ? '.'.$extension : '');
        $path = $file->storeAs('quarantine/'.$safeDirectory, $filename, $diskName);

        if (! is_string($path) || $path === '') {
            throw new RuntimeException('Media quarantine storage failed.');
        }

        try {
            $asset = $owner->ownedMediaAssets()->create([
                'disk' => $diskName,
                'path' => $path,
                'path_hash' => hash('sha256', $path),
                'kind' => $kind,
                'state' => MediaAsset::STATE_PENDING,
                'visibility' => $visibility,
                'mime_type' => (string) $file->getMimeType(),
                'size' => $file->getSize() ?: null,
                'original_name' => mb_substr($file->getClientOriginalName(), 0, 255),
            ]);
        } catch (Throwable $exception) {
            Storage::disk($diskName)->delete($path);

            throw $exception;
        }

        if ($dispatchScan) {
            ScanQuarantinedMedia::dispatch($asset->id);
        }

        return $asset;
    }

    public function scan(MediaAsset $asset): MediaAsset
    {
        [$asset, $claimed] = DB::transaction(function () use ($asset): array {
            $locked = MediaAsset::query()->lockForUpdate()->findOrFail($asset->id);

            if (! in_array($locked->state, [MediaAsset::STATE_PENDING, MediaAsset::STATE_SCAN_FAILED], true)) {
                return [$locked, false];
            }

            $locked->forceFill(['state' => MediaAsset::STATE_SCANNING])->save();

            return [$locked, true];
        });

        if (! $claimed) {
            return $asset;
        }

        $quarantineDisk = Storage::disk($asset->disk);
        $stream = $quarantineDisk->readStream($asset->path);

        if (! is_resource($stream)) {
            return $this->recordResult($asset, MediaScanResult::failed('quarantine_read_failed'));
        }

        try {
            $result = $this->scanner->isAvailable()
                ? $this->scanner->scan($stream, [
                    'mime_type' => $asset->mime_type,
                    'size' => $asset->size !== null ? (int) $asset->size : null,
                    'original_name' => $asset->original_name,
                ])
                : MediaScanResult::failed();
        } catch (Throwable $exception) {
            Log::warning('Media scanner raised an exception.', [
                'media_asset_id' => $asset->id,
                'exception' => $exception::class,
            ]);
            $result = MediaScanResult::failed('scanner_exception');
        } finally {
            fclose($stream);
        }

        if ($result->status !== MediaScanResult::CLEAN) {
            return $this->recordResult($asset, $result);
        }

        return $this->publishCleanAsset($asset);
    }

    private function publishCleanAsset(MediaAsset $asset): MediaAsset
    {
        $sourceDisk = Storage::disk($asset->disk);
        $sourcePath = $asset->path;
        $targetDiskName = (string) config('media.filesystem_disk', 'public');
        $targetDisk = Storage::disk($targetDiskName);
        if (! Str::startsWith($sourcePath, 'quarantine/')) {
            return $this->recordResult($asset, MediaScanResult::failed('invalid_quarantine_path'));
        }

        $targetPath = Str::after($sourcePath, 'quarantine/');
        $stream = $sourceDisk->readStream($asset->path);

        if (! is_resource($stream)) {
            return $this->recordResult($asset, MediaScanResult::failed('quarantine_read_failed'));
        }

        try {
            if (! $targetDisk->writeStream($targetPath, $stream)) {
                return $this->recordResult($asset, MediaScanResult::failed('publication_failed'));
            }
        } finally {
            fclose($stream);
        }

        try {
            $asset = DB::transaction(function () use ($asset, $targetDiskName, $targetPath): MediaAsset {
                $locked = MediaAsset::query()->lockForUpdate()->findOrFail($asset->id);
                $locked->forceFill([
                    'disk' => $targetDiskName,
                    'path' => $targetPath,
                    'path_hash' => hash('sha256', $targetPath),
                    'state' => MediaAsset::STATE_CLEAN,
                ])->save();

                return $locked;
            });
        } catch (Throwable $exception) {
            $targetDisk->delete($targetPath);

            throw $exception;
        }

        $sourceDisk->delete($sourcePath);
        $this->recordMetric(MediaScanResult::CLEAN);
        Log::info('Quarantined media passed scanning and was published.', ['media_asset_id' => $asset->id]);

        return $asset;
    }

    private function recordResult(MediaAsset $asset, MediaScanResult $result): MediaAsset
    {
        $state = $result->status === MediaScanResult::INFECTED
            ? MediaAsset::STATE_INFECTED
            : MediaAsset::STATE_SCAN_FAILED;
        $asset->forceFill(['state' => $state])->save();
        $this->recordMetric($result->status);

        Log::log(
            $state === MediaAsset::STATE_INFECTED ? 'critical' : 'warning',
            'Quarantined media was not published.',
            [
                'media_asset_id' => $asset->id,
                'scan_status' => $result->status,
                'reason_code' => $result->reasonCode,
            ],
        );

        return $asset;
    }

    private function validateUpload(UploadedFile $file): void
    {
        $mimeType = strtolower((string) $file->getMimeType());
        $extension = strtolower($file->getClientOriginalExtension());
        $size = $file->getSize() ?: 0;
        $allowedMimeTypes = (array) config('media.scanning.allowed_mime_types', []);
        $allowedExtensions = (array) config('media.scanning.allowed_extensions', []);
        $maxBytes = max(1, (int) config('media.scanning.max_bytes', 52_428_800));

        if (
            ! $file->isValid()
            || $size <= 0
            || $size > $maxBytes
            || ! in_array($mimeType, $allowedMimeTypes, true)
            || ! in_array($extension, $allowedExtensions, true)
        ) {
            throw ValidationException::withMessages([
                'media_file' => 'The media file is not eligible for quarantine scanning.',
            ]);
        }
    }

    private function recordMetric(string $status): void
    {
        try {
            Cache::increment('metrics:media-scan:'.$status);
        } catch (Throwable) {
            // Scanning must not publish or fail based solely on metrics availability.
        }
    }
}
