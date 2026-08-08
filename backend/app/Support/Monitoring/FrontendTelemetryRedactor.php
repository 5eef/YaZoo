<?php

namespace App\Support\Monitoring;

final class FrontendTelemetryRedactor
{
    private const MASKED_VALUE = '[masked]';

    private const SENSITIVE_KEY_PHRASES = [
        'token',
        'access token',
        'refresh token',
        'id token',
        'auth token',
        'authorization',
        'bearer',
        'api key',
        'secret',
        'client secret',
        'password',
        'cookie',
        'session id',
        'credential',
        'store key',
        'card',
        'card number',
        'cvc',
        'cvv',
        'email',
        'phone',
        'address',
        'signature',
        'hash',
        'name',
    ];

    private const TEXTUAL_SECRET_KEY_PATTERN = '(?:access[_-]?token|refresh[_-]?token|id[_-]?token|auth[_-]?token|authorization|bearer|api[_-]?key|client[_-]?secret|password|cookie|session[_-]?id|credential|store[_-]?key|card[_-]?number|cvc|cvv|secret|token)';

    public function text(?string $value, int $maxLength): ?string
    {
        if ($value === null) {
            return null;
        }

        $redacted = $this->redactString($value);

        return mb_substr($redacted, 0, max(0, $maxLength));
    }

    public function payload(mixed $payload): mixed
    {
        if (is_string($payload)) {
            return $this->text($payload, 4096);
        }

        if (! is_array($payload)) {
            return $payload;
        }

        $redacted = [];

        foreach ($payload as $key => $value) {
            $redacted[$key] = is_string($key) && $this->isSensitiveKey($key)
                ? self::MASKED_VALUE
                : $this->payload($value);
        }

        return $redacted;
    }

    public function url(?string $url, int $maxLength = 2048): ?string
    {
        if ($url === null || trim($url) === '') {
            return null;
        }

        $parts = parse_url($url);

        if (! is_array($parts) || empty($parts['host'])) {
            return null;
        }

        $scheme = isset($parts['scheme']) ? strtolower((string) $parts['scheme']).'://' : '';
        $host = (string) $parts['host'];
        $port = isset($parts['port']) ? ':'.(int) $parts['port'] : '';
        $path = $this->text((string) ($parts['path'] ?? ''), $maxLength) ?? '';

        return mb_substr($scheme.$host.$port.$path, 0, $maxLength);
    }

    private function isSensitiveKey(string $key): bool
    {
        $splitCamelCase = preg_replace('/([a-z0-9])([A-Z])/', '$1 $2', $key) ?? $key;
        $tokens = preg_split('/[^a-z0-9]+/', strtolower($splitCamelCase), -1, PREG_SPLIT_NO_EMPTY) ?: [];

        if ($tokens === []) {
            return false;
        }

        $sensitivePhrases = array_map(
            fn (string $phrase): string => str_replace(' ', '', $phrase),
            self::SENSITIVE_KEY_PHRASES,
        );

        foreach ($tokens as $token) {
            if (in_array($token, $sensitivePhrases, true)) {
                return true;
            }
        }

        for ($start = 0, $count = count($tokens); $start < $count; $start++) {
            $phrase = '';

            for ($end = $start; $end < min($count, $start + 3); $end++) {
                $phrase .= $tokens[$end];

                if (in_array($phrase, $sensitivePhrases, true)) {
                    return true;
                }
            }
        }

        return false;
    }

    private function redactString(string $value): string
    {
        $value = preg_replace_callback(
            '/\bBearer\s+[A-Za-z0-9._~+\/=\-]{6,4096}/i',
            fn (array $match): string => 'Bearer '.self::MASKED_VALUE,
            $value,
        ) ?? $value;

        $value = preg_replace_callback(
            '/\b'.self::TEXTUAL_SECRET_KEY_PATTERN.'\b(\s*[=:]\s*["\']?)([^\s&;,}"\']{1,4096})/i',
            fn (array $match): string => substr($match[0], 0, strlen($match[0]) - strlen($match[2]))
                .self::MASKED_VALUE,
            $value,
        ) ?? $value;

        $value = preg_replace(
            '/\beyJ[A-Za-z0-9_-]{5,2048}\.[A-Za-z0-9_-]{5,2048}\.[A-Za-z0-9_-]{5,2048}\b/',
            self::MASKED_VALUE,
            $value,
        ) ?? $value;

        return preg_replace(
            '/[A-Z0-9._%+\-]{1,64}@[A-Z0-9.\-]{1,190}\.[A-Z]{2,63}/i',
            '[email-masked]',
            $value,
        ) ?? $value;
    }
}
