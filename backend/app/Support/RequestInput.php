<?php

namespace App\Support;

final class RequestInput
{
    /** Preserve invalid types so FormRequest rules reject them instead of casting before validation. */
    public static function trim(mixed $value): mixed
    {
        return is_string($value) ? trim($value) : ($value ?? '');
    }

    public static function lower(mixed $value): mixed
    {
        $value = self::trim($value);

        return is_string($value) ? strtolower($value) : $value;
    }
}
