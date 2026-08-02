<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ModerateUserRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Services\Admin\ModerationLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class AdminUserModerationController extends Controller
{
    public function __construct(
        private readonly ModerationLogger $logger,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $users = User::query()
            ->withCount(['followers', 'following'])
            ->withExists([
                'followers as is_followed_by_viewer' => fn ($followers) => $followers
                    ->where('follower_user_id', $request->user()->id),
            ])
            ->when($request->filled('q'), function ($query) use ($request): void {
                $term = '%'.addcslashes((string) $request->string('q')->trim(), '\\%_').'%';
                $query->where(function ($inner) use ($term): void {
                    $inner
                        ->where('name', 'like', $term)
                        ->orWhere('email', 'like', $term)
                        ->orWhere('phone', 'like', $term)
                        ->orWhere('city', 'like', $term)
                        ->orWhere('country', 'like', $term);
                });
            })
            ->latest()
            ->limit((int) min(max($request->integer('limit', 100), 1), 200))
            ->get();

        return UserResource::collection($users);
    }

    public function updateSuspension(ModerateUserRequest $request, User $user): JsonResponse
    {
        $this->preventSelfModeration($request, $user);

        $action = $request->validated('action');
        abort_unless(in_array($action, ['suspend', 'unsuspend'], true), 422);

        if ($action === 'suspend') {
            $user->forceFill([
                'is_suspended' => true,
                'suspended_at' => now(),
                'suspended_reason' => $request->validated('reason'),
            ])->save();
        } else {
            $user->forceFill([
                'is_suspended' => false,
                'suspended_at' => null,
                'suspended_reason' => null,
            ])->save();
        }

        $this->logger->log($request, $action, $user, $request->validated('reason'));

        return response()->json([
            'message' => __('messages.admin.user_moderation_updated'),
            'user' => UserResource::make($this->loadSocialSignals($user->refresh(), $request->user()->id)),
        ]);
    }

    public function updateBan(ModerateUserRequest $request, User $user): JsonResponse
    {
        $this->preventSelfModeration($request, $user);

        $action = $request->validated('action');
        abort_unless(in_array($action, ['ban', 'unban'], true), 422);

        if ($action === 'ban') {
            $user->forceFill([
                'banned_at' => now(),
                'banned_reason' => $request->validated('reason'),
                'is_suspended' => true,
                'suspended_at' => $user->suspended_at ?? now(),
                'suspended_reason' => $request->validated('reason'),
            ])->save();

            $user->tokens()->delete();
        } else {
            $user->forceFill([
                'banned_at' => null,
                'banned_reason' => null,
            ])->save();
        }

        $this->logger->log($request, $action, $user, $request->validated('reason'));

        return response()->json([
            'message' => __('messages.admin.user_moderation_updated'),
            'user' => UserResource::make($this->loadSocialSignals($user->refresh(), $request->user()->id)),
        ]);
    }

    private function preventSelfModeration(Request $request, User $user): void
    {
        abort_if($request->user()->is($user), 422, __('messages.admin.self_moderation_forbidden'));
    }

    private function loadSocialSignals(User $user, int $viewerId): User
    {
        return $user
            ->loadCount(['followers', 'following'])
            ->loadExists([
                'followers as is_followed_by_viewer' => fn ($followers) => $followers
                    ->where('follower_user_id', $viewerId),
            ]);
    }
}
