<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Animal;
use App\Models\Community;
use App\Models\Post;
use App\Models\Product;
use App\Models\ServiceListing;
use App\Models\User;
use App\Models\Veterinarian;
use App\Support\MarketplaceMedia;
use App\Support\MediaStorage;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SearchController extends Controller
{
    public function users(Request $request): JsonResponse
    {
        $query = $this->validatedQuery($request);

        return response()->json([
            'data' => $query === ''
                ? []
                : $this->userResults($query, 8),
        ]);
    }

    public function index(Request $request): JsonResponse
    {
        $query = $this->validatedQuery($request);
        $type = $request->string('type')->lower()->toString();

        if ($query === '') {
            return response()->json([
                'data' => [
                    'users' => [],
                    'communities' => [],
                    'animals' => [],
                    'products' => [],
                    'posts' => [],
                    'services' => [],
                    'veterinarians' => [],
                ],
            ]);
        }

        $types = $type && $type !== 'all'
            ? [$type]
            : ['users', 'communities', 'animals', 'products', 'posts', 'services', 'veterinarians'];

        return response()->json([
            'data' => [
                'users' => in_array('users', $types, true) ? $this->userResults($query, 8) : [],
                'communities' => in_array('communities', $types, true) ? $this->communityResults($query, 8, $request->user()) : [],
                'animals' => in_array('animals', $types, true) ? $this->animalResults($query, 8) : [],
                'products' => in_array('products', $types, true) ? $this->productResults($query, 8) : [],
                'posts' => in_array('posts', $types, true) ? $this->postResults($query, 8, $request->user()) : [],
                'services' => in_array('services', $types, true) ? $this->serviceResults($query, 8) : [],
                'veterinarians' => in_array('veterinarians', $types, true) ? $this->veterinarianResults($query, 8) : [],
            ],
        ]);
    }

    protected function validatedQuery(Request $request): string
    {
        $validated = $request->validate([
            'q' => ['nullable', 'string', 'max:80'],
            'type' => ['nullable', 'string', 'max:40'],
        ]);

        $query = trim((string) ($validated['q'] ?? ''));

        return mb_strlen($query) >= 2 ? $query : '';
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    protected function userResults(string $query, int $limit): array
    {
        return User::query()
            ->where(function (Builder $builder) use ($query): void {
                $builder
                    ->where('name', 'like', "%{$query}%")
                    ->orWhere('city', 'like', "%{$query}%");
            })
            ->latest()
            ->limit($limit)
            ->get(['id', 'name', 'avatar', 'city', 'country'])
            ->map(fn (User $user): array => [
                'id' => $user->id,
                'type' => 'user',
                'name' => $user->name,
                'username' => $user->name ? str($user->name)->lower()->replace(' ', '')->toString() : null,
                'avatarUrl' => MediaStorage::resolveUrl($user->avatar),
                'city' => $user->city,
                'country' => $user->country,
                'url' => "/profile/{$user->id}",
            ])
            ->all();
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    protected function communityResults(string $query, int $limit, ?User $viewer): array
    {
        return Community::query()
            ->visibleTo($viewer)
            ->withCount('approvedMemberships')
            ->where(fn (Builder $builder) => $this->whereLike($builder, ['name', 'description'], $query))
            ->latest()
            ->limit($limit)
            ->get()
            ->map(fn (Community $community): array => [
                'id' => $community->id,
                'type' => 'community',
                'name' => $community->name,
                'description' => $community->description,
                'imageUrl' => MediaStorage::resolveUrl($community->image_url),
                'membersCount' => $community->approved_memberships_count ?? 0,
                'url' => "/communities/{$community->id}",
            ])
            ->all();
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    protected function animalResults(string $query, int $limit): array
    {
        return Animal::query()
            ->where('legal_status', 'approved')
            ->where(fn (Builder $builder) => $this->whereLike($builder, ['name', 'category', 'type', 'breed', 'location', 'description'], $query))
            ->latest()
            ->limit($limit)
            ->get()
            ->map(fn (Animal $animal): array => [
                'id' => $animal->id,
                'type' => 'animal',
                'name' => $animal->name,
                'description' => $animal->description,
                'imageUrl' => MarketplaceMedia::resolveUrl($animal->photo_url),
                'city' => $animal->location,
                'price' => $animal->price !== null ? (float) $animal->price : null,
                'isForAdoption' => (bool) $animal->is_for_adoption,
                'url' => "/marketplace/animals/{$animal->id}",
            ])
            ->all();
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    protected function productResults(string $query, int $limit): array
    {
        return Product::query()
            ->where('moderation_status', Product::MODERATION_STATUS_ACTIVE)
            ->where(fn (Builder $builder) => $this->whereLike($builder, ['name', 'category', 'description', 'location'], $query))
            ->latest()
            ->limit($limit)
            ->get()
            ->map(fn (Product $product): array => [
                'id' => $product->id,
                'type' => 'product',
                'name' => $product->name,
                'description' => $product->description,
                'imageUrl' => MarketplaceMedia::resolveUrl($product->image_url),
                'city' => $product->location,
                'price' => $product->price !== null ? (float) $product->price : null,
                'url' => "/marketplace/products/{$product->id}",
            ])
            ->all();
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    protected function postResults(string $query, int $limit, ?User $viewer): array
    {
        return Post::query()
            ->visibleTo($viewer)
            ->with('user:id,name,avatar')
            ->where(function (Builder $builder) use ($query): void {
                $this->whereLike($builder, ['content', 'location'], $query);
                $builder->orWhereJsonContains('tags', $query);
            })
            ->latest()
            ->limit($limit)
            ->get()
            ->map(function (Post $post): array {
                $resolvedMediaPath = $post->media_path ?: $post->image_path;
                $resolvedMediaKind = $post->media_kind ?: ($resolvedMediaPath ? 'image' : null);

                return [
                    'id' => $post->id,
                    'type' => 'post',
                    'name' => str($post->content ?: __('messages.search.post_fallback'))->limit(80)->toString(),
                    'description' => $post->content,
                    'imageUrl' => $resolvedMediaKind === 'image'
                        ? MediaStorage::resolveUrl($resolvedMediaPath)
                        : null,
                    'mediaUrl' => MediaStorage::resolveUrl($resolvedMediaPath),
                    'author' => [
                        'id' => $post->user?->id,
                        'name' => $post->user?->name,
                        'avatarUrl' => MediaStorage::resolveUrl($post->user?->avatar),
                    ],
                    'city' => $post->location,
                    'url' => "/feed?post={$post->id}",
                ];
            })
            ->all();
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    protected function serviceResults(string $query, int $limit): array
    {
        return ServiceListing::query()
            ->where('status', 'active')
            ->where('moderation_status', ServiceListing::MODERATION_STATUS_ACTIVE)
            ->where(fn (Builder $builder) => $this->whereLike($builder, ['title', 'description', 'city', 'address', 'type'], $query))
            ->latest()
            ->limit($limit)
            ->get()
            ->map(fn (ServiceListing $service): array => [
                'id' => $service->id,
                'type' => 'service',
                'name' => $service->title,
                'description' => $service->description,
                'imageUrl' => $this->firstMediaUrl($service->media ?? []),
                'city' => $service->city,
                'price' => $service->price !== null ? (float) $service->price : null,
                'url' => "/marketplace/services?service={$service->id}",
            ])
            ->all();
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    protected function veterinarianResults(string $query, int $limit): array
    {
        return Veterinarian::query()
            ->where('is_active', true)
            ->where('moderation_status', Veterinarian::MODERATION_STATUS_ACTIVE)
            ->where(fn (Builder $builder) => $this->whereLike($builder, ['name', 'clinic_name', 'description', 'city', 'address'], $query))
            ->latest()
            ->limit($limit)
            ->get()
            ->map(fn (Veterinarian $veterinarian): array => [
                'id' => $veterinarian->id,
                'type' => 'veterinarian',
                'name' => $veterinarian->name,
                'clinicName' => $veterinarian->clinic_name,
                'description' => $veterinarian->description,
                'imageUrl' => MarketplaceMedia::resolveUrl($veterinarian->image_path),
                'city' => $veterinarian->city,
                'specialties' => $veterinarian->specialties ?? [],
                'url' => "/marketplace/veterinarians?veterinarian={$veterinarian->id}",
            ])
            ->all();
    }

    protected function whereLike(Builder $builder, array $columns, string $query): void
    {
        foreach ($columns as $index => $column) {
            $method = $index === 0 ? 'where' : 'orWhere';
            $builder->{$method}($column, 'like', "%{$query}%");
        }
    }

    protected function firstMediaUrl(array $media): ?string
    {
        $firstMedia = $media[0] ?? null;

        if (is_array($firstMedia)) {
            return MediaStorage::resolveUrl($firstMedia['url'] ?? $firstMedia['path'] ?? null);
        }

        return is_string($firstMedia) ? MediaStorage::resolveUrl($firstMedia) : null;
    }
}
