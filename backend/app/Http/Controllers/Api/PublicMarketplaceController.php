<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Animal;
use App\Models\Product;
use App\Models\ServiceListing;
use App\Models\Veterinarian;
use App\Models\VeterinarianAppointment;
use App\Services\MarketplacePublishingResolver;
use App\Services\ShowcaseAvailability;
use App\Support\MarketplaceMedia;
use App\Support\MediaStorage;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PublicMarketplaceController extends Controller
{
    public function __construct(
        private readonly MarketplacePublishingResolver $publishing,
    ) {}

    public function __invoke(Request $request): JsonResponse
    {
        $perSection = min(max($request->integer('per_section', 6), 1), 12);

        return response()->json([
            'data' => [
                'animals' => config('features.animal_listings_public') ? $this->sectionItems('animals', $perSection) : [],
                'products' => config('features.product_marketplace') ? $this->sectionItems('products', $perSection) : [],
                'services' => $this->sectionItems('services', $perSection),
                'veterinarians' => $this->sectionItems('veterinarians', $perSection),
            ],
        ]);
    }

    public function index(Request $request, string $section): JsonResponse
    {
        abort_if($section === 'products' && ! config('features.product_marketplace'), 404);
        abort_if($section === 'animals' && ! config('features.animal_listings_public'), 404);
        $page = max($request->integer('page', 1), 1);
        $perPage = min(max($request->integer('per_page', 12), 1), 24);
        $query = $this->sectionQuery($section);
        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:120'],
            'city' => ['nullable', 'string', 'max:100'],
            'specialty' => ['nullable', 'string', 'max:100'],
        ]);
        if (in_array($section, ['veterinarians', 'services'], true)) {
            if (filled($filters['city'] ?? null)) {
                $query->where('city', 'like', '%'.$filters['city'].'%');
            }
            if (filled($filters['search'] ?? null)) {
                $titleColumn = $section === 'veterinarians' ? 'name' : 'title';
                $term = '%'.$filters['search'].'%';
                $query->where(fn ($inner) => $inner->where($titleColumn, 'like', $term)->orWhere('description', 'like', $term));
            }
            if ($section === 'veterinarians' && filled($filters['specialty'] ?? null)) {
                $query->where('specialties', 'like', '%'.$filters['specialty'].'%');
            }
        }
        $total = (clone $query)->count();
        $items = $query
            ->forPage($page, $perPage)
            ->get()
            ->map(fn (Model $listing): array => $this->sectionPayload($section, $listing))
            ->values();

        return response()->json([
            'data' => $items,
            'meta' => [
                'currentPage' => $page,
                'lastPage' => max((int) ceil($total / $perPage), 1),
                'perPage' => $perPage,
                'total' => $total,
            ],
        ]);
    }

    public function show(string $section, int $listing): JsonResponse
    {
        abort_if($section === 'animals' && ! config('features.animal_listings_public'), 404);
        $item = $this->sectionQuery($section)->findOrFail($listing);

        $payload = $this->sectionPayload($section, $item);
        if ($item instanceof Veterinarian) {
            // Only fields intended for a public professional listing. Account
            // contacts, verification documents and appointments never leave here.
            $payload['specialties'] = collect($item->specialties ?? [])->map(fn ($value) => $this->sanitizePublicText($value))->filter()->values();
            $payload['workingHours'] = $item->working_hours ?? [];
            $payload['ownerId'] = $item->user_id;
            $payload['services'] = ServiceListing::query()->where('user_id', $item->user_id)
                ->where('status', 'active')->where('moderation_status', 'active')->latest()->limit(12)
                ->get(['id', 'title'])->map(fn ($service) => ['id' => $service->id, 'title' => $this->sanitizePublicText($service->title)]);
            $payload['timezone'] = 'Africa/Casablanca';
            // Address/location have no publication consent flag in the current
            // model; expose them only for explicitly fictitious showcase data.
            $authorizedDemo = in_array($item->user?->email, ShowcaseAvailability::EMAILS, true)
                && str_contains($item->name, 'DEMO') && str_contains($item->description, 'fictif');
            $payload['address'] = $authorizedDemo ? $this->sanitizePublicText($item->address) : null;
            $payload['latitude'] = $authorizedDemo ? $item->latitude : null;
            $payload['longitude'] = $authorizedDemo ? $item->longitude : null;
            $payload['availability'] = $item->availabilitySlots()
                ->where('starts_at', '>', now())->where('starts_at', '<=', now()->addDays(14))
                ->withExists(['appointments as occupied' => fn ($query) => $query->whereIn('status', VeterinarianAppointment::ACTIVE_STATUSES)])
                ->orderBy('starts_at')->limit(100)->get()
                ->map(fn ($slot) => [
                    'id' => $slot->id,
                    'startsAt' => $slot->starts_at->toISOString(),
                    'endsAt' => $slot->ends_at->toISOString(),
                    'isAvailable' => $slot->is_available && ! $slot->occupied,
                ]);
            $reviews = $item->reviews()->published();
            $payload['reviewsCount'] = (clone $reviews)->count();
            $payload['averageRating'] = (clone $reviews)->avg('rating');
            $payload['reviews'] = $reviews->latest()->limit(10)->get(['rating', 'comment', 'created_at'])
                ->map(fn ($review) => ['rating' => $review->rating, 'comment' => $this->sanitizePublicText($review->comment)]);
        }

        return response()->json([
            'data' => $payload,
        ]);
    }

    private function sectionItems(string $section, int $limit)
    {
        return $this->sectionQuery($section)
            ->limit($limit)
            ->get()
            ->map(fn (Model $listing): array => $this->sectionPayload($section, $listing))
            ->values();
    }

    private function sectionQuery(string $section): Builder
    {
        return match ($section) {
            'animals' => Animal::query()
                ->select([
                    'id',
                    'user_id',
                    'name',
                    'type',
                    'breed',
                    'description',
                    'price',
                    'photo_url',
                    'is_for_adoption',
                    'listing_status',
                    'created_at',
                ])
                ->with($this->professionalVerificationRelations())
                ->where('legal_status', 'approved')
                ->whereIn('listing_status', ['available', 'reserved'])
                ->latest(),
            'products' => Product::query()
                ->select([
                    'id',
                    'user_id',
                    'name',
                    'category',
                    'description',
                    'price',
                    'image_url',
                    'condition_status',
                    'created_at',
                ])
                ->with($this->professionalVerificationRelations())
                ->where('moderation_status', 'active')
                ->whereIn('listing_status', ['available', 'reserved'])
                ->where('stock', '>', 0)
                ->latest(),
            'services' => ServiceListing::query()
                ->select([
                    'id',
                    'user_id',
                    'title',
                    'type',
                    'description',
                    'city',
                    'price',
                    'price_type',
                    'media',
                    'created_at',
                ])
                ->with($this->professionalVerificationRelations())
                ->where('status', 'active')
                ->where('moderation_status', 'active')
                ->latest(),
            'veterinarians' => Veterinarian::query()
                ->select([
                    'id',
                    'user_id',
                    'name',
                    'clinic_name',
                    'description',
                    'city',
                    'image_path',
                    'specialties',
                    'working_hours',
                    'address',
                    'latitude',
                    'longitude',
                    'created_at',
                ])
                ->with($this->professionalVerificationRelations())
                ->where('is_active', true)
                ->where('moderation_status', 'active')
                ->latest(),
        };
    }

    private function sectionPayload(string $section, Model $listing): array
    {
        return match ($section) {
            'animals' => $this->animalPayload($listing),
            'products' => $this->productPayload($listing),
            'services' => $this->servicePayload($listing),
            'veterinarians' => $this->veterinarianPayload($listing),
        };
    }

    private function animalPayload(Animal $animal): array
    {
        return $this->basePayload(
            $animal,
            'animal',
            $animal->name,
            collect([$animal->type, $animal->breed])->filter()->join(' · '),
            $animal->description,
            $animal->user?->city,
            $animal->is_for_adoption ? null : $animal->price,
            MarketplaceMedia::resolveUrl($animal->photo_url),
            $animal->is_for_adoption ? 'adoption' : $animal->listing_status,
            'animals',
        );
    }

    private function productPayload(Product $product): array
    {
        return $this->basePayload(
            $product,
            'product',
            $product->name,
            $product->category,
            $product->description,
            $product->user?->city,
            $product->price,
            MarketplaceMedia::resolveUrl($product->image_url),
            $product->condition_status,
            'products',
        );
    }

    private function servicePayload(ServiceListing $service): array
    {
        $firstMedia = collect($service->media ?? [])->first();

        return $this->basePayload(
            $service,
            'service',
            $service->title,
            $service->type,
            $service->description,
            $service->city,
            $service->price,
            is_string($firstMedia) ? MediaStorage::resolveUrl($firstMedia) : null,
            $service->price_type,
            'services',
            $service->type,
        );
    }

    private function veterinarianPayload(Veterinarian $veterinarian): array
    {
        return $this->basePayload(
            $veterinarian,
            'veterinarian',
            $veterinarian->name,
            $veterinarian->clinic_name,
            $veterinarian->description,
            $veterinarian->city,
            null,
            MarketplaceMedia::resolveUrl($veterinarian->image_path),
            null,
            'veterinarians',
        );
    }

    private function basePayload(
        Model $listing,
        string $type,
        ?string $title,
        ?string $subtitle,
        ?string $description,
        ?string $location,
        mixed $price,
        ?string $imageUrl,
        ?string $badge,
        string $destination,
        ?string $serviceType = null,
    ): array {
        $professionalBadge = $listing->user
            ? $this->publishing->badgeFor($listing->user, $destination, $serviceType)
            : null;

        return [
            'isDemo' => str_ends_with((string) $listing->user?->email, '@yazoo.test') || (config('operations.deployment_profile') === 'showcase'),
            'id' => $listing->getKey(),
            'type' => $type,
            'title' => $this->sanitizePublicText($title),
            'subtitle' => $this->sanitizePublicText($subtitle),
            'description' => $this->sanitizePublicText($description),
            'location' => $this->sanitizePublicText($location),
            'price' => $price !== null ? (float) $price : null,
            'imageUrl' => $imageUrl,
            'badge' => $badge,
            'professionalBadge' => str_ends_with((string) $listing->user?->email, '@yazoo.test') || config('operations.deployment_profile') === 'showcase' ? null : $professionalBadge,
            'createdAt' => $listing->created_at?->toISOString(),
            'author' => [
                'name' => $this->sanitizePublicText($listing->user?->name),
                'avatar' => MediaStorage::resolveUrl($listing->user?->avatar),
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function professionalVerificationRelations(): array
    {
        return [
            'user:id,name,avatar,city,email',
            'user.latestProfessionalVerification.reviewer:id,is_admin',
        ];
    }

    private function sanitizePublicText(?string $value): ?string
    {
        if (! is_string($value) || trim($value) === '') {
            return null;
        }

        $sanitized = preg_replace(
            [
                '/https?:\/\/\S+|www\.\S+/iu',
                '/[\p{L}\p{N}._%+\-]+@[\p{L}\p{N}.\-]+\.[\p{L}]{2,}/iu',
                '/(?<![\p{L}\p{N}])(?:\+?\d[\d\s().\-]{7,}\d)(?![\p{L}\p{N}])/u',
                '/(?<!\d)-?\d{1,3}\.\d{4,}\s*[,;]\s*-?\d{1,3}\.\d{4,}(?!\d)/u',
            ],
            '',
            trim($value),
        );

        if (! is_string($sanitized)) {
            return null;
        }

        $sanitized = preg_replace('/\s{2,}/u', ' ', $sanitized);
        $sanitized = is_string($sanitized) ? trim($sanitized) : '';
        $sanitized = preg_replace('/(?:^[,;·-]+)|(?:[,;·-]+$)/u', '', $sanitized);
        $sanitized = is_string($sanitized) ? trim($sanitized) : '';

        return $sanitized !== '' ? $sanitized : null;
    }
}
