<?php

namespace App\Support;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

final class MarketplaceContact
{
    public const VISIBILITIES = [
        'messages_only',
        'phone',
        'email',
        'whatsapp',
    ];

    /**
     * Return only listing-specific contact details that the current viewer may see.
     *
     * @return array{contactVisibility: string, contactPhone: ?string, contactEmail: ?string, whatsappEnabled: bool}
     */
    public static function payload(Model $listing, Request $request, bool $isApprovedAndVisible): array
    {
        $visibility = in_array($listing->contact_visibility, self::VISIBILITIES, true)
            ? $listing->contact_visibility
            : 'messages_only';
        $viewer = $request->user();
        $canManage = (bool) ($viewer?->is_admin)
            || ($viewer !== null && (int) $viewer->getKey() === (int) $listing->getAttribute('user_id'));

        if ($canManage) {
            return [
                'contactVisibility' => $visibility,
                'contactPhone' => self::filledString($listing->contact_phone),
                'contactEmail' => self::filledString($listing->contact_email),
                'whatsappEnabled' => (bool) $listing->whatsapp_enabled,
            ];
        }

        if (! $isApprovedAndVisible) {
            return self::hidden($visibility);
        }

        return match ($visibility) {
            'phone' => [
                'contactVisibility' => $visibility,
                'contactPhone' => self::filledString($listing->contact_phone),
                'contactEmail' => null,
                'whatsappEnabled' => false,
            ],
            'email' => [
                'contactVisibility' => $visibility,
                'contactPhone' => null,
                'contactEmail' => self::filledString($listing->contact_email),
                'whatsappEnabled' => false,
            ],
            'whatsapp' => [
                'contactVisibility' => $visibility,
                'contactPhone' => self::filledString($listing->contact_phone),
                'contactEmail' => null,
                'whatsappEnabled' => (bool) $listing->whatsapp_enabled,
            ],
            default => self::hidden($visibility),
        };
    }

    /**
     * @return array{contactVisibility: string, contactPhone: null, contactEmail: null, whatsappEnabled: false}
     */
    private static function hidden(string $visibility): array
    {
        return [
            'contactVisibility' => $visibility,
            'contactPhone' => null,
            'contactEmail' => null,
            'whatsappEnabled' => false,
        ];
    }

    private static function filledString(mixed $value): ?string
    {
        return is_string($value) && trim($value) !== '' ? $value : null;
    }
}
