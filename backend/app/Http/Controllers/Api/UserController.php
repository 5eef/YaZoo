<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\User\StoreUserRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Services\UserService;
use Illuminate\Http\Request;

class UserController extends Controller
{
    public function __construct(
        protected UserService $users,
    ) {}

    public function store(StoreUserRequest $request)
    {
        return UserResource::make($this->users->create($request->validated()))
            ->response()
            ->setStatusCode(201);
    }

    public function suggestions(Request $request)
    {
        $viewer = $request->user();
        $limit = min(max((int) $request->integer('limit', 10), 1), 20);

        $users = User::query()
            ->whereKeyNot($viewer->id)
            ->withCount(['followers', 'following'])
            ->withExists([
                'followers as is_followed_by_viewer' => fn ($followers) => $followers
                    ->where('follower_user_id', $viewer->id),
            ])
            ->latest()
            ->limit($limit)
            ->get();

        return UserResource::collection($users);
    }
}
