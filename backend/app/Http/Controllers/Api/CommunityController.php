<?php

namespace App\Http\Controllers\Api;

use App\DTOs\PaginationData;
use App\Http\Controllers\Controller;
use App\Http\Requests\Community\StoreCommunityRequest;
use App\Http\Requests\Community\UpdateCommunityRequest;
use App\Http\Resources\Community\CommunityMembershipRequestResource;
use App\Http\Resources\Community\CommunityResource;
use App\Models\Community;
use App\Models\CommunityMember;
use App\Models\User;
use App\Notifications\CommunityJoinedNotification;
use App\Notifications\CommunityJoinRequestNotification;
use App\Notifications\CommunityRequestApprovedNotification;
use App\Notifications\CommunityRequestRejectedNotification;
use App\Support\MediaStorage;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Throwable;

class CommunityController extends Controller
{
    /**
     * Display a listing of communities.
     */
    public function index(Request $request)
    {
        $pagination = PaginationData::fromRequest($request, 12, 50);

        $communities = Community::query()
            ->with([
                'user:id,name,avatar',
                'memberships' => fn ($query) => $query->where('user_id', $request->user()->id),
            ])
            ->withCount([
                'approvedMemberships as members_count',
                'pendingMemberships as pending_requests_count',
            ])
            ->when($request->filled('q'), function ($query) use ($request) {
                $this->applySearch($query, (string) $request->string('q')->trim());
            })
            ->latest()
            ->paginate($pagination->perPage);

        return CommunityResource::collection($communities);
    }

    /**
     * Display a single community.
     */
    public function show(Request $request, Community $community): CommunityResource
    {
        $this->authorize('view', $community);
        $this->loadCommunityState($community, $request->user()->id);

        return CommunityResource::make($community);
    }

    /**
     * Store a newly created community.
     */
    public function store(StoreCommunityRequest $request): JsonResponse
    {
        $this->authorize('create', Community::class);
        $uploadedPaths = [];

        try {
            $data = $this->validatedCommunityData($request, $uploadedPaths);
            $community = DB::transaction(function () use ($request, $data): Community {
                $community = $request->user()->createdCommunities()->create($data);
                $community->memberships()->create([
                    'user_id' => $request->user()->id,
                    'role' => 'admin',
                    'status' => 'approved',
                ]);

                return $community;
            });
        } catch (Throwable $exception) {
            MediaStorage::deleteStoredFiles($uploadedPaths);

            throw $exception;
        }

        $this->loadCommunityState($community, $request->user()->id);

        return CommunityResource::make($community)
            ->response()
            ->setStatusCode(201);
    }

    /**
     * Update an existing community.
     */
    public function update(UpdateCommunityRequest $request, Community $community): CommunityResource
    {
        $this->authorize('update', $community);
        $oldImageUrl = $community->image_url;
        $uploadedPaths = [];

        try {
            $data = $this->validatedCommunityData($request, $uploadedPaths);
            DB::transaction(fn () => $community->update($data));
        } catch (Throwable $exception) {
            MediaStorage::deleteStoredFiles($uploadedPaths);

            throw $exception;
        }

        MediaStorage::deleteStoredFiles(
            collect([$oldImageUrl])->filter()->diff([$community->image_url])->values()->all(),
        );

        $this->loadCommunityState($community, $request->user()->id);

        return CommunityResource::make($community);
    }

    /**
     * Join a public community or request access to a private community.
     */
    public function join(Request $request, Community $community): JsonResponse
    {
        $this->authorize('join', $community);

        $membership = $community->memberships()->firstOrNew([
            'user_id' => $request->user()->id,
        ]);
        $previousStatus = $membership->exists ? $membership->status : null;

        if ($membership->exists && $membership->status === 'approved') {
            $message = __('messages.communities.already_member');
        } elseif ($community->is_private) {
            $membership->fill([
                'role' => $membership->role ?: 'member',
                'status' => 'pending',
            ])->save();

            if ($previousStatus !== 'pending') {
                $this->notifyCommunityManagers(
                    $community,
                    $request->user(),
                    new CommunityJoinRequestNotification($community, $request->user()),
                );
            }

            $message = __('messages.communities.request_sent');
        } else {
            $membership->fill([
                'role' => $membership->role ?: 'member',
                'status' => 'approved',
            ])->save();

            if ($previousStatus !== 'approved') {
                $this->notifyCommunityManagers(
                    $community,
                    $request->user(),
                    new CommunityJoinedNotification($community, $request->user()),
                );
            }

            $message = __('messages.communities.joined');
        }

        $this->loadCommunityState($community, $request->user()->id);

        return response()->json([
            'message' => $message,
            'data' => CommunityResource::make($community)->resolve(),
        ]);
    }

    /**
     * Delete a community owned or administered by the current user.
     */
    public function destroy(Request $request, Community $community): JsonResponse
    {
        $this->authorize('delete', $community);

        $imageUrl = $community->image_url;
        DB::transaction(fn () => $community->delete());
        MediaStorage::deleteStoredFiles([$imageUrl]);

        return response()->json([
            'message' => __('messages.communities.deleted'),
        ]);
    }

    /**
     * Leave a community.
     */
    public function leave(Request $request, Community $community): JsonResponse
    {
        $this->authorize('leave', $community);

        $membership = $community->memberships()
            ->where('user_id', $request->user()->id)
            ->first();

        abort_unless($membership, 404);

        if ($membership->role === 'admin' && $membership->status === 'approved') {
            $approvedAdminsCount = $community->memberships()
                ->where('status', 'approved')
                ->where('role', 'admin')
                ->count();

            abort_if($approvedAdminsCount <= 1, 422, 'Le dernier admin ne peut pas quitter la communaute.');
        }

        $membership->delete();
        $this->loadCommunityState($community, $request->user()->id);

        return response()->json([
            'message' => __('messages.communities.left'),
            'data' => CommunityResource::make($community)->resolve(),
        ]);
    }

    /**
     * Display pending requests for a private community admin.
     */
    public function pendingRequests(Request $request, Community $community)
    {
        $this->authorize('manageRequests', $community);
        $pagination = PaginationData::fromRequest($request, 20, 50);

        $pendingRequests = $community->pendingMemberships()
            ->with('user:id,name,email,avatar,city,country')
            ->latest()
            ->paginate($pagination->perPage);

        return CommunityMembershipRequestResource::collection($pendingRequests);
    }

    /**
     * Approve a pending community request.
     */
    public function approveRequest(
        Request $request,
        Community $community,
        CommunityMember $membership,
    ): JsonResponse {
        $this->authorize('manageRequests', $community);
        $this->ensurePendingMembership($community, $membership);

        $membership->loadMissing('user');
        $membership->update([
            'status' => 'approved',
            'role' => $membership->role ?: 'member',
        ]);

        if ($membership->user) {
            $membership->user->notify(new CommunityRequestApprovedNotification($community));
        }

        $this->loadCommunityState($community, $request->user()->id);
        $membership->refresh()->load('user:id,name,email,avatar,city,country');

        return response()->json([
            'message' => __('messages.communities.request_approved'),
            'data' => CommunityMembershipRequestResource::make($membership)->resolve(),
            'community' => CommunityResource::make($community)->resolve(),
        ]);
    }

    /**
     * Reject a pending community request.
     */
    public function rejectRequest(
        Request $request,
        Community $community,
        CommunityMember $membership,
    ): JsonResponse {
        $this->authorize('manageRequests', $community);
        $this->ensurePendingMembership($community, $membership);

        $membership->loadMissing('user:id,name,email,avatar,city,country');
        $membershipData = CommunityMembershipRequestResource::make($membership)->resolve();

        if ($membership->user) {
            $membership->user->notify(new CommunityRequestRejectedNotification($community));
        }

        $membership->delete();
        $this->loadCommunityState($community, $request->user()->id);

        return response()->json([
            'message' => __('messages.communities.request_rejected'),
            'data' => $membershipData,
            'community' => CommunityResource::make($community)->resolve(),
        ]);
    }

    /**
     * Load the relations and counters needed by the frontend.
     */
    protected function loadCommunityState(Community $community, int $userId): void
    {
        $community->load([
            'user:id,name,avatar',
            'memberships' => fn ($query) => $query->where('user_id', $userId),
        ])->loadCount([
            'approvedMemberships as members_count',
            'pendingMemberships as pending_requests_count',
        ]);
    }

    /**
     * Extract validated community fields and store an uploaded local media file when present.
     */
    protected function validatedCommunityData(
        StoreCommunityRequest|UpdateCommunityRequest $request,
        array &$uploadedPaths = [],
    ): array
    {
        $data = $request->validated();
        unset($data['image_file']);

        if ($request->hasFile('image_file')) {
            $data['image_url'] = MediaStorage::storeUploadedFile(
                $request->file('image_file'),
                'communities'
            );
            $uploadedPaths[] = $data['image_url'];
        }

        return $data;
    }

    /**
     * Apply an indexed community search.
     *
     * @param  Builder<Community>  $query
     */
    protected function applySearch(Builder $query, string $search): void
    {
        if ($search === '') {
            return;
        }

        $driver = $query->getModel()->getConnection()->getDriverName();

        if (in_array($driver, ['mysql', 'mariadb'], true)) {
            $query->whereFullText(
                ['name', 'description'],
                $this->booleanFullTextQuery($search),
                ['mode' => 'boolean'],
            );

            return;
        }

        $prefixSearch = $this->prefixSearchTerm($search);
        $query->where(function (Builder $innerQuery) use ($prefixSearch): void {
            $innerQuery
                ->where('name', 'like', $prefixSearch)
                ->orWhere('description', 'like', $prefixSearch);
        });
    }

    protected function booleanFullTextQuery(string $search): string
    {
        $terms = preg_split('/\s+/', trim($search)) ?: [];

        return collect($terms)
            ->map(fn (string $term): string => trim($term, '+-~*<>()"'))
            ->filter()
            ->map(fn (string $term): string => '+'.$term.'*')
            ->implode(' ');
    }

    protected function prefixSearchTerm(string $value): string
    {
        return addcslashes($value, '\\%_').'%';
    }

    protected function notifyCommunityManagers(
        Community $community,
        User $actor,
        object $notification,
    ): void {
        $managerIds = $community->memberships()
            ->where('status', 'approved')
            ->where('role', 'admin')
            ->pluck('user_id')
            ->push($community->user_id)
            ->unique()
            ->filter(fn ($userId): bool => (int) $userId !== (int) $actor->id)
            ->values();

        if ($managerIds->isEmpty()) {
            return;
        }

        User::query()
            ->whereKey($managerIds)
            ->get()
            ->each(fn (User $manager): mixed => $manager->notify($notification));
    }

    /**
     * Ensure the pending membership belongs to the given community.
     */
    protected function ensurePendingMembership(
        Community $community,
        CommunityMember $membership,
    ): void {
        abort_if(
            $membership->community_id !== $community->id || $membership->status !== 'pending',
            404,
            'Demande introuvable.',
        );
    }
}
