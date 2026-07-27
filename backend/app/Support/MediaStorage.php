<?php

namespace App\Support;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use MongoDB\BSON\ObjectId;
use MongoDB\BSON\UTCDateTime;
use MongoDB\Client;
use MongoDB\Collection;
use MongoDB\GridFS\Bucket;
use RuntimeException;
use Throwable;

class MediaStorage
{
    /**
     * Determine whether the PHP MongoDB extension is available.
     */
    public static function isMongoDriverAvailable(): bool
    {
        return extension_loaded('mongodb');
    }

    /**
     * Store an uploaded file through the configured media driver.
     */
    public static function storeUploadedFile(UploadedFile $file, string $directory): string
    {
        $driver = (string) config('media.driver', 'filesystem');

        if ($driver === 'mongodb') {
            self::assertMongoDriverAvailable();

            return self::storeUploadedFileInMongo($file, $directory);
        }

        return $file->store($directory, (string) config('media.filesystem_disk', 'public'));
    }

    /**
     * Resolve an internal media path to a public URL.
     */
    public static function resolveUrl(?string $path): ?string
    {
        if (! $path) {
            return null;
        }

        if (self::isMongoReference($path)) {
            return rtrim((string) config('app.url'), '/').'/api/media/'.self::extractMongoFileId($path);
        }

        if (Str::startsWith($path, ['http://', 'https://', '/'])) {
            return $path;
        }

        return Storage::disk((string) config('media.filesystem_disk', 'public'))->url($path);
    }

    /**
     * Delete internal media files.
     *
     * @param  array<int, string|null>  $paths
     */
    public static function deleteStoredFiles(array $paths): void
    {
        $mongoIds = collect($paths)
            ->filter(fn ($path) => is_string($path) && self::isMongoReference($path))
            ->map(fn (string $path) => self::extractMongoFileId($path))
            ->unique()
            ->values()
            ->all();

        $internalPaths = collect($paths)
            ->filter(fn ($path) => is_string($path) && $path !== '')
            ->reject(fn ($path) => Str::startsWith($path, ['http://', 'https://', '/']) || self::isMongoReference($path))
            ->unique()
            ->values()
            ->all();

        if ($mongoIds !== []) {
            $bucket = self::mongoBucket();

            foreach ($mongoIds as $mongoId) {
                try {
                    $bucket->delete(new ObjectId($mongoId));
                } catch (Throwable) {
                    // Ignore missing or invalid files during cleanup.
                }
            }
        }

        if ($internalPaths !== []) {
            Storage::disk((string) config('media.filesystem_disk', 'public'))->delete($internalPaths);
        }
    }

    /**
     * Delete media while surfacing storage failures to transactional workflows.
     *
     * @param  array<int, string|null>  $paths
     */
    public static function deleteStoredFilesOrFail(array $paths): void
    {
        $mongoIds = collect($paths)
            ->filter(fn ($path) => is_string($path) && self::isMongoReference($path))
            ->map(fn (string $path) => self::extractMongoFileId($path))
            ->unique()
            ->values()
            ->all();

        foreach ($mongoIds as $mongoId) {
            self::mongoBucket()->delete(new ObjectId($mongoId));
        }

        $internalPaths = collect($paths)
            ->filter(fn ($path) => is_string($path) && $path !== '')
            ->reject(fn ($path) => Str::startsWith($path, ['http://', 'https://', '/']) || self::isMongoReference($path))
            ->unique()
            ->values()
            ->all();

        $disk = Storage::disk((string) config('media.filesystem_disk', 'public'));

        foreach ($internalPaths as $path) {
            if ($disk->exists($path) && ! $disk->delete($path)) {
                throw new RuntimeException('Media storage cleanup failed.');
            }
        }
    }

    /**
     * Detect the media kind from a file upload.
     */
    public static function detectMediaKind(UploadedFile $file): string
    {
        $mimeType = (string) $file->getMimeType();

        return Str::startsWith($mimeType, 'video/') ? 'video' : 'image';
    }

    /**
     * Open a MongoDB stored media file for streaming.
     *
     * @return array{stream: resource, mime_type: string, filename: string, size: int|null}
     */
    public static function openMongoDownload(string $fileId): array
    {
        self::assertMongoDriverAvailable();

        $objectId = new ObjectId($fileId);
        $bucket = self::mongoBucket();
        $fileDocument = self::mongoFilesCollection()->findOne([
            '_id' => $objectId,
        ]);

        if ($fileDocument === null) {
            throw new RuntimeException('Fichier media introuvable dans MongoDB.');
        }

        $stream = $bucket->openDownloadStream($objectId);
        $metadata = (array) ($fileDocument['metadata'] ?? []);
        $mimeType = (string) ($metadata['mime_type'] ?? $fileDocument['contentType'] ?? 'application/octet-stream');
        $filename = (string) ($metadata['original_name'] ?? $fileDocument['filename'] ?? $fileId);
        $size = isset($fileDocument['length']) ? (int) $fileDocument['length'] : null;

        return [
            'stream' => $stream,
            'mime_type' => $mimeType,
            'filename' => $filename,
            'size' => $size,
        ];
    }

    /**
     * Determine whether the given path points to a MongoDB stored file.
     */
    public static function isMongoReference(?string $path): bool
    {
        return is_string($path) && Str::startsWith($path, 'mongodb:');
    }

    /**
     * Ensure the local environment can really use MongoDB media storage.
     */
    protected static function assertMongoDriverAvailable(): void
    {
        if (! self::isMongoDriverAvailable()) {
            throw new RuntimeException(
                "Le driver media MongoDB requiert l'extension PHP mongodb, absente dans cet environnement.",
            );
        }
    }

    /**
     * Store an uploaded file in MongoDB GridFS.
     */
    protected static function storeUploadedFileInMongo(UploadedFile $file, string $directory): string
    {
        $stream = fopen($file->getRealPath(), 'rb');

        if ($stream === false) {
            throw new RuntimeException('Impossible de lire le fichier pour l upload MongoDB.');
        }

        try {
            return self::storeMongoStream(
                $stream,
                $file->hashName(),
                $directory,
                [
                    'original_name' => $file->getClientOriginalName(),
                    'mime_type' => (string) $file->getMimeType(),
                    'extension' => $file->getClientOriginalExtension(),
                    'size' => $file->getSize(),
                ],
            );
        } finally {
            fclose($stream);
        }
    }

    /**
     * Import an existing file from the configured public disk into MongoDB GridFS.
     */
    public static function importPublicDiskPath(string $path, ?string $directory = null): string
    {
        self::assertMongoDriverAvailable();

        $relativePath = ltrim($path, '/\\');
        $disk = Storage::disk((string) config('media.filesystem_disk', 'public'));

        if (! $disk->exists($relativePath)) {
            throw new RuntimeException("Fichier introuvable sur le disque public: {$relativePath}");
        }

        $absolutePath = $disk->path($relativePath);
        $stream = fopen($absolutePath, 'rb');

        if ($stream === false) {
            throw new RuntimeException("Impossible de lire le fichier local: {$relativePath}");
        }

        try {
            return self::storeMongoStream(
                $stream,
                basename($relativePath),
                $directory ?? trim(dirname(str_replace('\\', '/', $relativePath)), './'),
                [
                    'original_name' => basename($relativePath),
                    'mime_type' => File::mimeType($absolutePath) ?: 'application/octet-stream',
                    'extension' => pathinfo($relativePath, PATHINFO_EXTENSION),
                    'size' => $disk->size($relativePath),
                    'source_path' => $relativePath,
                ],
            );
        } finally {
            fclose($stream);
        }
    }

    /**
     * Build a MongoDB GridFS bucket instance.
     */
    protected static function mongoBucket(): Bucket
    {
        return self::mongoClient()
            ->selectDatabase((string) config('media.mongodb.database', 'yazoo_media'))
            ->selectGridFSBucket([
                'bucketName' => (string) config('media.mongodb.bucket', 'uploads'),
            ]);
    }

    /**
     * Access the MongoDB files collection for metadata lookup.
     */
    protected static function mongoFilesCollection(): Collection
    {
        $database = (string) config('media.mongodb.database', 'yazoo_media');
        $bucket = (string) config('media.mongodb.bucket', 'uploads');

        return self::mongoClient()
            ->selectCollection($database, $bucket.'.files');
    }

    /**
     * Build a MongoDB client from the configured URI.
     */
    protected static function mongoClient(): Client
    {
        $uri = (string) config('media.mongodb.uri', '');

        if ($uri === '') {
            throw new RuntimeException("L'URI MongoDB media n'est pas configuree.");
        }

        return new Client($uri);
    }

    /**
     * Extract the raw ObjectId string from a MongoDB media reference.
     */
    protected static function extractMongoFileId(string $path): string
    {
        return Str::after($path, 'mongodb:');
    }

    /**
     * Upload a generic stream into MongoDB GridFS and return the internal reference.
     *
     * @param  resource  $stream
     * @param  array<string, mixed>  $metadata
     */
    protected static function storeMongoStream($stream, string $filename, string $directory, array $metadata): string
    {
        $bucket = self::mongoBucket();
        $safeDirectory = trim(str_replace('\\', '/', $directory), '/');

        $fileId = $bucket->uploadFromStream(
            $filename,
            $stream,
            [
                'contentType' => (string) ($metadata['mime_type'] ?? 'application/octet-stream'),
                'metadata' => array_filter([
                    'directory' => $safeDirectory,
                    'original_name' => $metadata['original_name'] ?? $filename,
                    'mime_type' => $metadata['mime_type'] ?? null,
                    'extension' => $metadata['extension'] ?? null,
                    'size' => $metadata['size'] ?? null,
                    'source_path' => $metadata['source_path'] ?? null,
                    'uploaded_at' => new UTCDateTime,
                ], fn ($value) => $value !== null && $value !== ''),
            ],
        );

        return 'mongodb:'.$fileId;
    }
}
