<?php

namespace App\Policies;

use App\Models\Product;
use App\Models\User;
use App\Services\MarketplacePublishingResolver;

class ProductPolicy
{
    public function __construct(
        private readonly MarketplacePublishingResolver $publishing,
    ) {}

    /**
     * Determine whether the user can create a product listing.
     */
    public function create(User $user): bool
    {
        return $this->publishing->canPublishTo($user, 'products');
    }

    /**
     * Determine whether the user can update the listing.
     */
    public function update(User $user, Product $product): bool
    {
        return (bool) $user->is_admin
            || (
                $user->is($product->user)
                && $this->publishing->canPublishTo($user, 'products')
            );
    }

    /**
     * Determine whether the user can delete the listing.
     */
    public function delete(User $user, Product $product): bool
    {
        return $user->is($product->user) || (bool) $user->is_admin;
    }

    /**
     * Determine whether the user can reserve the product.
     */
    public function reserve(User $user, Product $product): bool
    {
        return ! $user->is($product->user);
    }
}
