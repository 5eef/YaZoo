<?php

namespace App\Http\Resources\Marketplace;

use App\Models\Product;
use App\Services\MarketplacePublishingResolver;
use App\Support\MarketplaceMedia;
use App\Support\MediaStorage;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Product
 */
class ProductResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $professionalBadge = $this->user
            ? app(MarketplacePublishingResolver::class)->badgeFor($this->user, 'products')
            : null;

        return [
            'id' => $this->id,
            'name' => $this->name,
            'category' => $this->category,
            'description' => $this->description,
            'price' => (float) $this->price,
            'imagePath' => $this->image_url,
            'imageUrl' => MarketplaceMedia::resolveUrl($this->image_url),
            'galleryPaths' => $this->gallery_urls ?? [],
            'galleryUrls' => MarketplaceMedia::resolveUrls($this->gallery_urls),
            'location' => $this->location,
            'stock' => $this->stock,
            'listingStatus' => $this->listing_status,
            'conditionStatus' => $this->condition_status,
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
            'author' => [
                'id' => $this->user?->id,
                'name' => $this->user?->name,
                'email' => $this->user?->publicEmail(),
                'phone' => $this->user?->phone,
                'isPhoneVerified' => $this->user?->hasVerifiedPhone() ?? false,
                'avatar' => MediaStorage::resolveUrl($this->user?->avatar),
                'city' => $this->user?->city,
                'country' => $this->user?->country,
                'isProfessionalVerified' => $professionalBadge !== null,
                'professionalBadge' => $professionalBadge,
                'professionalVerificationStatus' => $this->user?->professionalVerificationStatus(),
            ],
            'isOwner' => $request->user()?->is($this->user) ?? false,
        ];
    }
}
