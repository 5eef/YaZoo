<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Hash;

class UserService
{
    public function paginate(int $perPage = 15, ?int $viewerId = null): LengthAwarePaginator
    {
        return User::query()
            ->withCount(['followers', 'following'])
            ->when($viewerId, fn ($query) => $query->withExists([
                'followers as is_followed_by_viewer' => fn ($followers) => $followers
                    ->where('follower_user_id', $viewerId),
            ]))
            ->latest()
            ->paginate($perPage);
    }

    /**
     * @param  array<string, mixed>  $validated
     */
    public function create(array $validated): User
    {
        $isAdmin = (bool) ($validated['is_admin'] ?? false);
        unset($validated['is_admin']);

        $user = new User;
        $user->fill([
            ...$validated,
            'password' => Hash::make((string) $validated['password']),
        ]);
        $user->forceFill(['is_admin' => $isAdmin])->save();

        return $user;
    }
}
