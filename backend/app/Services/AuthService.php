<?php

namespace App\Services;

use App\DTOs\Auth\AuthResult;
use App\DTOs\Auth\OtpDispatchResult;
use App\Models\User;
use App\Support\Auth\PhoneOtpBroker;
use App\Support\MediaStorage;
use App\Support\PhoneNumber;
use Illuminate\Contracts\Cache\LockTimeoutException;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Laravel\Socialite\Contracts\User as SocialiteUser;
use Symfony\Component\HttpFoundation\Cookie;
use Symfony\Component\HttpKernel\Exception\ServiceUnavailableHttpException;

class AuthService
{
    public function __construct(
        protected PhoneOtpBroker $phoneOtpBroker,
        protected MarketplacePublishingResolver $marketplacePublishingResolver,
    ) {}

    /**
     * @param  array<string, mixed>  $validated
     */
    public function requestOtp(array $validated): OtpDispatchResult
    {
        $phone = PhoneNumber::normalize($validated['phone'] ?? null) ?? (string) $validated['phone'];
        $intent = (string) $validated['intent'];

        if (! $this->phoneOtpBroker->isAvailable()) {
            throw new ServiceUnavailableHttpException(
                300,
                __('messages.auth.sms_unavailable'),
            );
        }

        $phoneExists = User::query()->where('phone', $phone)->exists();
        $eligible = ($intent === 'login' && $phoneExists)
            || ($intent === 'register' && ! $phoneExists);

        if (! $eligible) {
            return new OtpDispatchResult(
                __('messages.auth.otp_sent'),
                now()->addMinutes((int) config('services.sms.otp_ttl', 5))->toIso8601String(),
            );
        }

        $otpPayload = $this->phoneOtpBroker->send($phone, $intent);

        return new OtpDispatchResult(
            __('messages.auth.otp_sent'),
            (string) $otpPayload['expires_at'],
        );
    }

    /**
     * @param  array<string, mixed>  $validated
     *
     * @throws LockTimeoutException
     */
    public function register(array $validated): AuthResult
    {
        $phone = $validated['phone'] ?? null;

        $user = Cache::lock('auth:first-admin-bootstrap', 10)->block(
            5,
            fn (): User => DB::transaction(function () use ($validated, $phone): User {
                $isFirstAdmin = $this->shouldBootstrapFirstAdmin();
                $hasOtp = filled($validated['otp_code'] ?? null);

                if ($hasOtp) {
                    if (! $phone) {
                        throw ValidationException::withMessages([
                            'phone' => [__('validation.required', ['attribute' => 'telephone'])],
                        ]);
                    }

                    $this->phoneOtpBroker->consume($phone, 'register', (string) $validated['otp_code']);
                }

                $user = new User;
                $user->fill([
                    'name' => $validated['name'],
                    'email' => $this->resolveEmail($validated['email'] ?? null, $phone),
                    'password' => $validated['password'] ?? Str::random(32),
                    'phone' => $phone,
                    'preferred_locale' => $validated['preferred_locale'] ?? app()->getLocale(),
                    'country' => $validated['country'] ?? null,
                    'city' => $validated['city'] ?? null,
                ]);
                $user->forceFill([
                    'phone_verified_at' => $hasOtp && $phone ? now() : null,
                    'is_admin' => $isFirstAdmin,
                ])->save();

                return $user;
            }),
        );

        return new AuthResult(
            $user,
            $this->createPlainTextToken($user, (string) ($validated['device_name'] ?? 'yazoo-web')),
        );
    }

    /**
     * @param  array<string, mixed>  $validated
     */
    public function login(array $validated): AuthResult
    {
        if (filled($validated['phone'] ?? null) && filled($validated['otp_code'] ?? null)) {
            $phone = (string) $validated['phone'];
            $this->phoneOtpBroker->consume($phone, 'login', (string) $validated['otp_code']);

            $user = User::query()->where('phone', $phone)->first();

            if (! $user) {
                throw ValidationException::withMessages([
                    'phone' => [__('messages.auth.phone_not_found')],
                ]);
            }

            if (! $user->hasVerifiedPhone()) {
                $user->forceFill([
                    'phone_verified_at' => now(),
                ])->save();
            }

            $this->ensureCanAuthenticate($user, 'phone');

            return new AuthResult(
                $user,
                $this->createPlainTextToken($user, (string) ($validated['device_name'] ?? 'yazoo-web')),
            );
        }

        $user = User::query()->where('email', $validated['email'])->first();

        if (! $user || ! Hash::check((string) $validated['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => [__('messages.auth.invalid_credentials')],
            ]);
        }

        $this->ensureCanAuthenticate($user, 'email');

        return new AuthResult(
            $user,
            $this->createPlainTextToken($user, (string) ($validated['device_name'] ?? 'yazoo-web')),
        );
    }

    public function loginWithGoogle(SocialiteUser $googleUser): AuthResult
    {
        $email = Str::lower(trim((string) $googleUser->getEmail()));
        $googleId = trim((string) $googleUser->getId());

        if ($email === '' || $googleId === '' || mb_strlen($googleId) > 255) {
            throw ValidationException::withMessages([
                'email' => [__('messages.auth.google_identity_missing')],
            ]);
        }

        $user = DB::transaction(function () use ($googleUser, $email, $googleId): User {
            $userByGoogleId = User::query()->where('google_id', $googleId)->first();
            $userByEmail = User::query()
                ->whereRaw('LOWER(email) = ?', [$email])
                ->first();

            if (
                $userByGoogleId
                && $userByEmail
                && ! $userByGoogleId->is($userByEmail)
            ) {
                throw ValidationException::withMessages([
                    'email' => [__('messages.auth.google_account_conflict')],
                ]);
            }

            $user = $userByGoogleId ?? $userByEmail;

            if ($user?->google_id && $user->google_id !== $googleId) {
                throw ValidationException::withMessages([
                    'email' => [__('messages.auth.google_account_conflict')],
                ]);
            }

            if (! $user) {
                $user = new User;
                $user->fill([
                    'name' => $googleUser->getName() ?: Str::before($email, '@'),
                    'email' => $email,
                    'password' => Str::random(32),
                    'avatar' => $googleUser->getAvatar(),
                    'preferred_locale' => app()->getLocale(),
                ]);
                $user->forceFill([
                    'email_verified_at' => now(),
                    'google_id' => $googleId,
                    'google_avatar' => $googleUser->getAvatar(),
                    'is_admin' => false,
                ])->save();

                return $user;
            }

            $this->ensureCanAuthenticate($user, 'email');

            $updates = [
                'google_id' => $googleId,
                'google_avatar' => $googleUser->getAvatar(),
            ];

            if (! $user->email_verified_at) {
                $updates['email_verified_at'] = now();
            }

            if (! $user->avatar && $googleUser->getAvatar()) {
                $updates['avatar'] = $googleUser->getAvatar();
            }

            $user->forceFill($updates)->save();

            return $user;
        });

        $this->ensureCanAuthenticate($user, 'email');

        return new AuthResult(
            $user,
            $this->createPlainTextToken($user, 'google-oauth'),
        );
    }

    /**
     * @return array<string, mixed>
     */
    public function userPayload(?User $user): array
    {
        if (! $user) {
            return [];
        }

        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->publicEmail(),
            'phone' => $user->phone,
            'country' => $user->country,
            'city' => $user->city,
            'bio' => $user->bio,
            'avatar' => MediaStorage::resolveUrl($user->avatar),
            'cover_photo' => MediaStorage::resolveUrl($user->cover_photo),
            'isAdmin' => (bool) $user->is_admin,
            'isPhoneVerified' => $user->hasVerifiedPhone(),
            'preferredLocale' => $user->preferred_locale ?? 'fr',
            'marketplacePublishing' => $this->marketplacePublishingResolver->resolve($user),
            'created_at' => $user->created_at?->toISOString(),
            'updated_at' => $user->updated_at?->toISOString(),
        ];
    }

    public function makeAuthCookie(string $token): Cookie
    {
        $expiration = (int) (config('sanctum.expiration') ?? 0);
        $minutes = $expiration > 0 ? $expiration : 60 * 24 * 7;
        $sameSite = config('session.same_site', 'lax');
        $secure = (bool) (config('session.secure') ?? request()->isSecure());

        if ($sameSite === 'none') {
            $secure = true;
        }

        return cookie(
            'yazoo_api_token',
            Crypt::encryptString($token),
            $minutes,
            '/',
            config('session.domain'),
            $secure,
            true,
            false,
            $sameSite,
        );
    }

    public function expireAuthCookie(): Cookie
    {
        return cookie()->forget(
            'yazoo_api_token',
            '/',
            config('session.domain'),
        );
    }

    protected function createPlainTextToken(User $user, string $deviceName): string
    {
        return $user
            ->createToken($deviceName, ['*'])
            ->plainTextToken;
    }

    protected function ensureCanAuthenticate(User $user, string $field): void
    {
        if ($user->banned_at !== null) {
            throw ValidationException::withMessages([
                $field => [__('messages.admin.user_banned')],
            ]);
        }
    }

    protected function shouldBootstrapFirstAdmin(): bool
    {
        $allowedEnvironments = (array) config('auth.admin_bootstrap.allowed_environments', ['local', 'testing']);

        return (bool) config('auth.admin_bootstrap.enabled', false)
            && app()->environment($allowedEnvironments)
            && ! User::query()->where('is_admin', true)->exists();
    }

    protected function resolveEmail(?string $email, ?string $phone): string
    {
        $trimmedEmail = is_string($email) ? trim($email) : null;

        if ($trimmedEmail) {
            return $trimmedEmail;
        }

        if ($phone === null) {
            return sprintf(
                'user.%s@%s',
                Str::lower(Str::random(12)),
                PhoneNumber::PLACEHOLDER_EMAIL_DOMAIN,
            );
        }

        return PhoneNumber::placeholderEmail($phone);
    }
}
