<?php

namespace App\Support;

final class CsvCellSanitizer
{
    public static function sanitize(mixed $value): mixed
    {
        if (! is_string($value) || $value === '') {
            return $value;
        }

        if (preg_match('/^[\p{Z}\x20]*[=+\-@\t\r\n]/u', $value) === 1) {
            return "'".$value;
        }

        return $value;
    }

    /**
     * @param  array<int, mixed>  $row
     * @return array<int, mixed>
     */
    public static function sanitizeRow(array $row): array
    {
        return array_map(self::sanitize(...), $row);
    }
}
