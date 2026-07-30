<?php

namespace App\Support;

use InvalidArgumentException;

final class Totp
{
    private const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

    public static function secret(int $bytes = 20): string
    {
        return self::base32Encode(random_bytes($bytes));
    }

    public static function verify(string $secret, string $code, ?int $timestamp = null, int $window = 1): bool
    {
        $code = preg_replace('/\s+/', '', $code) ?? '';
        if (! preg_match('/^\d{6}$/', $code)) {
            return false;
        }

        $counter = intdiv($timestamp ?? time(), 30);
        for ($offset = -$window; $offset <= $window; $offset++) {
            if (hash_equals(self::code($secret, $counter + $offset), $code)) {
                return true;
            }
        }

        return false;
    }

    public static function code(string $secret, int $counter): string
    {
        $hash = hash_hmac(
            'sha1',
            pack('N2', intdiv($counter, 4294967296), $counter % 4294967296),
            self::base32Decode($secret),
            true,
        );
        $offset = ord($hash[19]) & 0x0F;
        $value = ((ord($hash[$offset]) & 0x7F) << 24)
            | ((ord($hash[$offset + 1]) & 0xFF) << 16)
            | ((ord($hash[$offset + 2]) & 0xFF) << 8)
            | (ord($hash[$offset + 3]) & 0xFF);

        return str_pad((string) ($value % 1_000_000), 6, '0', STR_PAD_LEFT);
    }

    public static function uri(string $secret, string $account, string $issuer): string
    {
        $label = rawurlencode($issuer).':'.rawurlencode($account);

        return "otpauth://totp/{$label}?secret={$secret}&issuer=".rawurlencode($issuer).'&algorithm=SHA1&digits=6&period=30';
    }

    private static function base32Encode(string $value): string
    {
        $bits = '';
        foreach (str_split($value) as $character) {
            $bits .= str_pad(decbin(ord($character)), 8, '0', STR_PAD_LEFT);
        }

        $encoded = '';
        foreach (str_split($bits, 5) as $chunk) {
            $encoded .= self::ALPHABET[bindec(str_pad($chunk, 5, '0'))];
        }

        return $encoded;
    }

    private static function base32Decode(string $value): string
    {
        $bits = '';
        foreach (str_split(strtoupper(rtrim($value, '='))) as $character) {
            $position = strpos(self::ALPHABET, $character);
            if ($position === false) {
                throw new InvalidArgumentException('Invalid base32 secret.');
            }
            $bits .= str_pad(decbin($position), 5, '0', STR_PAD_LEFT);
        }

        $decoded = '';
        foreach (str_split($bits, 8) as $chunk) {
            if (strlen($chunk) === 8) {
                $decoded .= chr(bindec($chunk));
            }
        }

        return $decoded;
    }
}
