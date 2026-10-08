<?php

namespace App\Support;

class PhoneNumber
{
    public const PLACEHOLDER_EMAIL_DOMAIN = 'phone.yazoo.local';

    /**
     * Normalize the given phone number for storage and OTP lookup.
     */
    public static function normalize(mixed $phone): ?string
    {
        if (! is_string($phone)) {
            return null;
        }

        $value = trim($phone);

        if ($value === '') {
            return null;
        }

        $digits = preg_replace('/\D+/', '', $value) ?? '';

        if ($digits === '') {
            return null;
        }

        if (str_starts_with($value, '+')) {
            return '+'.$digits;
        }

        if (str_starts_with($digits, '00')) {
            return '+'.substr($digits, 2);
        }

        if (str_starts_with($digits, '212')) {
            return '+'.$digits;
        }

        if (str_starts_with($digits, '0')) {
            return '+212'.substr($digits, 1);
        }

        return '+'.$digits;
    }

    /**
     * Build a stable placeholder email for users created only with a phone number.
     */
    public static function placeholderEmail(string $phone): string
    {
        $digits = preg_replace('/\D+/', '', $phone) ?? 'user';

        return sprintf('phone.%s@%s', $digits, self::PLACEHOLDER_EMAIL_DOMAIN);
    }

    /**
     * Determine whether the given email is only an internal placeholder.
     */
    public static function isPlaceholderEmail(?string $email): bool
    {
        if (! is_string($email) || $email === '') {
            return false;
        }

        return str_ends_with(strtolower($email), '@'.self::PLACEHOLDER_EMAIL_DOMAIN);
    }
}
