<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use App\Support\Totp;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminMfaTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_enroll_confirm_and_challenge_without_reexposing_secret(): void
    {
        $admin = User::factory()->create([
            'is_admin' => true,
            'password' => Hash::make('StrongPass!123'),
        ]);
        Sanctum::actingAs($admin);

        $enrollment = $this->postJson('/api/admin/mfa/enroll', ['password' => 'StrongPass!123'])
            ->assertOk()
            ->assertJsonCount(8, 'recovery_codes')
            ->assertJsonStructure(['otpauth_uri', 'recovery_codes']);

        $admin->refresh();
        $this->assertStringStartsWith('otpauth://totp/', $enrollment->json('otpauth_uri'));
        $this->assertNotSame($enrollment->json('recovery_codes.0'), $admin->admin_mfa_recovery_codes[0]);
        $this->assertArrayNotHasKey('admin_mfa_secret', $admin->toArray());

        $code = Totp::code((string) $admin->admin_mfa_secret, intdiv(time(), 30));
        $this->postJson('/api/admin/mfa/confirm', ['code' => $code])->assertOk();
        $this->assertNotNull($admin->refresh()->admin_mfa_confirmed_at);

        $this->getJson('/api/admin/mfa')
            ->assertOk()
            ->assertJsonMissing(['otpauth_uri'])
            ->assertJsonPath('enabled', true);

        $this->postJson('/api/admin/mfa/challenge', ['code' => $code])->assertOk();
    }

    public function test_confirmed_admin_must_challenge_before_sensitive_action(): void
    {
        $secret = Totp::secret();
        $admin = User::factory()->create([
            'is_admin' => true,
            'admin_mfa_secret' => $secret,
            'admin_mfa_recovery_codes' => [Hash::make('ABCDE12345')],
            'admin_mfa_confirmed_at' => now(),
        ]);
        Sanctum::actingAs($admin);

        $this->getJson('/api/admin/exports/stats.csv')
            ->assertStatus(423)
            ->assertJsonPath('reason', 'challenge_required');

        $this->postJson('/api/admin/mfa/challenge', [
            'code' => Totp::code($secret, intdiv(time(), 30)),
        ])->assertOk();

        $this->getJson('/api/admin/exports/stats.csv')->assertOk();
    }

    public function test_recovery_code_is_one_time_and_disable_requires_password_and_totp(): void
    {
        $secret = Totp::secret();
        $admin = User::factory()->create([
            'is_admin' => true,
            'password' => Hash::make('StrongPass!123'),
            'admin_mfa_secret' => $secret,
            'admin_mfa_recovery_codes' => [Hash::make('ABCDE12345')],
            'admin_mfa_confirmed_at' => now(),
        ]);
        Sanctum::actingAs($admin);

        $this->postJson('/api/admin/mfa/challenge', ['code' => 'ABCDE12345'])->assertOk();
        $this->postJson('/api/admin/mfa/challenge', ['code' => 'ABCDE12345'])->assertUnprocessable();

        $code = Totp::code($secret, intdiv(time(), 30));
        $this->deleteJson('/api/admin/mfa', [
            'password' => 'wrong',
            'code' => $code,
        ])->assertUnprocessable();

        $this->deleteJson('/api/admin/mfa', [
            'password' => 'StrongPass!123',
            'code' => $code,
        ])->assertOk();

        $admin->refresh();
        $this->assertNull($admin->admin_mfa_secret);
        $this->assertNull($admin->admin_mfa_confirmed_at);
    }

    public function test_enforcement_preflight_and_middleware_do_not_lock_out_unenrolled_admins_during_rollout(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);
        Sanctum::actingAs($admin);

        config(['auth.admin_mfa.enforced' => false]);
        $this->getJson('/api/admin/exports/stats.csv')->assertOk();

        config(['auth.admin_mfa.enforced' => true]);
        $this->getJson('/api/admin/exports/stats.csv')
            ->assertStatus(423)
            ->assertJsonPath('reason', 'enrollment_required');
    }

    public function test_unenrolled_admin_can_only_access_mfa_bootstrap_when_enforcement_is_enabled(): void
    {
        $admin = User::factory()->admin()->create([
            'password' => Hash::make('StrongPass!123'),
        ]);
        Sanctum::actingAs($admin);
        config(['auth.admin_mfa.enforced' => true]);

        $this->getJson('/api/admin/mfa')->assertOk();
        $this->postJson('/api/admin/mfa/enroll', ['password' => 'StrongPass!123'])->assertOk();

        $this->getJson('/api/admin/stats')
            ->assertStatus(423)
            ->assertJsonPath('reason', 'enrollment_required');
        $this->postJson('/api/admin/users', [
            'name' => 'Blocked Admin',
            'email' => 'blocked-admin@example.com',
            'password' => 'StrongPass!123',
            'password_confirmation' => 'StrongPass!123',
            'is_admin' => true,
        ])->assertStatus(423);
    }

    public function test_sensitive_user_attributes_are_not_mass_assignable(): void
    {
        $user = User::factory()->create();
        $protectedAttributes = [
            'is_admin',
            'is_suspended',
            'suspended_at',
            'suspended_reason',
            'banned_at',
            'banned_reason',
            'phone_verified_at',
            'google_id',
            'google_avatar',
            'admin_mfa_secret',
            'admin_mfa_recovery_codes',
            'admin_mfa_confirmed_at',
        ];
        $original = collect($protectedAttributes)
            ->mapWithKeys(fn (string $key): array => [$key => $user->getRawOriginal($key)])
            ->all();

        $user->fill([
            'is_admin' => true,
            'is_suspended' => true,
            'suspended_at' => now(),
            'suspended_reason' => 'payload',
            'banned_at' => now(),
            'banned_reason' => 'payload',
            'phone_verified_at' => now(),
            'google_id' => 'attacker-google-id',
            'google_avatar' => 'https://attacker.invalid/avatar.jpg',
            'admin_mfa_secret' => Totp::secret(),
            'admin_mfa_recovery_codes' => ['attacker-code'],
            'admin_mfa_confirmed_at' => now(),
        ])->save();

        $user->refresh();
        foreach ($original as $key => $value) {
            $this->assertEquals($value, $user->getRawOriginal($key), $key.' was unexpectedly mass assigned.');
        }
    }
}
