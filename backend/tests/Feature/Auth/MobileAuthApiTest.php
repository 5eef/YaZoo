<?php

namespace Tests\Feature\Auth;

use App\Mail\VerifyEmailMail;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Laravel\Sanctum\PersonalAccessToken;
use Tests\TestCase;

class MobileAuthApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_native_validation_errors_are_localized_without_translation_keys(): void
    {
        foreach (['fr' => 'adresse email valide', 'en' => 'valid email address', 'ar' => 'بريداً إلكترونياً صالحاً'] as $locale => $message) {
            $response = $this->withHeader('Accept-Language', $locale)->postJson('/api/auth/mobile/login', ['email' => 'invalid-email', 'password' => 'test-only', 'device_name' => 'QA Android']);
            $response->assertUnprocessable()->assertJsonMissingPath('token');
            $this->assertStringContainsString($message, $response->json('errors.email.0'));
            $this->assertStringNotContainsString('validation.', $response->json('errors.email.0'));
        }
        $this->assertDatabaseCount('personal_access_tokens', 0);
    }

    public function test_mobile_login_and_logout_revoke_device_token(): void
    {
        User::factory()->create(['email' => 'native@example.test', 'password' => 'password123']);
        $response = $this->postJson('/api/auth/mobile/login', ['email' => 'native@example.test', 'password' => 'password123', 'device_name' => 'Android pilot']);
        $response->assertOk()->assertCookieMissing('yazoo_api_token')->assertJsonPath('token_type', 'Bearer');
        $token = $response->json('token');
        $this->assertNotNull(PersonalAccessToken::findToken($token)->expires_at);
        $this->withToken($token)->getJson('/api/auth/me')->assertOk();
        $this->withToken($token)->postJson('/api/auth/logout')->assertOk();
        $this->assertNull(PersonalAccessToken::findToken($token));
        $this->app['auth']->forgetGuards();
        $this->withToken($token)->getJson('/api/auth/me')->assertUnauthorized();
    }

    public function test_invalid_credentials_and_missing_device_do_not_issue_token(): void
    {
        User::factory()->create(['email' => 'native@example.test', 'password' => 'password123']);
        $this->postJson('/api/auth/mobile/login', ['email' => 'native@example.test', 'password' => 'incorrect', 'device_name' => 'Android'])->assertUnprocessable()->assertJsonMissingPath('token');
        $this->postJson('/api/auth/mobile/login', ['email' => 'native@example.test', 'password' => 'password123'])->assertUnprocessable();
        $this->assertDatabaseCount('personal_access_tokens', 0);
    }

    public function test_mobile_registration_reuses_business_validation_and_verification_email(): void
    {
        Mail::fake();
        $this->postJson('/api/auth/mobile/register', ['name' => 'Native Owner', 'email' => 'new@example.test', 'password' => 'password123', 'password_confirmation' => 'password123', 'preferred_locale' => 'ar', 'device_name' => 'Android'])->assertCreated()->assertCookieMissing('yazoo_api_token')->assertJsonPath('user.isAdmin', false)->assertJsonStructure(['token', 'expires_at']);
        Mail::assertQueued(VerifyEmailMail::class);
        $this->postJson('/api/auth/mobile/register', ['name' => 'Invalid', 'email' => 'other@example.test', 'device_name' => 'Android'])->assertUnprocessable();
    }
}
