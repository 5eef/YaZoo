<?php

namespace App\Http\Controllers\Api;

use App\DTOs\PaginationData;
use App\Http\Controllers\Controller;
use App\Http\Requests\Marketplace\StoreAnimalRequest;
use App\Http\Requests\Marketplace\UpdateAnimalRequest;
use App\Http\Resources\Marketplace\AnimalResource;
use App\Models\Animal;
use App\Services\Marketplace\AnimalMarketplaceService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AnimalController extends Controller
{
    public function __construct(
        protected AnimalMarketplaceService $animals,
    ) {}

    /**
     * Display a listing of animal marketplace posts.
     */
    public function index(Request $request)
    {
        $pagination = PaginationData::fromRequest($request, 12, 50);

        return AnimalResource::collection($this->animals->paginate($request, $pagination->perPage));
    }

    /**
     * Store a newly created animal listing.
     */
    public function store(StoreAnimalRequest $request): JsonResponse
    {
        $this->authorize('create', Animal::class);

        return AnimalResource::make($this->animals->create($request->user(), $request, $request->validated()))
            ->response()
            ->setStatusCode(201);
    }

    /**
     * Display a single animal listing.
     */
    public function show(Request $request, Animal $animal): AnimalResource
    {
        abort_unless(
            $animal->isPubliclyVisible()
                || $request->user()?->is($animal->user)
                || (bool) $request->user()?->is_admin,
            404,
        );

        $this->animals->loadForResponse($animal);

        return AnimalResource::make($animal);
    }

    /**
     * Update an existing animal listing.
     */
    public function update(UpdateAnimalRequest $request, Animal $animal): AnimalResource
    {
        $this->authorize('update', $animal);

        return AnimalResource::make($this->animals->update($animal, $request, $request->validated()));
    }

    /**
     * Remove an animal listing.
     */
    public function destroy(Request $request, Animal $animal): JsonResponse
    {
        $this->authorize('delete', $animal);

        $this->animals->delete($animal);

        return response()->json([
            'message' => __('messages.marketplace.animal_deleted'),
        ]);
    }
}
