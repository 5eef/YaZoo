<?php

namespace App\Services;

use App\Models\ProfessionalVerification;
use App\Models\User;

class MarketplacePublishingResolver
{
    /**
     * @var array<string, array{destination: string, serviceType: string|null}>
     */
    private const DESTINATIONS = [
        'seller' => ['destination' => 'products', 'serviceType' => null],
        'pet_shop' => ['destination' => 'products', 'serviceType' => null],
        'breeder' => ['destination' => 'animals', 'serviceType' => null],
        'veterinarian' => ['destination' => 'veterinarians', 'serviceType' => null],
        'trainer' => ['destination' => 'services', 'serviceType' => 'training'],
        'service_provider' => ['destination' => 'services', 'serviceType' => null],
    ];

    private const PROFESSIONAL_BADGES = [
        'seller' => 'verified_seller',
        'pet_shop' => 'verified_pet_shop',
        'breeder' => 'verified_breeder',
        'veterinarian' => 'verified_veterinarian',
        'trainer' => 'verified_trainer',
        'service_provider' => 'verified_service_provider',
    ];

    /**
     * @return array{
     *     canPublish: bool,
     *     businessType: string|null,
     *     verificationStatus: string|null,
     *     destination: string|null,
     *     serviceType: string|null
     * }
     */
    public function resolve(User $user): array
    {
        if ($user->isSuspended() || $user->isBanned()) {
            return $this->emptyCapability();
        }

        $user->loadMissing('latestProfessionalVerification');
        $verification = $user->latestProfessionalVerification;

        if (! $verification) {
            return $this->emptyCapability();
        }

        $businessType = in_array(
            $verification->business_type,
            ProfessionalVerification::BUSINESS_TYPES,
            true,
        ) ? $verification->business_type : null;
        $verificationStatus = $verification->effectiveStatus();

        if (
            $businessType === null
            || $verificationStatus !== 'approved'
            || ! $verification->wasReviewedByAdmin()
            || (
                $businessType === 'veterinarian'
                && ! $verification->hasValidVeterinarianCredentials()
            )
        ) {
            return $this->emptyCapability();
        }

        $target = self::DESTINATIONS[$businessType] ?? null;

        return [
            'canPublish' => $target !== null,
            'businessType' => $businessType,
            'verificationStatus' => 'approved',
            'destination' => $target['destination'] ?? null,
            'serviceType' => $target['serviceType'] ?? null,
        ];
    }

    public function canPublishTo(User $user, string $destination, ?string $serviceType = null): bool
    {
        if ($user->isSuspended() || $user->isBanned()) {
            return false;
        }

        if ((bool) $user->is_admin) {
            return true;
        }

        $capability = $this->resolve($user);

        if (
            $capability['canPublish'] !== true
            || $capability['destination'] !== $destination
        ) {
            return false;
        }

        return $capability['serviceType'] === null
            || $capability['serviceType'] === $serviceType;
    }

    public function badgeFor(User $user, string $destination, ?string $serviceType = null): ?string
    {
        $capability = $this->resolve($user);

        if (
            $capability['canPublish'] !== true
            || $capability['destination'] !== $destination
            || (
                $capability['serviceType'] !== null
                && $capability['serviceType'] !== $serviceType
            )
        ) {
            return null;
        }

        $verification = $user->latestProfessionalVerification;

        if (
            ! $verification
            || ! $verification->wasReviewedByAdmin()
            || (
                $capability['businessType'] === 'veterinarian'
                && ! $verification->hasValidVeterinarianCredentials()
            )
        ) {
            return null;
        }

        return self::PROFESSIONAL_BADGES[$capability['businessType']] ?? null;
    }

    /**
     * @return array{
     *     canPublish: false,
     *     businessType: null,
     *     verificationStatus: null,
     *     destination: null,
     *     serviceType: null
     * }
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
