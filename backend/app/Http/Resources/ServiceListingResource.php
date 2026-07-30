<?php

namespace App\Http\Resources;

use App\Models\ServiceListing;
use App\Services\MarketplacePublishingResolver;
use App\Support\MarketplaceContact;
use App\Support\MediaStorage;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin ServiceListing
 */
class ServiceListingResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $professionalBadge = $this->user
            ? app(MarketplacePublishingResolver::class)->badgeFor($this->user, 'services', $this->type)
            : null;

        return [
            'id' => $this->id,
            'type' => $this->type,
            'title' => $this->title,
            'description' => $this->description,
            'animalTypes' => $this->animal_types ?? [],
            'city' => $this->city,
            'address' => $this->address,
            'price' => $this->price !== null ? (float) $this->price : null,
            'priceType' => $this->price_type,
            'availability' => $this->availability ?? [],
            ...MarketplaceContact::payload($this->resource, $request, $this->isPubliclyVisible()),
            'status' => $this->status,
            'media' => $this->media ?? [],
            'viewsCount' => $this->views_count,
            'reservationsCount' => $this->reservations_count,
            'moderationStatus' => $this->moderation_status ?? 'active',
            'moderationNote' => $this->when(
                ($request->user()?->is_admin ?? false) || ($request->user()?->is($this->user) ?? false),
                $this->moderation_note,
            ),
            'averageRating' => $this->average_rating !== null ? round((float) $this->average_rating, 1) : null,
            'reviewsCount' => (int) ($this->reviews_count ?? 0),
            'favoritesCount' => (int) ($this->favorites_count ?? 0),
            'isFavorited' => (bool) ($this->is_favorited ?? false),
            'createdAt' => $this->created_at?->toISOString(),
            'provider' => [
                'id' => $this->user?->id,
                'name' => $this->user?->name,
                'avatar' => MediaStorage::resolveUrl($this->user?->avatar),
                'city' => $this->user?->city,
                'country' => $this->user?->country,
                'isPhoneVerified' => $this->user?->hasVerifiedPhone() ?? false,
                'isProfessionalVerified' => $professionalBadge !== null,
                'professionalBadge' => $professionalBadge,
                'professionalVerificationStatus' => $this->user?->professionalVerificationStatus(),
            ],
            'isOwner' => $request->user()?->is($this->user) ?? false,
        ];
    }
}
