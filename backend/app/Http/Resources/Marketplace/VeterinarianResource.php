<?php

namespace App\Http\Resources\Marketplace;

use App\Models\Veterinarian;
use App\Services\MarketplacePublishingResolver;
use App\Support\MarketplaceMedia;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Veterinarian
 */
class VeterinarianResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $professionalBadge = $this->user
            ? app(MarketplacePublishingResolver::class)->badgeFor($this->user, 'veterinarians')
            : null;

        return [
            'id' => $this->id,
            'name' => $this->name,
            'clinicName' => $this->clinic_name,
            'description' => $this->description,
            'city' => $this->city,
            'address' => $this->address,
            'phone' => $this->phone,
            'whatsapp' => $this->whatsapp,
            'email' => $this->email,
            'specialties' => $this->specialties ?? [],
            'workingHours' => $this->working_hours ?? [],
            'imagePath' => $this->image_path,
            'imageUrl' => MarketplaceMedia::resolveUrl($this->image_path),
            'latitude' => $this->latitude !== null ? (float) $this->latitude : null,
            'longitude' => $this->longitude !== null ? (float) $this->longitude : null,
            'locationUrl' => $this->location_url,
            'isActive' => (bool) $this->is_active,
            'averageRating' => null,
            'reviewsCount' => 0,
            'favoritesCount' => (int) ($this->favorites_count ?? 0),
            'isFavorited' => (bool) ($this->is_favorited ?? false),
            'createdAt' => $this->created_at?->toISOString(),
            'owner' => [
                'id' => $this->user?->id,
                'name' => $this->user?->name,
                'isPhoneVerified' => $this->user?->hasVerifiedPhone() ?? false,
                'isProfessionalVerified' => $professionalBadge !== null,
                'professionalBadge' => $professionalBadge,
                'professionalVerificationStatus' => $this->user?->professionalVerificationStatus(),
            ],
            'isOwner' => $request->user()?->is($this->user) ?? false,
        ];
    }
}
