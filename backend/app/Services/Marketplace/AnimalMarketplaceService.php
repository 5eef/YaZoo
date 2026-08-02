<?php

namespace App\Services\Marketplace;

use App\Models\Animal;
use App\Models\User;
use App\Services\MediaAssetService;
use App\Support\MarketplaceMedia;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Throwable;

class AnimalMarketplaceService
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
        return Animal::query()
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
                $query->where('legal_status', 'approved');

                if ($user = $request->user()) {
                    $query->orWhere(function ($ownerQuery) use ($user): void {
                        $ownerQuery
                            ->where('user_id', $user->id)
                            ->where('legal_status', Animal::LEGAL_STATUS_PENDING_REVIEW);
                    });
                }
            })
            ->when($request->filled('q'), function ($query) use ($request): void {
                $this->search($query, ['name', 'type', 'breed', 'description'], (string) $request->string('q')->trim());
            })
            ->when($request->filled('category'), function ($query) use ($request): void {
                $query->where('category', $request->string('category')->trim());
            })
            ->when($request->filled('type'), function ($query) use ($request): void {
                $this->search($query, ['type'], (string) $request->string('type')->trim());
            })
            ->when($request->filled('sex'), function ($query) use ($request): void {
                $query->where('sex', $request->string('sex')->trim());
            })
            ->when($request->filled('location'), function ($query) use ($request): void {
                $this->search($query, ['location'], (string) $request->string('location')->trim());
            })
            ->when($request->filled('listing_status'), function ($query) use ($request): void {
                $query->where('listing_status', $request->string('listing_status')->trim());
            })
            ->when($request->filled('min_price'), fn ($query) => $query->where('price', '>=', $request->input('min_price')))
            ->when($request->filled('max_price'), fn ($query) => $query->where('price', '<=', $request->input('max_price')))
            ->when($request->has('adoption') && $request->input('adoption') !== '', function ($query) use ($request): void {
                $query->where('is_for_adoption', filter_var(
                    $request->input('adoption'),
                    FILTER_VALIDATE_BOOLEAN,
                ));
            })
            ->latest();
    }

    /**
     * @param  array<string, mixed>  $validated
     */
    public function create(User $user, Request $request, array $validated): Animal
    {
        $prepared = MarketplaceMedia::prepareOwnedMedia(
            $request,
            $validated,
            $user,
            null,
            'photo_url',
            'photo',
            'photo_asset_id',
            'marketplace/animals',
        );
        $payload = $prepared['payload'];
        $payload['legal_status'] = Animal::LEGAL_STATUS_PENDING_REVIEW;

        try {
            $animal = DB::transaction(function () use ($user, $payload, $prepared): Animal {
                $animal = $user->animals()->create($payload);
                $this->mediaAssets->sync($animal, $user, $prepared['assets'], 'photo_url');

                return $animal;
            });
        } catch (Throwable $exception) {
            $prepared['created_assets']->each(
                fn ($asset) => $this->mediaAssets->discardUnattached($asset, $user),
            );

            throw $exception;
        }

        return $this->loadForResponse($animal);
    }

    /**
     * @param  array<string, mixed>  $validated
     */
    public function update(Animal $animal, Request $request, array $validated): Animal
    {
        $animal->loadMissing('user', 'mediaAssets');
        $owner = $animal->user;
        $prepared = MarketplaceMedia::prepareOwnedMedia(
            $request,
            $validated,
            $owner,
            $animal,
            'photo_url',
            'photo',
            'photo_asset_id',
            'marketplace/animals',
        );
        $payload = $prepared['payload'];

        if (! request()->user()?->is_admin) {
            $payload['legal_status'] = Animal::LEGAL_STATUS_PENDING_REVIEW;
            $payload['moderation_note'] = null;
            $payload['moderated_by'] = null;
            $payload['moderated_at'] = null;
        }

        try {
            DB::transaction(function () use ($animal, $owner, $payload, $prepared): void {
                $animal->update($payload);
                $this->mediaAssets->sync($animal, $owner, $prepared['assets'], 'photo_url');
            });
        } catch (Throwable $exception) {
            $prepared['created_assets']->each(
                fn ($asset) => $this->mediaAssets->discardUnattached($asset, $owner),
            );

            throw $exception;
        }

        return $this->loadForResponse($animal);
    }

    public function delete(Animal $animal): void
    {
        DB::transaction(fn () => $animal->delete());
    }

    public function loadForResponse(Animal $animal): Animal
    {
        $animal->load([
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
            $animal->loadExists([
                'favorites as is_favorited' => fn ($query) => $query->where('user_id', $user->id),
            ]);
        }

        return $animal;
    }

    /**
     * @param  array<int, string>  $columns
     */
    protected function search($query, array $columns, string $value): void
    {
        $terms = $this->booleanFullTextTerms($value);

        if ($terms !== null && in_array(DB::connection()->getDriverName(), ['mysql', 'mariadb'], true)) {
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

        return 'marketplace:animals:'.hash('xxh128', json_encode([
            'query' => $query,
            'per_page' => $perPage,
            'user_id' => $request->user()?->id,
        ], JSON_THROW_ON_ERROR));
    }
}
