<?php

namespace Tests\Feature\Auth;

use App\Mail\AccountRecoveryMail;
use App\Mail\VerifyEmailMail;
use App\Models\AccountRecoveryToken;
use App\Models\User;
use App\Support\Auth\PhoneOtpBroker;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\URL;
use Laravel\Sanctum\Sanctum;
use Mockery;
use Tests\TestCase;

class AccountSecurityTest extends TestCase
{
    use RefreshDatabase;

    public function test_email_recovery_is_generic_hashed_single_use_and_revokes_tokens(): void
    {
        Mail::fake();
        $user = User::factory()->create([
            'email' => 'recovery@example.test',
            'password' => 'OldStrong!Pass123',
        ]);
        $user->createToken('existing-session');

        $known = $this->postJson('/api/auth/password/forgot', [
            'channel' => 'email',
            'identifier' => 'recovery@example.test',
        ])->assertOk();
        $unknown = $this->postJson('/api/auth/password/forgot', [
            'channel' => 'email',
            'identifier' => 'unknown@example.test',
        ])->assertOk();

        $this->assertSame($known->json('message'), $unknown->json('message'));
        $record = AccountRecoveryToken::query()->sole();
        $this->assertSame(64, strlen($record->token_hash));

        $sentMail = null;
        Mail::assertSent(AccountRecoveryMail::class, function (AccountRecoveryMail $mail) use (&$sentMail): bool {
            $sentMail = $mail;

            return $mail->hasTo('recovery@example.test');
        });
        $this->assertNotNull($sentMail);

        parse_str((string) parse_url($sentMail->resetUrl, PHP_URL_QUERY), $query);
        $plainToken = $query['token'] ?? '';
        $this->assertNotSame($plainToken, $record->token_hash);
        $this->assertSame(hash('sha256', $plainToken), $record->token_hash);

        $payload = [
            'channel' => 'email',
            'identifier' => 'recovery@example.test',
            'token' => $plainToken,
            'password' => 'NewStrong!Pass123',
            'password_confirmation' => 'NewStrong!Pass123',
        ];

        $this->postJson('/api/auth/password/reset', $payload)->assertOk();
        $this->assertTrue(Hash::check('NewStrong!Pass123', $user->fresh()->password));
        $this->assertDatabaseCount('personal_access_tokens', 0);

        $this->postJson('/api/auth/password/reset', $payload)
            ->assertUnprocessable()
            ->assertJsonValidationErrors('identifier');
    }

    public function test_expired_email_recovery_token_and_weak_password_are_rejected(): void
    {
        Mail::fake();
        $user = User::factory()->create(['email' => 'expired@example.test']);

        $this->postJson('/api/auth/password/forgot', [
            'channel' => 'email',
            'identifier' => $user->email,
        ])->assertOk();

        $mail = null;
        Mail::assertSent(AccountRecoveryMail::class, function (AccountRecoveryMail $sent) use (&$mail): bool {
            $mail = $sent;

            return true;
        });
        parse_str((string) parse_url($mail->resetUrl, PHP_URL_QUERY), $query);

        $this->postJson('/api/auth/password/reset', [
            'channel' => 'email',
            'identifier' => $user->email,
            'token' => $query['token'],
            'password' => 'weak',
            'password_confirmation' => 'weak',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('password');

        AccountRecoveryToken::query()->update(['expires_at' => now()->subMinute()]);

        $this->postJson('/api/auth/password/reset', [
            'channel' => 'email',
            'identifier' => $user->email,
            'token' => $query['token'],
            'password' => 'NewStrong!Pass123',
            'password_confirmation' => 'NewStrong!Pass123',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('identifier');
    }

    public function test_phone_recovery_uses_existing_otp_broker_without_exposing_a_code(): void
    {
        $user = User::factory()->create([
            'phone' => '+212600000050',
            'password' => 'OldStrong!Pass123',
        ]);
        $broker = Mockery::mock(PhoneOtpBroker::class);
        $broker->shouldReceive('isAvailable')->once()->andReturnTrue();
        $broker->shouldReceive('send')
            ->once()
            ->with('+212600000050', 'password_reset')
            ->andReturn(['debug_code' => '123456', 'expires_at' => now()->addMinutes(5)->toISOString()]);
        $broker->shouldReceive('consume')
            ->once()
            ->with('+212600000050', 'password_reset', '123456');
        $this->app->instance(PhoneOtpBroker::class, $broker);

        $response = $this->postJson('/api/auth/password/forgot', [
            'channel' => 'phone',
            'identifier' => '+212600000050',
        ])
            ->assertOk()
            ->assertJsonMissingPath('debug_code')
            ->assertJsonMissingPath('otp_code');

        $this->assertStringNotContainsString('123456', $response->getContent());

        $this->postJson('/api/auth/password/reset', [
            'channel' => 'phone',
            'identifier' => '+212600000050',
            'otp_code' => '123456',
            'password' => 'PhoneStrong!Pass123',
            'password_confirmation' => 'PhoneStrong!Pass123',
        ])->assertOk();

        $this->assertTrue(Hash::check('PhoneStrong!Pass123', $user->fresh()->password));
    }

    public function test_signed_email_verification_expires_and_resend_is_limited_by_route(): void
    {
        Mail::fake();
        $user = User::factory()->create([
            'email' => 'verify@example.test',
            'email_verified_at' => null,
        ]);
        Sanctum::actingAs($user, ['*']);

        $this->postJson('/api/auth/email/verification-notification')->assertOk();

        $mail = null;
        Mail::assertSent(VerifyEmailMail::class, function (VerifyEmailMail $sent) use (&$mail): bool {
            $mail = $sent;

            return $sent->hasTo('verify@example.test');
        });

        $this->getJson($mail->verificationUrl)
            ->assertOk()
            ->assertJsonPath('message', __('messages.auth.email_verified'));
        $this->assertNotNull($user->fresh()->email_verified_at);

        $expiredUrl = URL::temporarySignedRoute(
            'verification.verify',
            now()->subMinute(),
            ['user' => $user->id, 'hash' => sha1(strtolower($user->email))],
        );
        $this->getJson($expiredUrl)->assertForbidden();
    }

    public function test_changing_email_removes_verification_and_revokes_existing_sessions(): void
    {
        $user = User::factory()->create([
            'email' => 'old@example.test',
            'email_verified_at' => now(),
        ]);
        $user->createToken('other-device');
        Sanctum::actingAs($user, ['*']);

        $this->patchJson("/api/users/{$user->id}", [
            'name' => $user->name,
            'email' => 'new@example.test',
        ])->assertOk();

        $fresh = $user->fresh();
        $this->assertSame('new@example.test', $fresh->email);
        $this->assertNull($fresh->email_verified_at);
        $this->assertDatabaseCount('personal_access_tokens', 0);
    }
}
