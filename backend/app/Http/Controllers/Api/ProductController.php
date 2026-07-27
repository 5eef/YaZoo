<?php

namespace App\Http\Controllers\Api;

use App\DTOs\PaginationData;
use App\Http\Controllers\Controller;
use App\Http\Requests\Marketplace\StoreProductRequest;
use App\Http\Requests\Marketplace\UpdateProductRequest;
use App\Http\Resources\Marketplace\ProductResource;
use App\Models\Product;
use App\Services\Marketplace\ProductMarketplaceService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProductController extends Controller
{
    public function __construct(
        protected ProductMarketplaceService $products,
    ) {}

    /**
     * Display a listing of product marketplace posts.
     */
    public function index(Request $request)
    {
        $pagination = PaginationData::fromRequest($request, 12, 50);

        return ProductResource::collection($this->products->paginate($request, $pagination->perPage));
    }

    /**
     * Store a newly created product listing.
     */
    public function store(StoreProductRequest $request): JsonResponse
    {
        $this->authorize('create', Product::class);

        return ProductResource::make($this->products->create($request->user(), $request, $request->validated()))
            ->response()
            ->setStatusCode(201);
    }

    /**
     * Display a single product listing.
     */
    public function show(Request $request, Product $product): ProductResource
    {
        abort_unless(
            $product->isPubliclyVisible()
                || $request->user()?->is($product->user)
                || (bool) $request->user()?->is_admin,
            404,
        );

        $this->products->loadForResponse($product);

        return ProductResource::make($product);
    }

    /**
     * Update an existing product listing.
     */
    public function update(UpdateProductRequest $request, Product $product): ProductResource
    {
        $this->authorize('update', $product);

        return ProductResource::make($this->products->update($product, $request, $request->validated()));
    }

    /**
     * Remove a product listing.
     */
    public function destroy(Request $request, Product $product): JsonResponse
    {
        $this->authorize('delete', $product);

        $this->products->delete($product);

        return response()->json([
            'message' => __('messages.marketplace.product_deleted'),
        ]);
    }
}
