<?php

namespace App\Policies;

use App\Models\Animal;
use App\Models\User;
use App\Services\MarketplacePublishingResolver;

class AnimalPolicy
{
    public function __construct(
        private readonly MarketplacePublishingResolver $publishing,
    ) {}

    /**
     * Determine whether the user can create a listing.
     */
    public function create(User $user): bool
    {
        return $this->publishing->canPublishTo($user, 'animals');
    }

    /**
     * Determine whether the user can update the listing.
     */
    public function update(User $user, Animal $animal): bool
    {
        return (bool) $user->is_admin
            || (
                $user->is($animal->user)
                && $this->publishing->canPublishTo($user, 'animals')
            );
    }

    /**
     * Determine whether the user can delete the listing.
     */
    public function delete(User $user, Animal $animal): bool
    {
        return $user->is($animal->user) || (bool) $user->is_admin;
    }

    /**
     * Determine whether the user can reserve the listing.
     */
    public function reserve(User $user, Animal $animal): bool
    {
        return ! $user->is($animal->user);
    }
}
