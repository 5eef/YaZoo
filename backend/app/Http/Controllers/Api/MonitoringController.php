<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use JsonException;

class MonitoringController extends Controller
{
    private const MASKED_VALUE = '[masked]';

    private const MAX_BODY_BYTES = 65536;

    private const MAX_NESTING_DEPTH = 8;

    private const MAX_COLLECTION_ITEMS = 100;

    private const MAX_TOTAL_ITEMS = 200;

    private const MAX_KEY_LENGTH = 100;

    private const MAX_CONTEXT_STRING_LENGTH = 4096;

    private const SENSITIVE_KEYS = [
        'accesstoken',
        'apikey',
        'authorization',
        'address',
        'card',
        'cardnumber',
        'clientsecret',
        'cvc',
        'cvv',
        'email',
        'hash',
        'name',
        'password',
        'phone',
        'secret',
        'signature',
        'storekey',
        'token',
    ];

    /**
     * Persist a frontend error report into the observability logs.
     */
    public function store(Request $request): JsonResponse
    {
        $rawPayload = $request->getContent();

        if (strlen($rawPayload) > self::MAX_BODY_BYTES) {
            return response()->json([
                'message' => 'The monitoring payload is too large.',
            ], 413);
        }

        if ($rawPayload !== '') {
            try {
                $decodedPayload = json_decode($rawPayload, true, 64, JSON_THROW_ON_ERROR);
            } catch (JsonException) {
                return response()->json([
                    'message' => 'The monitoring payload is not valid JSON.',
                ], 400);
            }

            if (! is_array($decodedPayload)) {
                return response()->json([
                    'message' => 'The monitoring payload must be a JSON object.',
                ], 422);
            }

            $request->replace($decodedPayload);
        }

        $validated = $request->validate([
            'message' => ['required', 'string', 'max:5000'],
            'stack' => ['nullable', 'string', 'max:50000'],
            'source' => ['nullable', 'string', 'max:255'],
            'url' => ['nullable', 'string', 'max:2048'],
            'userAgent' => ['nullable', 'string', 'max:2048'],
            'context' => ['nullable', 'array'],
            'user' => ['nullable', 'array'],
        ]);

        $totalItems = 0;
        $this->validatePayloadShape($validated['context'] ?? [], 'context', 1, $totalItems);
        $this->validatePayloadShape($validated['user'] ?? [], 'user', 1, $totalItems);

        Log::channel((string) config('logging.frontend_channel', 'frontend'))
            ->error($validated['message'], [
                'source' => $validated['source'] ?? 'frontend',
                'stack' => $validated['stack'] ?? null,
                'url' => $this->sanitizeUrl($validated['url'] ?? null),
                'user_agent' => $validated['userAgent'] ?? null,
                'context' => $this->sanitizePayload($validated['context'] ?? []),
                'user' => $this->sanitizePayload($validated['user'] ?? null),
                'reported_at' => now()->toISOString(),
            ]);

        return response()->json([
            'message' => __('messages.monitoring.frontend_report_saved'),
        ], 202);
    }

    private function sanitizePayload(mixed $payload): mixed
    {
        if (! is_array($payload)) {
            return $payload;
        }

        $sanitized = [];

        foreach ($payload as $key => $value) {
            $normalizedKey = preg_replace('/[^a-z0-9]/', '', strtolower((string) $key)) ?? '';

            $sanitized[$key] = in_array($normalizedKey, self::SENSITIVE_KEYS, true)
                ? self::MASKED_VALUE
                : $this->sanitizePayload($value);
        }

        return $sanitized;
    }

    private function validatePayloadShape(mixed $payload, string $path, int $depth, int &$totalItems): void
    {
        if (is_string($payload) && mb_strlen($payload) > self::MAX_CONTEXT_STRING_LENGTH) {
            throw ValidationException::withMessages([
                $path => "The {$path} value is too long.",
            ]);
        }

        if (! is_array($payload)) {
            return;
        }

        if ($depth > self::MAX_NESTING_DEPTH) {
            throw ValidationException::withMessages([
                $path => "The {$path} structure is too deep.",
            ]);
        }

        if (count($payload) > self::MAX_COLLECTION_ITEMS) {
            throw ValidationException::withMessages([
                $path => "The {$path} collection has too many items.",
            ]);
        }

        $totalItems += count($payload);

        if ($totalItems > self::MAX_TOTAL_ITEMS) {
            throw ValidationException::withMessages([
                $path => 'The monitoring payload has too many items.',
            ]);
        }

        foreach ($payload as $key => $value) {
            if (is_string($key) && mb_strlen($key) > self::MAX_KEY_LENGTH) {
                throw ValidationException::withMessages([
                    $path => "The {$path} collection contains a key that is too long.",
                ]);
            }

            $this->validatePayloadShape($value, $path.'.'.$key, $depth + 1, $totalItems);
        }
    }

    private function sanitizeUrl(?string $url): ?string
    {
        if ($url === null || trim($url) === '') {
            return null;
        }

        $parts = parse_url($url);

        if (! is_array($parts) || empty($parts['host'])) {
            return null;
        }

        $scheme = isset($parts['scheme']) ? $parts['scheme'].'://' : '';
        $port = isset($parts['port']) ? ':'.$parts['port'] : '';
        $path = $parts['path'] ?? '';

        return substr($scheme.$parts['host'].$port.$path, 0, 2048);
    }
}
