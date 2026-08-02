<?php

namespace App\Http\Controllers\Api;

use App\DTOs\PaginationData;
use App\Http\Controllers\Controller;
use App\Http\Requests\Marketplace\StoreVeterinarianRequest;
use App\Http\Requests\Marketplace\UpdateVeterinarianRequest;
use App\Http\Resources\Marketplace\VeterinarianResource;
use App\Models\Veterinarian;
use App\Services\MediaAssetService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Throwable;

class VeterinarianController extends Controller
{
    public function __construct(
        private readonly MediaAssetService $mediaAssets,
    ) {}

    public function index(Request $request)
    {
        $pagination = PaginationData::fromRequest($request, 12, 50);

        $query = Veterinarian::query()
            ->with([
                'user:id,name,email,phone,phone_verified_at,avatar,city,country',
                'user.latestProfessionalVerification.reviewer:id,is_admin',
                'mediaAssets',
            ])
            ->withCount([
                'favorites as favorites_count',
                'appointmentReviews as reviews_count',
            ])
            ->withAvg('appointmentReviews as average_rating', 'rating')
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

        $mediaAsset = null;

        try {
            [$validated, $mediaAsset] = $this->prepareMedia($request, $request->validated());
            $veterinarian = DB::transaction(function () use ($request, $validated, $mediaAsset): Veterinarian {
                $veterinarian = Veterinarian::query()->create([
                    ...$validated,
                    'user_id' => $request->user()->id,
                    'is_active' => true,
                    'moderation_status' => Veterinarian::MODERATION_STATUS_PENDING_REVIEW,
                    'moderation_note' => null,
                    'moderated_by' => null,
                    'moderated_at' => null,
                ]);

                if ($mediaAsset) {
                    $this->mediaAssets->attach($mediaAsset, $veterinarian, 'image_path');
                }

                return $veterinarian;
            });
        } catch (Throwable $exception) {
            if ($mediaAsset) {
                $this->mediaAssets->discardUnattached($mediaAsset, $request->user());
            }

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

        $veterinarian->loadMissing('user', 'mediaAssets');
        $owner = $veterinarian->user;
        $mediaAsset = null;
        $changesMedia = $request->hasFile('image')
            || $request->has('image_asset_id')
            || $request->has('image_path');

        try {
            [$validated, $mediaAsset] = $this->prepareMedia($request, $request->validated(), $veterinarian);

            if (! $request->user()->is_admin) {
                $validated['moderation_status'] = Veterinarian::MODERATION_STATUS_PENDING_REVIEW;
                $validated['moderation_note'] = null;
                $validated['moderated_by'] = null;
                $validated['moderated_at'] = null;
            }

            DB::transaction(fn () => $veterinarian->update($validated));

            if ($changesMedia) {
                $this->mediaAssets->replaceRole($veterinarian, $owner, 'image_path', $mediaAsset);
            }
        } catch (Throwable $exception) {
            if ($mediaAsset) {
                $this->mediaAssets->discardUnattached($mediaAsset, $owner);
            }

            throw $exception;
        }

        return VeterinarianResource::make($this->loadSocialSignals($veterinarian));
    }

    public function destroy(Request $request, Veterinarian $veterinarian): JsonResponse
    {
        $this->authorize('delete', $veterinarian);

        $veterinarian->loadMissing('user');
        $owner = $veterinarian->user;
        DB::transaction(fn () => $veterinarian->delete());
        $this->mediaAssets->deleteAttached($veterinarian, $owner);

        return response()->json([
            'message' => __('messages.marketplace.veterinarian_deleted'),
        ]);
    }

    /**
     * @param  array<string, mixed>  $validated
     * @return array<string, mixed>
     */
    protected function prepareMedia(Request $request, array $validated, ?Veterinarian $current = null): array
    {
        $owner = $current?->user ?? $request->user();
        $asset = null;

        unset($validated['image'], $validated['image_asset_id']);

        if ($request->hasFile('image')) {
            $asset = $this->mediaAssets->registerUpload(
                $owner,
                $request->file('image'),
                'marketplace/veterinarians',
                'image',
            );
            $validated['image_path'] = $asset->path;
        } elseif ($request->filled('image_asset_id')) {
            $asset = $this->mediaAssets->ownedReference(
                $owner,
                $request->string('image_asset_id')->toString(),
                $current,
            );
            $validated['image_path'] = $asset->path;
        } elseif (! $request->has('image_path')) {
            unset($validated['image_path']);
        }

        return [$validated, $asset];
    }

    private function loadSocialSignals(Veterinarian $veterinarian): Veterinarian
    {
        $veterinarian->load([
            'user:id,name,email,phone,phone_verified_at,avatar,city,country',
            'user.latestProfessionalVerification.reviewer:id,is_admin',
            'mediaAssets',
        ])
            ->loadCount([
                'favorites as favorites_count',
                'appointmentReviews as reviews_count',
            ])
            ->loadAvg('appointmentReviews as average_rating', 'rating');

        if ($user = request()->user()) {
            $veterinarian->loadExists([
                'favorites as is_favorited' => fn ($favoriteQuery) => $favoriteQuery->where('user_id', $user->id),
            ]);
        }

        return $veterinarian;
    }
}
