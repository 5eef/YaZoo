<?php

namespace App\Policies;

use App\Models\Community;
use App\Models\User;

class CommunityPolicy
{
    /**
     * Determine whether the user can create a community.
     */
    public function create(User $user): bool
    {
        return $user->exists;
    }

    /**
     * Determine whether the user can view a community.
     */
    public function view(User $user, Community $community): bool
    {
        return $user->exists && $community->isVisibleTo($user);
    }

    /**
     * Determine whether the user can update a community.
     */
    public function update(User $user, Community $community): bool
    {
        if ($user->is($community->user)) {
            return true;
        }

        $membership = $community->memberships()
            ->where('user_id', $user->id)
            ->where('status', 'approved')
            ->first();

        return $membership?->role === 'admin';
    }

    /**
     * Determine whether the user can delete a community.
     */
    public function delete(User $user, Community $community): bool
    {
        return $this->update($user, $community) || (bool) $user->is_admin;
    }

    /**
     * Determine whether the user can join the community.
     */
    public function join(User $user, Community $community): bool
    {
        return $user->exists && $community->exists;
    }

    /**
     * Determine whether the user can leave the community.
     */
    public function leave(User $user, Community $community): bool
    {
        return $community->memberships()
            ->where('user_id', $user->id)
            ->exists();
    }

    /**
     * Determine whether the user can manage membership requests.
     */
    public function manageRequests(User $user, Community $community): bool
    {
        return $this->update($user, $community);
    }
}
