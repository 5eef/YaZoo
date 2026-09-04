<?php

namespace App\Services\Marketplace;

use App\Models\Product;
use App\Models\User;
use App\Services\MediaAssetService;
use App\Support\MarketplaceMedia;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Throwable;

class ProductMarketplaceService
{
    public function __construct(
        private readonly MediaAssetService $mediaAssets,
    ) {}

    public function paginate(Request $request, int $perPage): LengthAwarePaginator
    {
        if (app()->runningUnitTests()) {
            return $this->query($request)->paginate($perPage);
        }

        return Cache::remember(
            $this->cacheKey($request, $perPage),
            now()->addSeconds(30),
            fn (): LengthAwarePaginator => $this->query($request)->paginate($perPage),
        );
    }

    protected function query(Request $request)
    {
        return Product::query()
            ->with([
                'user:id,name,phone_verified_at,avatar,city,country',
                'user.latestProfessionalVerification.reviewer:id,is_admin',
                'mediaAssets',
            ])
            ->withCount([
                'reviews as reviews_count' => fn ($query) => $query->publiclyVisible(),
                'favorites as favorites_count',
            ])
            ->withAvg(['reviews as average_rating' => fn ($query) => $query->publiclyVisible()], 'rating')
            ->when($request->user(), function ($query, User $user): void {
                $query->withExists([
                    'favorites as is_favorited' => fn ($favoriteQuery) => $favoriteQuery->where('user_id', $user->id),
                ]);
            })
            ->where(function ($query) use ($request): void {
                $query->where('moderation_status', Product::MODERATION_STATUS_ACTIVE);

                if ($user = $request->user()) {
                    $query->orWhere(function ($ownerQuery) use ($user): void {
                        $ownerQuery
                            ->where('user_id', $user->id)
                            ->where('moderation_status', Product::MODERATION_STATUS_PENDING_REVIEW);
                    });
                }
            })
            ->when($request->filled('q'), function ($query) use ($request): void {
                $this->search($query, ['name', 'description'], (string) $request->string('q')->trim());
            })
            ->when($request->filled('category'), function ($query) use ($request): void {
                $query->where('category', $request->string('category')->trim());
            })
            ->when($request->filled('min_price'), fn ($query) => $query->where('price', '>=', $request->input('min_price')))
            ->when($request->filled('max_price'), fn ($query) => $query->where('price', '<=', $request->input('max_price')))
            ->when($request->filled('location'), function ($query) use ($request): void {
                $this->search($query, ['location'], (string) $request->string('location')->trim());
            })
            ->when($request->filled('listing_status'), function ($query) use ($request): void {
                $query->where('listing_status', $request->string('listing_status')->trim());
            })
            ->when($request->filled('condition_status'), function ($query) use ($request): void {
                $query->where('condition_status', $request->string('condition_status')->trim());
            })
            ->latest();
    }

    /**
     * @param  array<string, mixed>  $validated
     */
    public function create(User $user, Request $request, array $validated): Product
    {
        $prepared = MarketplaceMedia::prepareOwnedMedia(
            $request,
            $validated,
            $user,
            null,
            'image_url',
            'image',
            'image_asset_id',
            'marketplace/products',
        );
        $payload = $prepared['payload'];
        $payload['moderation_status'] = Product::MODERATION_STATUS_PENDING_REVIEW;
        $payload['moderation_note'] = null;
        $payload['moderated_by'] = null;
        $payload['moderated_at'] = null;

        try {
            $product = DB::transaction(function () use ($user, $payload, $prepared): Product {
                $product = $user->products()->create($payload);
                $this->mediaAssets->sync($product, $user, $prepared['assets'], 'image_url');

                return $product;
            });
        } catch (Throwable $exception) {
            $prepared['created_assets']->each(
                fn ($asset) => $this->mediaAssets->discardUnattached($asset, $user),
            );

            throw $exception;
        }

        return $this->loadForResponse($product);
    }

    /**
     * @param  array<string, mixed>  $validated
     */
    public function update(Product $product, Request $request, array $validated): Product
    {
        $product->loadMissing('user', 'mediaAssets');
        $owner = $product->user;
        $prepared = MarketplaceMedia::prepareOwnedMedia(
            $request,
            $validated,
            $owner,
            $product,
            'image_url',
            'image',
            'image_asset_id',
            'marketplace/products',
        );
        $payload = $prepared['payload'];

        if (! request()->user()?->is_admin) {
            $payload['moderation_status'] = Product::MODERATION_STATUS_PENDING_REVIEW;
            $payload['moderation_note'] = null;
            $payload['moderated_by'] = null;
            $payload['moderated_at'] = null;
        }

        try {
            DB::transaction(function () use ($product, $owner, $payload, $prepared): void {
                $product->update($payload);
                $this->mediaAssets->sync($product, $owner, $prepared['assets'], 'image_url');
            });
        } catch (Throwable $exception) {
            $prepared['created_assets']->each(
                fn ($asset) => $this->mediaAssets->discardUnattached($asset, $owner),
            );

            throw $exception;
        }

        return $this->loadForResponse($product);
    }

    public function delete(Product $product): void
    {
        DB::transaction(fn () => $product->delete());
    }

    public function loadForResponse(Product $product): Product
    {
        $product->load([
            'user:id,name,phone_verified_at,avatar,city,country',
            'user.latestProfessionalVerification.reviewer:id,is_admin',
            'mediaAssets',
        ])
            ->loadCount([
                'reviews as reviews_count' => fn ($query) => $query->publiclyVisible(),
                'favorites as favorites_count',
            ])
            ->loadAvg(['reviews as average_rating' => fn ($query) => $query->publiclyVisible()], 'rating');

        if ($user = request()->user()) {
            $product->loadExists([
                'favorites as is_favorited' => fn ($query) => $query->where('user_id', $user->id),
            ]);
        }

        return $product;
    }

    /**
     * @param  array<int, string>  $columns
     */
    protected function search($query, array $columns, string $value): void
    {
        $terms = $this->booleanFullTextTerms($value);

        if (
            $terms !== null
            && (bool) config('operations.fulltext_search_enabled')
            && in_array(DB::connection()->getDriverName(), ['mysql', 'mariadb'], true)
        ) {
            $query->whereFullText($columns, $terms, ['mode' => 'boolean']);

            return;
        }

        $query->where(function ($innerQuery) use ($columns, $value): void {
            foreach ($columns as $column) {
                $innerQuery->orWhere($column, 'like', $this->prefixLike($value));
            }
        });
    }

    protected function booleanFullTextTerms(string $value): ?string
    {
        preg_match_all('/[\pL\pN]+/u', mb_strtolower($value), $matches);

        $terms = collect($matches[0] ?? [])
            ->map(fn (string $term): string => trim($term))
            ->filter(fn (string $term): bool => mb_strlen($term) >= 2)
            ->unique()
            ->map(fn (string $term): string => '+'.$term.'*')
            ->values();

        return $terms->isEmpty() ? null : $terms->implode(' ');
    }

    protected function prefixLike(string $value): string
    {
        return addcslashes($value, '\\%_').'%';
    }

    protected function cacheKey(Request $request, int $perPage): string
    {
        $query = $request->query();
        ksort($query);

        return 'marketplace:products:'.hash('xxh128', json_encode([
            'query' => $query,
            'per_page' => $perPage,
            'user_id' => $request->user()?->id,
        ], JSON_THROW_ON_ERROR));
    }
}
