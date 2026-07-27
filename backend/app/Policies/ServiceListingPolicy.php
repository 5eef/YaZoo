<?php

namespace App\Policies;

use App\Models\ServiceListing;
use App\Models\User;
use App\Services\MarketplacePublishingResolver;

class ServiceListingPolicy
{
    public function __construct(
        private readonly MarketplacePublishingResolver $publishing,
    ) {}

    public function create(User $user, ?string $serviceType = null): bool
    {
        return $this->publishing->canPublishTo($user, 'services', $serviceType);
    }

    public function update(User $user, ServiceListing $service): bool
    {
        return (bool) $user->is_admin
            || (
                $user->is($service->user)
                && $this->publishing->canPublishTo($user, 'services', $service->type)
            );
    }

    public function delete(User $user, ServiceListing $service): bool
    {
        return $user->is($service->user) || (bool) $user->is_admin;
    }

    public function reserve(User $user, ServiceListing $service): bool
    {
        return ! $user->is($service->user);
    }
}
