<?php

namespace App\Support;

use App\Models\MediaAsset;
use App\Models\User;
use App\Services\MediaAssetService;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

class MarketplaceMedia
{
    /**
     * Prepare uploaded marketplace media and merge it with existing values.
     *
     * @param  array<string, mixed>  $validated
     * @return array<string, mixed>
     */
    public static function prepareOwnedMedia(
        Request $request,
        array $validated,
        User $owner,
        ?Model $current,
        string $mainField,
        string $mainFileField,
        string $mainAssetField,
        string $directory,
    ): array {
        $assets = app(MediaAssetService::class);
        $controlsReferences = $request->has($mainAssetField)
            || $request->has('gallery_asset_ids')
            || $request->has($mainField)
            || $request->has('gallery_urls');
        $externalMain = isset($validated[$mainField]) ? trim((string) $validated[$mainField]) : null;
        $externalGallery = collect($validated['gallery_urls'] ?? [])->filter();
        $currentAssets = $current?->relationLoaded('mediaAssets')
            ? $current->getRelation('mediaAssets')
            : ($current?->mediaAssets()->get() ?? collect());

        $mainAsset = $request->filled($mainAssetField)
            ? $assets->ownedReference($owner, $request->string($mainAssetField)->toString(), $current)
            : ($controlsReferences ? null : $currentAssets->firstWhere('role', $mainField));
        $galleryAssets = $controlsReferences
            ? $assets->ownedReferences($owner, $request->input('gallery_asset_ids', []), $current)
            : $currentAssets->where('role', 'gallery')->values();
        $createdAssets = collect();

        if ($request->hasFile($mainFileField)) {
            $mainAsset = $assets->registerUpload($owner, $request->file($mainFileField), $directory, 'image');
            $createdAssets->push($mainAsset);
        }

        foreach ($request->file('gallery_files', []) as $file) {
            $asset = $assets->registerUpload($owner, $file, $directory, 'image');
            $galleryAssets->push($asset);
            $createdAssets->push($asset);
        }

        /** @var Collection<int, MediaAsset> $desiredAssets */
        $desiredAssets = collect([$mainAsset])
            ->merge($galleryAssets)
            ->filter()
            ->unique('id')
            ->take(6)
            ->values();

        unset(
            $validated[$mainAssetField],
            $validated['gallery_asset_ids'],
            $validated[$mainFileField],
            $validated['gallery_files'],
            $validated[$mainField],
            $validated['gallery_urls'],
        );

        $legacyMain = $current?->getAttribute($mainField);
        $legacyGallery = collect($current?->getAttribute('gallery_urls') ?? []);
        $mainPath = $mainAsset?->path ?? $externalMain ?? ($controlsReferences ? null : $legacyMain);
        $galleryPaths = $desiredAssets->pluck('path')->merge($externalGallery);

        if (! $controlsReferences) {
            $galleryPaths = collect([$mainPath])
                ->merge($legacyGallery)
                ->merge($galleryPaths);
        }

        $validated[$mainField] = $mainPath ?: $galleryPaths->filter()->first();
        $validated['gallery_urls'] = $galleryPaths->filter()->unique()->take(6)->values()->all();

        return [
            'payload' => $validated,
            'assets' => $desiredAssets,
            'created_assets' => $createdAssets,
        ];
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
}
