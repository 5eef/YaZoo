<?php

namespace App\Http\Controllers\Api;

use App\DTOs\PaginationData;
use App\Http\Controllers\Controller;
use App\Http\Requests\Profile\UpdateProfileRequest;
use App\Http\Resources\Profile\UserProfileResource;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Notifications\UserFollowedNotification;
use App\Services\MediaAssetService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Throwable;

class ProfileController extends Controller
{
    public function __construct(
        private readonly MediaAssetService $mediaAssets,
    ) {}

    /**
     * Display the given user's public profile.
     */
    public function show(string $user): UserProfileResource
    {
        $user = $this->resolveUser($user);
        $this->loadProfileAggregates($user);

        return UserProfileResource::make($user);
    }

    /**
     * Update the given user's profile.
     */
    public function update(UpdateProfileRequest $request, string $user): UserProfileResource
    {
        $user = $this->resolveUser($user);
        $validated = $request->validated();
        $updates = collect($validated)
            ->except([
                'avatar_file',
                'cover_photo_file',
                'remove_avatar',
                'remove_cover_photo',
            ])
            ->all();
        $newAvatarAsset = null;
        $newCoverAsset = null;

        if ($request->boolean('remove_avatar') && ! $request->hasFile('avatar_file')) {
            $updates['avatar'] = null;
        }

        if ($request->boolean('remove_cover_photo') && ! $request->hasFile('cover_photo_file')) {
            $updates['cover_photo'] = null;
        }

        try {
            if ($request->hasFile('avatar_file')) {
                $newAvatarAsset = $this->mediaAssets->registerUpload(
                    $user,
                    $request->file('avatar_file'),
                    'profiles/avatars',
                    'image',
                );
                $updates['avatar'] = $newAvatarAsset->path;
            }

            if ($request->hasFile('cover_photo_file')) {
                $newCoverAsset = $this->mediaAssets->registerUpload(
                    $user,
                    $request->file('cover_photo_file'),
                    'profiles/covers',
                    'image',
                );
                $updates['cover_photo'] = $newCoverAsset->path;
            }

            $emailChanged = isset($updates['email'])
                && strcasecmp((string) $updates['email'], (string) $user->email) !== 0;

            if ($emailChanged) {
                $updates['email_verified_at'] = null;
            }

            DB::transaction(function () use ($user, $updates, $emailChanged): void {
                $user->forceFill($updates)->save();

                if ($emailChanged) {
                    $user->tokens()->delete();
                }
            });

            if (array_key_exists('avatar', $updates)) {
                $this->mediaAssets->replaceRole($user, $user, 'avatar', $newAvatarAsset);
            }

            if (array_key_exists('cover_photo', $updates)) {
                $this->mediaAssets->replaceRole($user, $user, 'cover_photo', $newCoverAsset);
            }
        } catch (Throwable $exception) {
            if ($newAvatarAsset) {
                $this->mediaAssets->discardUnattached($newAvatarAsset, $user);
            }
            if ($newCoverAsset) {
                $this->mediaAssets->discardUnattached($newCoverAsset, $user);
            }

            throw $exception;
        }

        $this->loadProfileAggregates($user);

        return UserProfileResource::make($user);
    }

    public function follow(Request $request, string $user): JsonResponse
    {
        $user = $this->resolveUser($user);
        abort_if($request->user()->is($user), 422, 'Vous ne pouvez pas suivre votre propre profil.');

        $wasFollowing = $request->user()
            ->following()
            ->whereKey($user->id)
            ->exists();

        $request->user()->following()->syncWithoutDetaching([$user->id]);

        if (! $wasFollowing) {
            $user->notify(new UserFollowedNotification($request->user()));
        }

        $this->loadProfileAggregates($user);

        return response()->json([
            'message' => __('messages.profile.followed'),
            'data' => UserProfileResource::make($user)->resolve($request),
        ]);
    }

    public function unfollow(Request $request, string $user): JsonResponse
    {
        $user = $this->resolveUser($user);
        abort_if($request->user()->is($user), 422, 'Vous ne pouvez pas vous desabonner de votre propre profil.');

        $request->user()->following()->detach($user->id);
        $this->loadProfileAggregates($user);

        return response()->json([
            'message' => __('messages.profile.unfollowed'),
            'data' => UserProfileResource::make($user)->resolve($request),
        ]);
    }

    public function followers(Request $request, string $user)
    {
        $user = $this->resolveUser($user);
        $pagination = PaginationData::fromRequest($request, 24, 50);

        $followers = $user->followers()
            ->withCount(['followers', 'following'])
            ->withExists([
                'followers as is_followed_by_viewer' => fn ($followers) => $followers
                    ->where('follower_user_id', $request->user()->id),
            ])
            ->orderBy('users.name')
            ->paginate($pagination->perPage);

        return UserResource::collection($followers);
    }

    public function following(Request $request, string $user)
    {
        $user = $this->resolveUser($user);
        $pagination = PaginationData::fromRequest($request, 24, 50);

        $following = $user->following()
            ->withCount(['followers', 'following'])
            ->withExists([
                'followers as is_followed_by_viewer' => fn ($followers) => $followers
                    ->where('follower_user_id', $request->user()->id),
            ])
            ->orderBy('users.name')
            ->paginate($pagination->perPage);

        return UserResource::collection($following);
    }

    private function loadProfileAggregates(User $user): void
    {
        $relations = ['posts', 'animals', 'products', 'serviceListings', 'veterinarians', 'followers', 'following'];

        if (Schema::hasTable('reservation_reviews')) {
            $relations['reviewsReceived'] = fn ($query) => $query->publiclyVisible();
        }

        $user->loadCount($relations);

        if (Schema::hasTable('reservation_reviews')) {
            $user->loadAvg(['reviewsReceived' => fn ($query) => $query->publiclyVisible()], 'rating');
        }

        if (Schema::hasTable('professional_verifications')) {
            $user->load('latestProfessionalVerification');
        }

        if ($viewer = request()->user()) {
            $user->loadExists([
                'followers as is_followed_by_viewer' => fn ($followers) => $followers
                    ->where('follower_user_id', $viewer->id),
            ]);
        }
    }

    private function resolveUser(string $user): User
    {
        return User::query()->whereKey($user)->firstOr(
            fn () => abort(Response::HTTP_NOT_FOUND, __('messages.profile.not_found')),
        );
    }
}
