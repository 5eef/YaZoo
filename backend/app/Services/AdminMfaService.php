<?php

namespace App\Services;

use App\Models\User;
use App\Support\Totp;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

class AdminMfaService
{
    /** @return array{otpauth_uri: string, recovery_codes: list<string>} */
    public function enroll(User $admin): array
    {
        $this->ensureAdmin($admin);
        $secret = Totp::secret();
        $codes = $this->newRecoveryCodes();

        $admin->forceFill([
            'admin_mfa_secret' => $secret,
            'admin_mfa_recovery_codes' => array_map(fn (string $code): string => Hash::make($code), $codes),
            'admin_mfa_confirmed_at' => null,
        ])->save();

        Log::notice('Administrator MFA enrollment started.', ['user_id' => $admin->id]);

        return [
            'otpauth_uri' => Totp::uri($secret, (string) $admin->email, (string) config('auth.admin_mfa.issuer')),
            'recovery_codes' => $codes,
        ];
    }

    public function confirm(User $admin, string $code): void
    {
        $this->ensureValidTotp($admin, $code, false);
        $admin->forceFill(['admin_mfa_confirmed_at' => now()])->save();
        Log::notice('Administrator MFA enabled.', ['user_id' => $admin->id]);
    }

    public function challenge(User $admin, string $code, ?int $tokenId = null): void
    {
        $this->ensureAdmin($admin);
        if ($admin->admin_mfa_confirmed_at === null) {
            throw ValidationException::withMessages(['code' => __('messages.auth.admin_mfa_not_enabled')]);
        }

        $valid = Totp::verify((string) $admin->admin_mfa_secret, $code)
            || $this->consumeRecoveryCode($admin, $code);

        if (! $valid) {
            throw ValidationException::withMessages(['code' => __('messages.auth.admin_mfa_invalid')]);
        }

        Cache::put(
            $this->cacheKey($admin, $tokenId),
            true,
            now()->addMinutes((int) config('auth.admin_mfa.challenge_ttl_minutes', 15)),
        );
    }

    /** @return list<string> */
    public function regenerateRecoveryCodes(User $admin, string $code): array
    {
        $this->ensureValidTotp($admin, $code);
        $codes = $this->newRecoveryCodes();
        $admin->forceFill([
            'admin_mfa_recovery_codes' => array_map(fn (string $item): string => Hash::make($item), $codes),
        ])->save();
        Log::notice('Administrator MFA recovery codes regenerated.', ['user_id' => $admin->id]);

        return $codes;
    }

    public function disable(User $admin, string $code, ?int $tokenId = null): void
    {
        $this->ensureValidTotp($admin, $code);
        $admin->forceFill([
            'admin_mfa_secret' => null,
            'admin_mfa_recovery_codes' => null,
            'admin_mfa_confirmed_at' => null,
        ])->save();
        Cache::forget($this->cacheKey($admin, $tokenId));
        Log::notice('Administrator MFA disabled.', ['user_id' => $admin->id]);
    }

    public function hasRecentChallenge(User $admin, ?int $tokenId = null): bool
    {
        return Cache::has($this->cacheKey($admin, $tokenId));
    }

    private function ensureValidTotp(User $admin, string $code, bool $requireConfirmed = true): void
    {
        $this->ensureAdmin($admin);
        if (
            blank($admin->admin_mfa_secret)
            || ($requireConfirmed && $admin->admin_mfa_confirmed_at === null)
            || ! Totp::verify((string) $admin->admin_mfa_secret, $code)
        ) {
            throw ValidationException::withMessages(['code' => __('messages.auth.admin_mfa_invalid')]);
        }
    }

    private function consumeRecoveryCode(User $admin, string $code): bool
    {
        return DB::transaction(function () use ($admin, $code): bool {
            $locked = User::query()->lockForUpdate()->findOrFail($admin->id);
            $hashes = $locked->admin_mfa_recovery_codes ?? [];
            foreach ($hashes as $index => $hash) {
                if (Hash::check(strtoupper(trim($code)), $hash)) {
                    unset($hashes[$index]);
                    $locked->forceFill(['admin_mfa_recovery_codes' => array_values($hashes)])->save();
                    $admin->setAttribute('admin_mfa_recovery_codes', array_values($hashes));

                    return true;
                }
            }

            return false;
        });
    }

    /** @return list<string> */
    private function newRecoveryCodes(): array
    {
        return array_map(
            fn (): string => strtoupper(bin2hex(random_bytes(5))),
            range(1, (int) config('auth.admin_mfa.recovery_code_count', 8)),
        );
    }

    private function cacheKey(User $admin, ?int $tokenId): string
    {
        return "admin-mfa:verified:{$admin->id}:".($tokenId ?? 'session');
    }

    private function ensureAdmin(User $admin): void
    {
        abort_unless($admin->is_admin, 403);
    }
}
