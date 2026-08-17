<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Support\DatabaseTargetGuard;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rules\Password;
use RuntimeException;
use Throwable;

class BootstrapReleaseAdmin extends Command
{
    protected $signature = 'yazoo:bootstrap-release-admin
        {--confirmation= : Exact non-sensitive database target confirmation}';

    protected $description = 'Create the first production administrator on an explicitly guarded database target.';

    public function handle(DatabaseTargetGuard $databaseTargetGuard): int
    {
        try {
            $this->assertAllowed($databaseTargetGuard);
            $credentials = $this->validatedCredentials();
            $lock = Cache::lock('operations:release-admin-bootstrap', 120);

            if (! $lock->get()) {
                throw new RuntimeException('Another release administrator bootstrap owns the distributed lock.');
            }

            try {
                $created = DB::transaction(fn (): bool => $this->createWhenRequired($credentials), 3);
            } finally {
                $lock->release();
            }

            $this->info($created
                ? 'Release administrator created with MFA enabled.'
                : 'An active MFA-enabled administrator already exists; bootstrap made no changes.');

            return self::SUCCESS;
        } catch (Throwable $exception) {
            $this->error('Release administrator bootstrap refused: '.$exception->getMessage());

            return self::FAILURE;
        }
    }

    private function assertAllowed(DatabaseTargetGuard $databaseTargetGuard): void
    {
        if (! app()->environment(['production', 'testing'])) {
            throw new RuntimeException('Release administrator bootstrap is restricted to production and automated tests.');
        }

        if (! (bool) config('operations.release_admin_bootstrap_enabled')) {
            throw new RuntimeException('YAZOO_RELEASE_ADMIN_BOOTSTRAP_ENABLED must be true.');
        }

        $targetFailures = $databaseTargetGuard->failures();
        if ($targetFailures !== []) {
            throw new RuntimeException(implode(' ', $targetFailures));
        }

        $expected = trim((string) config('operations.release_admin_bootstrap_confirmation'));
        $actual = trim((string) $this->option('confirmation'));
        if ($expected === '' || $actual === '' || ! hash_equals($expected, $actual)) {
            throw new RuntimeException('The release administrator database confirmation is invalid.');
        }
    }

    /**
     * @return array{name: string, email: string, password: string, mfa_secret: string, recovery_codes: list<string>}
     */
    private function validatedCredentials(): array
    {
        $recoveryCodes = array_values(array_unique(array_filter(array_map(
            static fn (string $code): string => strtoupper(trim($code)),
            explode(',', (string) config('operations.release_admin.mfa_recovery_codes')),
        ))));
        $credentials = [
            'name' => trim((string) config('operations.release_admin.name')),
            'email' => strtolower(trim((string) config('operations.release_admin.email'))),
            'password' => (string) config('operations.release_admin.password'),
            'mfa_secret' => strtoupper(trim((string) config('operations.release_admin.mfa_secret'))),
            'recovery_codes' => $recoveryCodes,
        ];

        $validator = Validator::make($credentials, [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email:rfc', 'max:255'],
            'password' => [
                'required',
                'string',
                Password::min(16)->letters()->mixedCase()->numbers()->symbols(),
            ],
            'mfa_secret' => ['required', 'regex:/^[A-Z2-7]{32,64}$/'],
            'recovery_codes' => ['required', 'array', 'size:8'],
            'recovery_codes.*' => ['required', 'regex:/^[A-F0-9]{10}$/'],
        ]);

        if ($validator->fails()) {
            throw new RuntimeException('Release administrator credentials are incomplete or invalid.');
        }

        return $credentials;
    }

    /**
     * @param  array{name: string, email: string, password: string, mfa_secret: string, recovery_codes: list<string>}  $credentials
     */
    private function createWhenRequired(array $credentials): bool
    {
        $admins = User::query()
            ->where('is_admin', true)
            ->lockForUpdate()
            ->get();
        $activeAdmin = $admins->first(
            fn (User $admin): bool => ! $admin->is_suspended
                && $admin->banned_at === null
                && $this->hasCompleteMfa($admin),
        );

        if ($activeAdmin !== null) {
            return false;
        }

        if ($admins->isNotEmpty()) {
            throw new RuntimeException('An administrator exists but is not eligible for release; repair it manually.');
        }

        if (User::query()->where('email', $credentials['email'])->lockForUpdate()->first() !== null) {
            throw new RuntimeException('The configured release administrator email already belongs to a non-admin account.');
        }

        $admin = new User;
        $admin->fill([
            'name' => $credentials['name'],
            'email' => $credentials['email'],
            'password' => $credentials['password'],
            'preferred_locale' => 'fr',
        ]);
        $admin->forceFill([
            'email_verified_at' => now(),
            'is_admin' => true,
            'is_suspended' => false,
            'banned_at' => null,
            'admin_mfa_secret' => $credentials['mfa_secret'],
            'admin_mfa_recovery_codes' => array_map(
                static fn (string $code): string => Hash::make($code),
                $credentials['recovery_codes'],
            ),
            'admin_mfa_confirmed_at' => now(),
        ])->save();

        return true;
    }

    private function hasCompleteMfa(User $admin): bool
    {
        return filled($admin->admin_mfa_secret)
            && $admin->admin_mfa_confirmed_at !== null
            && count($admin->admin_mfa_recovery_codes ?? []) > 0;
    }
}
