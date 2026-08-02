<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class MonitoringController extends Controller
{
    private const MASKED_VALUE = '[masked]';

    private const SENSITIVE_KEYS = [
        'access_token',
        'api_key',
        'authorization',
        'card',
        'card_number',
        'client_secret',
        'cvc',
        'cvv',
        'hash',
        'password',
        'secret',
        'signature',
        'store_key',
        'token',
    ];

    /**
     * Persist a frontend error report into the observability logs.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'message' => ['required', 'string', 'max:5000'],
            'stack' => ['nullable', 'string', 'max:50000'],
            'source' => ['nullable', 'string', 'max:255'],
            'url' => ['nullable', 'string', 'max:2048'],
            'userAgent' => ['nullable', 'string', 'max:2048'],
            'context' => ['nullable', 'array'],
            'user' => ['nullable', 'array'],
        ]);

        Log::channel((string) env('FRONTEND_MONITORING_LOG_CHANNEL', 'frontend'))
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
            $normalizedKey = strtolower((string) $key);

            $sanitized[$key] = in_array($normalizedKey, self::SENSITIVE_KEYS, true)
                ? self::MASKED_VALUE
                : $this->sanitizePayload($value);
        }

        return $sanitized;
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
