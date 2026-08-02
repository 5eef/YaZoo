<?php

namespace App\Http\Resources\Marketplace;

use App\Models\Animal;
use App\Services\MarketplacePublishingResolver;
use App\Support\MarketplaceContact;
use App\Support\MarketplaceMedia;
use App\Support\MediaStorage;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Animal
 */
class AnimalResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $canManage = ($request->user()?->is_admin ?? false) || ($request->user()?->is($this->user) ?? false);
        $assets = $this->relationLoaded('mediaAssets') ? $this->mediaAssets : collect();
        $professionalBadge = $this->user
            ? app(MarketplacePublishingResolver::class)->badgeFor($this->user, 'animals')
            : null;

        return [
            'id' => $this->id,
            'name' => $this->name,
            'category' => $this->category,
            'type' => $this->type,
            'breed' => $this->breed,
            'age' => $this->age,
            'sex' => $this->sex,
            'location' => $this->location,
            ...MarketplaceContact::payload($this->resource, $request, $this->isPubliclyVisible()),
            'photoAssetId' => $this->when($canManage, $assets->firstWhere('role', 'photo_url')?->id),
            'photoUrl' => MarketplaceMedia::resolveUrl($this->photo_url),
            'galleryAssetIds' => $this->when(
                $canManage,
                $assets->where('role', 'gallery')->pluck('id')->values()->all(),
            ),
            'galleryUrls' => MarketplaceMedia::resolveUrls($this->gallery_urls),
            'price' => $this->price !== null ? (float) $this->price : null,
            'isForAdoption' => (bool) $this->is_for_adoption,
            'listingStatus' => $this->listing_status,
            'description' => $this->description,
            'acceptsAnimalRules' => (bool) $this->accepts_animal_rules,
            'sellerType' => $this->seller_type ?? 'individual',
            'origin' => $this->origin,
            'identificationNumber' => $this->when($canManage, $this->identification_number),
            'healthCertificateAvailable' => filled($this->health_certificate_path),
            'vaccinationBookAvailable' => filled($this->vaccination_book_path),
            'onssaAuthorizationNumber' => $this->when($canManage, $this->onssa_authorization_number),
            'legalStatus' => $this->legal_status ?? Animal::LEGAL_STATUS_PENDING_REVIEW,
            'documentaryStatus' => $this->documentaryStatus(),
            'moderationNote' => $this->when(
                $canManage,
                $this->moderation_note,
            ),
            'moderatedAt' => $this->moderated_at?->toISOString(),
            'averageRating' => $this->average_rating !== null ? round((float) $this->average_rating, 1) : null,
            'reviewsCount' => (int) ($this->reviews_count ?? 0),
            'favoritesCount' => (int) ($this->favorites_count ?? 0),
            'isFavorited' => (bool) ($this->is_favorited ?? false),
            'createdAt' => $this->created_at?->toISOString(),
            'author' => [
                'id' => $this->user?->id,
                'name' => $this->user?->name,
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

    protected function documentaryStatus(): string
    {
        return match ($this->legal_status) {
            'approved' => 'documents_verified_by_yazoo',
            'rejected', 'suspended' => 'rejected',
            'pending_review' => 'under_review',
            default => ($this->hasDeclaredDocuments() ? 'under_review' : 'unverified'),
        };
    }

    protected function hasDeclaredDocuments(): bool
    {
        return filled($this->health_certificate_path)
            || filled($this->vaccination_book_path)
            || filled($this->onssa_authorization_number)
            || filled($this->identification_number)
            || in_array($this->seller_type, ['professional', 'association'], true);
    }
}
