<?php

namespace App\Support\Auth;

use App\Support\PhoneNumber;
use App\Support\Sms\SmsSender;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\TooManyRequestsHttpException;

class PhoneOtpBroker
{
    public function __construct(
        protected SmsSender $smsSender,
    ) {}

    public function isAvailable(): bool
    {
        return $this->smsSender->isAvailable();
    }

    /**
     * Send an OTP code for the given phone number and intent.
     *
     * @return array{debug_code: string|null, expires_at: string}
     */
    public function send(string $phone, string $intent): array
    {
        $normalizedPhone = PhoneNumber::normalize($phone);

        if ($normalizedPhone === null) {
            throw ValidationException::withMessages([
                'phone' => [__('messages.auth.invalid_phone')],
            ]);
        }

        $cooldownSeconds = max(0, (int) config('services.sms.otp_resend_cooldown_seconds', 60));

        if (
            $cooldownSeconds > 0
            && ! Cache::add($this->cooldownKey($normalizedPhone, $intent), true, $cooldownSeconds)
        ) {
            throw new TooManyRequestsHttpException(
                $cooldownSeconds,
                __('messages.auth.otp_cooldown'),
            );
        }

        $code = (string) random_int(100000, 999999);
        $expiresAt = CarbonImmutable::now()->addMinutes((int) config('services.sms.otp_ttl', 5));

        Cache::put($this->cacheKey($normalizedPhone, $intent), [
            'code_hash' => Hash::make($code),
            'expires_at' => $expiresAt->toIso8601String(),
            'attempts' => 0,
        ], $expiresAt);

        $message = __('messages.auth.otp_sms', [
            'code' => $code,
            'minutes' => (int) config('services.sms.otp_ttl', 5),
        ]);

        try {
            $this->smsSender->send($normalizedPhone, $message);
        } catch (\Throwable $exception) {
            Cache::forget($this->cacheKey($normalizedPhone, $intent));
            Cache::forget($this->cooldownKey($normalizedPhone, $intent));

            throw $exception;
        }

        return [
            'debug_code' => app()->isLocal() || app()->runningUnitTests() || (bool) config('app.debug')
                ? $code
                : null,
            'expires_at' => $expiresAt->toIso8601String(),
        ];
    }

    /**
     * Consume and validate the submitted OTP code.
     */
    public function consume(string $phone, string $intent, string $code): void
    {
        $normalizedPhone = PhoneNumber::normalize($phone);

        if ($normalizedPhone && Cache::has($this->lockKey($normalizedPhone, $intent))) {
            throw ValidationException::withMessages([
                'otp_code' => [__('messages.auth.otp_locked')],
            ]);
        }

        $payload = $normalizedPhone ? Cache::get($this->cacheKey($normalizedPhone, $intent)) : null;

        if (! is_array($payload) || ! isset($payload['code_hash'])) {
            throw ValidationException::withMessages([
                'otp_code' => [__('messages.auth.otp_missing')],
            ]);
        }

        if (! Hash::check($code, (string) $payload['code_hash'])) {
            $attempts = ((int) ($payload['attempts'] ?? 0)) + 1;
            $maxAttempts = max(1, (int) config('services.sms.otp_max_attempts', 5));

            if ($attempts >= $maxAttempts) {
                Cache::forget($this->cacheKey($normalizedPhone, $intent));
                Cache::put(
                    $this->lockKey($normalizedPhone, $intent),
                    true,
                    now()->addMinutes(max(1, (int) config('services.sms.otp_lock_minutes', 15))),
                );
            } else {
                $payload['attempts'] = $attempts;
                Cache::put(
                    $this->cacheKey($normalizedPhone, $intent),
                    $payload,
                    CarbonImmutable::parse((string) $payload['expires_at']),
                );
            }

            throw ValidationException::withMessages([
                'otp_code' => [
                    $attempts >= $maxAttempts
                        ? __('messages.auth.otp_locked')
                        : __('messages.auth.otp_invalid'),
                ],
            ]);
        }

        Cache::forget($this->cacheKey($normalizedPhone, $intent));
        Cache::forget($this->cooldownKey($normalizedPhone, $intent));
    }

    protected function cacheKey(string $phone, string $intent): string
    {
        return sprintf(
            'auth:otp:%s:%s',
            $intent,
            hash_hmac('sha256', $phone, (string) config('app.key'))
        );
    }

    protected function cooldownKey(string $phone, string $intent): string
    {
        return str_replace('auth:otp:', 'auth:otp-cooldown:', $this->cacheKey($phone, $intent));
    }

    protected function lockKey(string $phone, string $intent): string
    {
        return str_replace('auth:otp:', 'auth:otp-lock:', $this->cacheKey($phone, $intent));
    }
}
