<?php

namespace App\Http\Controllers\Api;

use App\DTOs\PaginationData;
use App\Http\Controllers\Controller;
use App\Http\Requests\Marketplace\StoreVeterinarianRequest;
use App\Http\Requests\Marketplace\UpdateVeterinarianRequest;
use App\Http\Resources\Marketplace\VeterinarianResource;
use App\Models\Veterinarian;
use App\Support\MarketplaceMedia;
use App\Support\MediaStorage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Throwable;

class VeterinarianController extends Controller
{
    public function index(Request $request)
    {
        $pagination = PaginationData::fromRequest($request, 12, 50);

        $query = Veterinarian::query()
            ->with([
                'user:id,name,email,phone,phone_verified_at,avatar,city,country',
                'user.latestProfessionalVerification.reviewer:id,is_admin',
            ])
            ->withCount(['favorites as favorites_count'])
            ->when($request->user(), function ($query, $user): void {
                $query->withExists([
                    'favorites as is_favorited' => fn ($favoriteQuery) => $favoriteQuery->where('user_id', $user->id),
                ]);
            })
            ->where(function ($query) use ($request): void {
                $query->where(function ($publicQuery): void {
                    $publicQuery
                        ->where('is_active', true)
                        ->where('moderation_status', Veterinarian::MODERATION_STATUS_ACTIVE);
                });

                if ($user = $request->user()) {
                    $query->orWhere(function ($ownerQuery) use ($user): void {
                        $ownerQuery
                            ->where('user_id', $user->id)
                            ->where('moderation_status', Veterinarian::MODERATION_STATUS_PENDING_REVIEW);
                    });
                }
            })
            ->latest();

        if (! $request->boolean('include_inactive') || ! $request->user()?->is_admin) {
            $query->where('is_active', true);
        }

        if ($request->filled('city')) {
            $query->where('city', 'like', '%'.$request->string('city').'%');
        }

        if ($request->filled('specialty')) {
            $query->where('specialties', 'like', '%'.$request->string('specialty').'%');
        }

        if ($request->filled('search')) {
            $search = '%'.$request->string('search').'%';
            $query->where(function ($inner) use ($search): void {
                $inner
                    ->where('name', 'like', $search)
                    ->orWhere('clinic_name', 'like', $search)
                    ->orWhere('description', 'like', $search)
                    ->orWhere('city', 'like', $search)
                    ->orWhere('address', 'like', $search);
            });
        }

        return VeterinarianResource::collection($query->paginate($pagination->perPage));
    }

    public function store(StoreVeterinarianRequest $request): JsonResponse
    {
        $this->authorize('create', Veterinarian::class);

        $uploadedPaths = [];

        try {
            $validated = $this->prepareMedia($request, $request->validated(), $uploadedPaths);
            $veterinarian = DB::transaction(fn (): Veterinarian => Veterinarian::query()->create([
                ...$validated,
                'user_id' => $request->user()->id,
                'is_active' => true,
                'moderation_status' => Veterinarian::MODERATION_STATUS_PENDING_REVIEW,
                'moderation_note' => null,
                'moderated_by' => null,
                'moderated_at' => null,
            ]));
        } catch (Throwable $exception) {
            MarketplaceMedia::deleteStoredFiles($uploadedPaths);

            throw $exception;
        }

        return VeterinarianResource::make($this->loadSocialSignals($veterinarian))
            ->response()
            ->setStatusCode(201);
    }

    public function show(Veterinarian $veterinarian): VeterinarianResource
    {
        abort_unless(
            $veterinarian->isPubliclyVisible()
                || request()->user()?->is($veterinarian->user)
                || (bool) request()->user()?->is_admin,
            404,
        );

        return VeterinarianResource::make($this->loadSocialSignals($veterinarian));
    }

    public function update(UpdateVeterinarianRequest $request, Veterinarian $veterinarian): VeterinarianResource
    {
        $this->authorize('update', $veterinarian);

        $oldImagePath = $veterinarian->image_path;
        $uploadedPaths = [];

        try {
            $validated = $this->prepareMedia($request, $request->validated(), $uploadedPaths);

            if (! $request->user()->is_admin) {
                $validated['moderation_status'] = Veterinarian::MODERATION_STATUS_PENDING_REVIEW;
                $validated['moderation_note'] = null;
                $validated['moderated_by'] = null;
                $validated['moderated_at'] = null;
            }

            DB::transaction(fn () => $veterinarian->update($validated));
        } catch (Throwable $exception) {
            MarketplaceMedia::deleteStoredFiles($uploadedPaths);

            throw $exception;
        }

        MarketplaceMedia::deleteStoredFiles(
            collect([$oldImagePath])->filter()->diff([$veterinarian->image_path])->values()->all(),
        );

        return VeterinarianResource::make($this->loadSocialSignals($veterinarian));
    }

    public function destroy(Request $request, Veterinarian $veterinarian): JsonResponse
    {
        $this->authorize('delete', $veterinarian);

        $imagePath = $veterinarian->image_path;
        DB::transaction(fn () => $veterinarian->delete());
        MarketplaceMedia::deleteStoredFiles([$imagePath]);

        return response()->json([
            'message' => __('messages.marketplace.veterinarian_deleted'),
        ]);
    }

    /**
     * @param  array<string, mixed>  $validated
     * @return array<string, mixed>
     */
    protected function prepareMedia(Request $request, array $validated, array &$uploadedPaths = []): array
    {
        if ($request->hasFile('image')) {
            $uploaded = MediaStorage::storeUploadedFile($request->file('image'), 'marketplace/veterinarians');
            $validated['image_path'] = $uploaded;
            $uploadedPaths[] = $uploaded;
        }

        return $validated;
    }

    private function loadSocialSignals(Veterinarian $veterinarian): Veterinarian
    {
        $veterinarian->load([
            'user:id,name,email,phone,phone_verified_at,avatar,city,country',
            'user.latestProfessionalVerification.reviewer:id,is_admin',
        ])
            ->loadCount(['favorites as favorites_count']);

        if ($user = request()->user()) {
            $veterinarian->loadExists([
                'favorites as is_favorited' => fn ($favoriteQuery) => $favoriteQuery->where('user_id', $user->id),
            ]);
        }

        return $veterinarian;
    }
}
