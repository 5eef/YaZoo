<?php

namespace App\Policies;

use App\Models\User;
use App\Models\Veterinarian;
use App\Services\MarketplacePublishingResolver;

class VeterinarianPolicy
{
    public function __construct(
        private readonly MarketplacePublishingResolver $publishing,
    ) {}

    public function create(User $user): bool
    {
        return $this->publishing->canPublishTo($user, 'veterinarians');
    }

    public function update(User $user, Veterinarian $veterinarian): bool
    {
        return (bool) $user->is_admin
            || (
                $user->is($veterinarian->user)
                && $this->publishing->canPublishTo($user, 'veterinarians')
            );
    }

    public function delete(User $user, Veterinarian $veterinarian): bool
    {
        return $user->is($veterinarian->user) || (bool) $user->is_admin;
    }
}
