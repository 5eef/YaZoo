<?php

namespace App\Http\Controllers\Api;

use App\DTOs\PaginationData;
use App\Http\Controllers\Controller;
use App\Http\Resources\Marketplace\AnimalResource;
use App\Http\Resources\Marketplace\ProductResource;
use App\Http\Resources\Marketplace\VeterinarianResource;
use App\Http\Resources\ServiceListingResource;
use App\Models\Animal;
use App\Models\Favorite;
use App\Models\Product;
use App\Models\ServiceListing;
use App\Models\Veterinarian;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Validation\Rule;

class FavoriteController extends Controller
{
    /**
     * @var array<string, class-string<Model>>
     */
    private const TYPE_MAP = [
        'animals' => Animal::class,
        'products' => Product::class,
        'services' => ServiceListing::class,
        'veterinarians' => Veterinarian::class,
    ];

    public function index(Request $request)
    {
        $pagination = PaginationData::fromRequest($request, 12, 50);

        $favorites = Favorite::query()
            ->with('favoritable.user.latestProfessionalVerification')
            ->where('user_id', $request->user()->id)
            ->latest()
            ->paginate($pagination->perPage);

        return response()->json([
            'data' => $favorites->getCollection()
                ->map(fn (Favorite $favorite): array => $this->serializeFavorite($favorite, $request))
                ->values(),
            'meta' => [
                'current_page' => $favorites->currentPage(),
                'last_page' => $favorites->lastPage(),
                'per_page' => $favorites->perPage(),
                'total' => $favorites->total(),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'type' => ['required', 'string', Rule::in(array_keys(self::TYPE_MAP))],
            'id' => ['required', 'integer', 'min:1'],
        ]);

        $favoritable = $this->findFavoritable($validated['type'], (int) $validated['id']);
        abort_unless($this->canView($favoritable, $request), 404);

        $favorite = Favorite::query()->firstOrCreate([
            'user_id' => $request->user()->id,
            'favoritable_type' => $favoritable::class,
            'favoritable_id' => $favoritable->getKey(),
        ]);

        return response()->json([
            'data' => [
                'id' => $favorite->id,
                'type' => $validated['type'],
                'favoritableId' => $favoritable->getKey(),
                'isFavorited' => true,
            ],
        ], $favorite->wasRecentlyCreated ? 201 : 200);
    }

    public function destroy(Request $request, string $type, int $id): JsonResponse
    {
        abort_unless(array_key_exists($type, self::TYPE_MAP), 404);

        $favoritable = $this->findFavoritable($type, $id);

        Favorite::query()
            ->where('user_id', $request->user()->id)
            ->where('favoritable_type', $favoritable::class)
            ->where('favoritable_id', $favoritable->getKey())
            ->delete();

        return response()->json([
            'data' => [
                'type' => $type,
                'favoritableId' => $favoritable->getKey(),
                'isFavorited' => false,
            ],
        ]);
    }

    private function findFavoritable(string $type, int $id): Model
    {
        /** @var class-string<Model> $model */
        $model = self::TYPE_MAP[$type];

        return $model::query()->findOrFail($id);
    }

    private function serializeFavorite(Favorite $favorite, Request $request): array
    {
        $favoritable = $favorite->favoritable;

        return [
            'id' => $favorite->id,
            'type' => $this->typeForModel($favorite->favoritable_type),
            'favoritableId' => $favorite->favoritable_id,
            'savedAt' => $favorite->created_at?->toISOString(),
            'item' => $favoritable && $this->canView($favoritable, $request)
                ? $this->resourceFor($favoritable)?->resolve($request)
                : null,
        ];
    }

    private function typeForModel(string $model): string
    {
        return array_search($model, self::TYPE_MAP, true) ?: 'unknown';
    }

    private function resourceFor(Model $model): ?JsonResource
    {
        return match (true) {
            $model instanceof Animal => AnimalResource::make($model),
            $model instanceof Product => ProductResource::make($model),
            $model instanceof ServiceListing => ServiceListingResource::make($model),
            $model instanceof Veterinarian => VeterinarianResource::make($model),
            default => null,
        };
    }

    private function canView(Model $model, Request $request): bool
    {
        $isPublic = match (true) {
            $model instanceof Animal,
            $model instanceof Product,
            $model instanceof ServiceListing,
            $model instanceof Veterinarian => $model->isPubliclyVisible(),
            default => false,
        };

        return $isPublic
            || $request->user()?->is($model->user)
            || (bool) $request->user()?->is_admin;
    }
}
