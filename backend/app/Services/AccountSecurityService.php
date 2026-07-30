<?php

namespace App\Services;

use App\Mail\AccountRecoveryMail;
use App\Mail\VerifyEmailMail;
use App\Models\AccountRecoveryToken;
use App\Models\User;
use App\Support\Auth\PhoneOtpBroker;
use App\Support\PhoneNumber;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\TooManyRequestsHttpException;

class AccountSecurityService
{
    public function __construct(
        private readonly PhoneOtpBroker $phoneOtpBroker,
    ) {}

    /**
     * @param  array{channel: string, identifier: string}  $validated
     */
    public function requestPasswordReset(array $validated, Request $request): void
    {
        $channel = $validated['channel'];
        $identifier = $this->normalizeIdentifier($channel, $validated['identifier']);
        $this->enforceRecoveryRateLimit($request, $channel, $identifier);
        $user = $this->findUser($channel, $identifier);

        if (! $user || $user->isBanned()) {
            return;
        }

        if ($channel === 'phone') {
            if ($this->phoneOtpBroker->isAvailable()) {
                $this->phoneOtpBroker->send($identifier, 'password_reset');
            }

            return;
        }

        if (! $user->hasRealEmail()) {
            return;
        }

        $plainToken = Str::random(64);
        $expiresInMinutes = max(5, (int) config('auth.account_recovery.expire', 15));

        DB::transaction(function () use ($user, $plainToken, $expiresInMinutes): void {
            AccountRecoveryToken::query()
                ->where('user_id', $user->id)
                ->where('channel', 'email')
                ->whereNull('used_at')
                ->delete();

            AccountRecoveryToken::query()->create([
                'user_id' => $user->id,
                'channel' => 'email',
                'token_hash' => hash('sha256', $plainToken),
                'expires_at' => now()->addMinutes($expiresInMinutes),
            ]);
        });

        $resetUrl = rtrim((string) config('app.frontend_url'), '/')
            .'/reset-password?channel=email&identifier='.rawurlencode($identifier)
            .'&token='.rawurlencode($plainToken);

        Mail::to($user->email)->send(new AccountRecoveryMail(
            $user,
            $resetUrl,
            $expiresInMinutes,
        ));
    }

    /**
     * @param  array<string, mixed>  $validated
     */
    public function resetPassword(array $validated): void
    {
        $channel = $validated['channel'];
        $identifier = $this->normalizeIdentifier($channel, $validated['identifier']);
        $user = $this->findUser($channel, $identifier);

        if (! $user || $user->isBanned()) {
            $this->invalidRecovery();
        }

        if ($channel === 'phone') {
            $this->phoneOtpBroker->consume(
                $identifier,
                'password_reset',
                (string) $validated['otp_code'],
            );

            $this->persistNewPassword($user, (string) $validated['password'], $channel);

            return;
        }

        DB::transaction(function () use ($user, $validated, $channel): void {
            $token = AccountRecoveryToken::query()
                ->where('token_hash', hash('sha256', (string) $validated['token']))
                ->lockForUpdate()
                ->first();

            if (
                ! $token
                || (int) $token->user_id !== (int) $user->id
                || $token->channel !== 'email'
                || $token->used_at !== null
                || $token->expires_at->isPast()
            ) {
                $this->invalidRecovery();
            }

            $token->forceFill(['used_at' => now()])->save();
            $this->persistNewPassword($user, (string) $validated['password'], $channel);
        });
    }

    public function sendEmailVerification(User $user): void
    {
        if ($user->email_verified_at || ! $user->hasRealEmail() || $user->isBanned()) {
            return;
        }

        $expiresInMinutes = max(5, (int) config('auth.email_verification.expire', 30));
        $verificationUrl = URL::temporarySignedRoute(
            'verification.verify',
            now()->addMinutes($expiresInMinutes),
            [
                'user' => $user->id,
                'hash' => sha1(Str::lower($user->email)),
            ],
        );

        Mail::to($user->email)->send(new VerifyEmailMail(
            $user,
            $verificationUrl,
            $expiresInMinutes,
        ));
    }

    public function verifyEmail(User $user, string $hash): void
    {
        if (
            ! $user->hasRealEmail()
            || ! hash_equals(sha1(Str::lower($user->email)), $hash)
            || $user->isBanned()
        ) {
            throw ValidationException::withMessages([
                'email' => [__('messages.auth.verification_invalid')],
            ]);
        }

        if (! $user->email_verified_at) {
            $user->forceFill(['email_verified_at' => now()])->save();
            Log::notice('account.email_verified', ['user_id' => $user->id]);
        }
    }

    private function persistNewPassword(User $user, string $password, string $channel): void
    {
        $user->forceFill(['password' => Hash::make($password)])->save();
        $user->tokens()->delete();
        AccountRecoveryToken::query()
            ->where('user_id', $user->id)
            ->whereNull('used_at')
            ->delete();

        Log::notice('account.password_reset', [
            'user_id' => $user->id,
            'channel' => $channel,
        ]);
    }

    private function enforceRecoveryRateLimit(Request $request, string $channel, string $identifier): void
    {
        $key = 'password-recovery:'.hash_hmac(
            'sha256',
            $request->ip().'|'.$channel.'|'.Str::lower($identifier),
            (string) config('app.key'),
        );
        $maxAttempts = max(1, (int) config('auth.account_recovery.max_attempts', 5));
        $decaySeconds = max(60, (int) config('auth.account_recovery.decay_seconds', 900));

        if (RateLimiter::tooManyAttempts($key, $maxAttempts)) {
            throw new TooManyRequestsHttpException(
                RateLimiter::availableIn($key),
                __('messages.auth.recovery_throttled'),
            );
        }

        RateLimiter::hit($key, $decaySeconds);
    }

    private function normalizeIdentifier(string $channel, string $identifier): string
    {
        return $channel === 'phone'
            ? (PhoneNumber::normalize($identifier) ?? $identifier)
            : Str::lower(trim($identifier));
    }

    private function findUser(string $channel, string $identifier): ?User
    {
        return User::query()
            ->where($channel === 'phone' ? 'phone' : 'email', $identifier)
            ->first();
    }

    private function invalidRecovery(): never
    {
        throw ValidationException::withMessages([
            'identifier' => [__('messages.auth.recovery_invalid')],
        ]);
    }
}
