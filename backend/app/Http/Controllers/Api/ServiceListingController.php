<?php

namespace App\Http\Controllers\Api;

use App\DTOs\PaginationData;
use App\Http\Controllers\Controller;
use App\Http\Requests\ServiceListing\StoreServiceListingRequest;
use App\Http\Requests\ServiceListing\UpdateServiceListingRequest;
use App\Http\Resources\ServiceListingResource;
use App\Models\ServiceListing;
use App\Services\ActivityLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ServiceListingController extends Controller
{
    public function __construct(
        protected ActivityLogger $activityLogger,
    ) {}

    public function index(Request $request)
    {
        $pagination = PaginationData::fromRequest($request, 12, 50);

        $query = ServiceListing::query()
            ->with([
                'user:id,name,phone_verified_at,avatar,city,country',
                'user.latestProfessionalVerification.reviewer:id,is_admin',
            ])
            ->withCount([
                'reviews as reviews_count' => fn ($reviewQuery) => $reviewQuery->publiclyVisible(),
                'favorites as favorites_count',
            ])
            ->withAvg(['reviews as average_rating' => fn ($reviewQuery) => $reviewQuery->publiclyVisible()], 'rating')
            ->when($request->user(), function ($query, $user): void {
                $query->withExists([
                    'favorites as is_favorited' => fn ($favoriteQuery) => $favoriteQuery->where('user_id', $user->id),
                ]);
            })
            ->where('status', 'active')
            ->where(function ($query) use ($request): void {
                $query->where('moderation_status', ServiceListing::MODERATION_STATUS_ACTIVE);

                if ($user = $request->user()) {
                    $query->orWhere(function ($ownerQuery) use ($user): void {
                        $ownerQuery
                            ->where('user_id', $user->id)
                            ->where('moderation_status', ServiceListing::MODERATION_STATUS_PENDING_REVIEW);
                    });
                }
            })
            ->latest();

        if ($request->filled('type')) {
            $query->where('type', $request->string('type'));
        }

        if ($request->filled('city')) {
            $query->where('city', 'like', '%'.$request->string('city').'%');
        }

        return ServiceListingResource::collection($query->paginate($pagination->perPage));
    }

    public function mine(Request $request)
    {
        $pagination = PaginationData::fromRequest($request, 12, 50);

        return ServiceListingResource::collection(
            ServiceListing::query()
                ->with([
                    'user:id,name,phone_verified_at,avatar,city,country',
                    'user.latestProfessionalVerification.reviewer:id,is_admin',
                ])
                ->withCount([
                    'reviews as reviews_count' => fn ($reviewQuery) => $reviewQuery->publiclyVisible(),
                    'favorites as favorites_count',
                ])
                ->withAvg(['reviews as average_rating' => fn ($reviewQuery) => $reviewQuery->publiclyVisible()], 'rating')
                ->where('user_id', $request->user()->id)
                ->latest()
                ->paginate($pagination->perPage),
        );
    }

    public function types(): JsonResponse
    {
        return response()->json([
            'data' => [
                ['value' => 'pet_sitting', 'label' => 'Gardien/Gardienne d animaux'],
                ['value' => 'training', 'label' => 'Dresseur/Dresseuse d animaux'],
            ],
        ]);
    }

    public function feed(Request $request)
    {
        $pagination = PaginationData::fromRequest($request, 4, 12);

        return ServiceListingResource::collection(
            ServiceListing::query()
                ->with([
                    'user:id,name,phone_verified_at,avatar,city,country',
                    'user.latestProfessionalVerification.reviewer:id,is_admin',
                ])
                ->withCount([
                    'reviews as reviews_count' => fn ($reviewQuery) => $reviewQuery->publiclyVisible(),
                    'favorites as favorites_count',
                ])
                ->withAvg(['reviews as average_rating' => fn ($reviewQuery) => $reviewQuery->publiclyVisible()], 'rating')
                ->when($request->user(), function ($query, $user): void {
                    $query->withExists([
                        'favorites as is_favorited' => fn ($favoriteQuery) => $favoriteQuery->where('user_id', $user->id),
                    ]);
                })
                ->where('status', 'active')
                ->where('moderation_status', ServiceListing::MODERATION_STATUS_ACTIVE)
                ->when($request->user(), fn ($query, $user) => $query->where('user_id', '!=', $user->id))
                ->orderByDesc('reservations_count')
                ->latest()
                ->paginate($pagination->perPage),
        );
    }

    public function store(StoreServiceListingRequest $request): JsonResponse
    {
        $this->authorize('create', [ServiceListing::class, $request->validated('type')]);

        $service = ServiceListing::query()->create([
            ...$request->validated(),
            'user_id' => $request->user()->id,
            'status' => 'active',
            'moderation_status' => ServiceListing::MODERATION_STATUS_PENDING_REVIEW,
            'moderation_note' => null,
            'moderated_by' => null,
            'moderated_at' => null,
        ]);

        $this->activityLogger->log(
            'service.created',
            'service',
            $service,
            ['type' => $service->type, 'title' => $service->title],
            $request->user(),
            $request->user(),
            $request,
        );

        return ServiceListingResource::make($this->loadSocialSignals($service))
            ->response()
            ->setStatusCode(201);
    }

    public function show(ServiceListing $service): ServiceListingResource
    {
        abort_unless(
            $service->isPubliclyVisible()
                || request()->user()?->is($service->user)
                || (bool) request()->user()?->is_admin,
            404,
        );

        $service->increment('views_count');

        return ServiceListingResource::make($this->loadSocialSignals($service));
    }

    public function update(UpdateServiceListingRequest $request, ServiceListing $service): ServiceListingResource
    {
        $this->authorize('update', $service);

        $validated = $request->validated();

        if (isset($validated['type'])) {
            $this->authorize('create', [ServiceListing::class, $validated['type']]);
        }

        if (! $request->user()->is_admin) {
            $validated['moderation_status'] = ServiceListing::MODERATION_STATUS_PENDING_REVIEW;
            $validated['moderation_note'] = null;
            $validated['moderated_by'] = null;
            $validated['moderated_at'] = null;
        }

        $service->update($validated);

        $this->activityLogger->log(
            'service.updated',
            'service',
            $service,
            ['type' => $service->type, 'title' => $service->title],
            $request->user(),
            $request->user(),
            $request,
        );

        return ServiceListingResource::make($this->loadSocialSignals($service));
    }

    private function loadSocialSignals(ServiceListing $service): ServiceListing
    {
        $service->load([
            'user:id,name,phone_verified_at,avatar,city,country',
            'user.latestProfessionalVerification.reviewer:id,is_admin',
        ])
            ->loadCount([
                'reviews as reviews_count' => fn ($reviewQuery) => $reviewQuery->publiclyVisible(),
                'favorites as favorites_count',
            ])
            ->loadAvg(['reviews as average_rating' => fn ($reviewQuery) => $reviewQuery->publiclyVisible()], 'rating');

        if ($user = request()->user()) {
            $service->loadExists([
                'favorites as is_favorited' => fn ($favoriteQuery) => $favoriteQuery->where('user_id', $user->id),
            ]);
        }

        return $service;
    }

    public function destroy(Request $request, ServiceListing $service): JsonResponse
    {
        $this->authorize('delete', $service);

        $this->activityLogger->log(
            'service.deleted',
            'service',
            $service,
            ['type' => $service->type, 'title' => $service->title],
            $request->user(),
            $request->user(),
            $request,
        );

        $service->delete();

        return response()->json([
            'message' => __('messages.services.deleted'),
        ]);
    }
}
