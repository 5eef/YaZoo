<?php

namespace App\Support;

use Illuminate\Http\Request;
use Throwable;

class MarketplaceMedia
{
    /**
     * Prepare uploaded marketplace media and merge it with existing values.
     *
     * @param  array<string, mixed>  $validated
     * @return array<string, mixed>
     */
    public static function prepareUploadedMedia(
        Request $request,
        array $validated,
        string $mainField,
        string $mainFileField,
        string $directory,
        array &$uploadedPaths = [],
    ): array {
        $existingMain = self::normalizePath($validated[$mainField] ?? null);
        $existingGallery = collect($validated['gallery_urls'] ?? [])
            ->map(fn ($value) => self::normalizePath($value))
            ->filter()
            ->values();

        $storedPaths = [];

        try {
            $uploadedMain = $request->hasFile($mainFileField)
                ? MediaStorage::storeUploadedFile($request->file($mainFileField), $directory)
                : null;

            if ($uploadedMain) {
                $storedPaths[] = $uploadedMain;
            }

            $uploadedGallery = collect($request->file('gallery_files', []))
                ->filter()
                ->map(function ($file) use ($directory, &$storedPaths): string {
                    $path = MediaStorage::storeUploadedFile($file, $directory);
                    $storedPaths[] = $path;

                    return $path;
                })
                ->values();
        } catch (Throwable $exception) {
            MediaStorage::deleteStoredFiles($storedPaths);

            throw $exception;
        }

        $gallery = collect();

        if ($uploadedMain) {
            $gallery->push($uploadedMain);
        } elseif ($existingMain) {
            $gallery->push($existingMain);
        }

        $gallery = $gallery
            ->merge($existingGallery)
            ->merge($uploadedGallery)
            ->filter()
            ->unique()
            ->take(6)
            ->values();

        $validated[$mainField] = $uploadedMain ?: $existingMain ?: $gallery->first();
        $validated['gallery_urls'] = $gallery->all();

        $referencedPaths = collect([$validated[$mainField], ...$validated['gallery_urls']])
            ->filter()
            ->unique();
        $uploadedPaths = collect($storedPaths)
            ->filter(fn (string $path): bool => $referencedPaths->contains($path))
            ->values()
            ->all();

        MediaStorage::deleteStoredFiles(
            collect($storedPaths)->diff($uploadedPaths)->values()->all(),
        );

        return $validated;
    }

    /**
     * Resolve a marketplace media path to a public URL.
     */
    public static function resolveUrl(?string $path): ?string
    {
        return MediaStorage::resolveUrl($path);
    }

    /**
     * Resolve multiple marketplace media paths to public URLs.
     *
     * @param  array<int, string>|null  $paths
     * @return array<int, string>
     */
    public static function resolveUrls(?array $paths): array
    {
        return collect($paths ?? [])
            ->map(fn ($path) => self::resolveUrl($path))
            ->filter()
            ->values()
            ->all();
    }

    /**
     * Delete internal marketplace media files.
     *
     * @param  array<int, string|null>  $paths
     */
    public static function deleteStoredFiles(array $paths): void
    {
        MediaStorage::deleteStoredFiles($paths);
    }

    /**
     * Normalize an incoming media path.
     */
    protected static function normalizePath(mixed $value): ?string
    {
        if (! is_string($value)) {
            return null;
        }

        $trimmed = trim($value);

        return $trimmed !== '' ? $trimmed : null;
    }
}
