<?php

namespace Tests\Feature;

use App\Models\ProfessionalVerification;
use App\Models\User;
use App\Services\MarketplacePublishingResolver;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class MarketplacePublishingResolverTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @return array<string, array{string, string, string|null, string}>
     */
    public static function approvedBusinessTypes(): array
    {
        return [
            'seller publishes products' => ['seller', 'products', null, 'verified_seller'],
            'pet shop publishes products' => ['pet_shop', 'products', null, 'verified_pet_shop'],
            'breeder publishes animals' => ['breeder', 'animals', null, 'verified_breeder'],
            'veterinarian publishes veterinarian profile' => ['veterinarian', 'veterinarians', null, 'verified_veterinarian'],
            'trainer publishes training service' => ['trainer', 'services', 'training', 'verified_trainer'],
            'service provider publishes service' => ['service_provider', 'services', null, 'verified_service_provider'],
        ];
    }

    #[DataProvider('approvedBusinessTypes')]
    public function test_it_resolves_approved_professional_destinations(
        string $businessType,
        string $destination,
        ?string $serviceType,
        string $expectedBadge,
    ): void {
        $user = User::factory()->create();
        $admin = User::factory()->admin()->create();
        ProfessionalVerification::query()->create([
            'user_id' => $user->id,
            'business_type' => $businessType,
            'status' => 'approved',
            'document_path' => 'professional-verifications/private.pdf',
            'document_type' => $businessType === 'veterinarian' ? 'veterinarian_license' : 'professional_card',
            'professional_license_number' => $businessType === 'veterinarian' ? 'VET-100' : null,
            'document_expires_at' => $businessType === 'veterinarian' ? now()->addYear() : null,
            'reviewed_by' => $admin->id,
            'reviewed_at' => now(),
        ]);

        $capability = app(MarketplacePublishingResolver::class)->resolve($user);

        $this->assertSame([
            'canPublish' => true,
            'businessType' => $businessType,
            'verificationStatus' => 'approved',
            'destination' => $destination,
            'serviceType' => $serviceType,
        ], $capability);
        $this->assertArrayNotHasKey('document_path', $capability);
        $this->assertArrayNotHasKey('documentPath', $capability);
        $this->assertSame(
            $expectedBadge,
            app(MarketplacePublishingResolver::class)->badgeFor($user, $destination, $serviceType),
        );
    }

    public function test_badge_is_refused_without_admin_review(): void
    {
        $user = User::factory()->create();
        ProfessionalVerification::query()->create([
            'user_id' => $user->id,
            'business_type' => 'seller',
            'status' => 'approved',
        ]);

        $this->assertNull(
            app(MarketplacePublishingResolver::class)->badgeFor($user, 'products'),
        );
    }

    public function test_veterinarian_badge_is_refused_without_number_or_future_expiration(): void
    {
        $admin = User::factory()->admin()->create();

        foreach ([
            'missing number' => [null, now()->addYear()],
            'missing expiration' => ['VET-100', null],
            'expired license' => ['VET-100', now()->subDay()],
        ] as [$licenseNumber, $expiresAt]) {
            $user = User::factory()->create();

            ProfessionalVerification::query()->create([
                'user_id' => $user->id,
                'business_type' => 'veterinarian',
                'status' => 'approved',
                'document_type' => 'veterinarian_license',
                'professional_license_number' => $licenseNumber,
                'document_path' => 'professional-verifications/private.pdf',
                'document_expires_at' => $expiresAt,
                'reviewed_by' => $admin->id,
                'reviewed_at' => now(),
            ]);

            $this->assertNull(
                app(MarketplacePublishingResolver::class)->badgeFor($user, 'veterinarians'),
            );
            $this->assertSame(
                $this->emptyCapability(),
                app(MarketplacePublishingResolver::class)->resolve($user),
            );
        }
    }

    public function test_suspended_or_banned_users_cannot_publish_even_when_admin_or_verified(): void
    {
        foreach ([
            ['is_admin' => true, 'is_suspended' => true],
            ['is_admin' => true, 'banned_at' => now()],
        ] as $attributes) {
            $user = User::factory()->create($attributes);
            $resolver = app(MarketplacePublishingResolver::class);

            $this->assertSame($this->emptyCapability(), $resolver->resolve($user));
            $this->assertFalse($resolver->canPublishTo($user, 'products'));
            $this->assertNull($resolver->badgeFor($user, 'products'));
        }
    }

    public function test_approved_status_without_admin_review_is_not_a_verified_profile(): void
    {
        $user = User::factory()->create();
        ProfessionalVerification::query()->create([
            'user_id' => $user->id,
            'business_type' => 'seller',
            'status' => 'approved',
        ]);

        $this->assertFalse($user->hasApprovedProfessionalVerification());
        $this->assertFalse($user->hasApprovedVeterinarianVerification());
        $this->assertSame('approved', $user->professionalVerificationStatus());
        $this->assertFalse($user->isSuspended());
        $this->assertFalse($user->isBanned());
    }

    #[DataProvider('nonPublishingStatuses')]
    public function test_it_rejects_non_approved_or_expired_verifications(
        string $status,
        ?string $expiresAt,
    ): void {
        $user = User::factory()->create();
        ProfessionalVerification::query()->create([
            'user_id' => $user->id,
            'business_type' => 'seller',
            'status' => $status,
            'document_expires_at' => $expiresAt,
        ]);

        $this->assertSame(
            $this->emptyCapability(),
            app(MarketplacePublishingResolver::class)->resolve($user),
        );
    }

    /**
     * @return array<string, array{string, string|null}>
     */
    public static function nonPublishingStatuses(): array
    {
        return [
            'pending' => ['pending', null],
            'rejected' => ['rejected', null],
            'expired approved document' => ['approved', '2020-01-01'],
        ];
    }

    public function test_it_rejects_a_user_without_verification(): void
    {
        $user = User::factory()->create();

        $this->assertSame(
            $this->emptyCapability(),
            app(MarketplacePublishingResolver::class)->resolve($user),
        );
    }

    public function test_it_does_not_guess_a_destination_for_an_unsupported_approved_type(): void
    {
        $user = User::factory()->create();
        $admin = User::factory()->admin()->create();
        ProfessionalVerification::query()->create([
            'user_id' => $user->id,
            'business_type' => 'association',
            'status' => 'approved',
            'reviewed_by' => $admin->id,
            'reviewed_at' => now(),
        ]);

        $this->assertSame([
            'canPublish' => false,
            'businessType' => 'association',
            'verificationStatus' => 'approved',
            'destination' => null,
            'serviceType' => null,
        ], app(MarketplacePublishingResolver::class)->resolve($user));
    }

    /**
     * @return array{canPublish: false, businessType: null, verificationStatus: null, destination: null, serviceType: null}
     */
    private function emptyCapability(): array
    {
        return [
            'canPublish' => false,
            'businessType' => null,
            'verificationStatus' => null,
            'destination' => null,
            'serviceType' => null,
        ];
    }
}
