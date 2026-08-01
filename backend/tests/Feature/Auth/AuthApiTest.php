<?php

namespace Tests\Feature\Auth;

use App\Mail\VerifyEmailMail;
use App\Models\ProfessionalVerification;
use App\Models\User;
use App\Services\AccountSecurityService;
use App\Services\AuthService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Mail;
use Illuminate\Testing\TestResponse;
use Illuminate\Validation\ValidationException;
use Laravel\Socialite\Contracts\User as SocialiteUser;
use Tests\TestCase;

class AuthApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_api_root_returns_json_health_payload(): void
    {
        $this->getJson('/api')
            ->assertOk()
            ->assertJsonPath('status', 'ok');
    }

    public function test_user_can_register_and_receive_secure_cookie_only_token(): void
    {
        Mail::fake();

        $response = $this->postJson('/api/auth/register', [
            'name' => 'YaZoo Tester',
            'email' => 'tester@yazoo.app',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'phone' => '+212600000000',
            'country' => 'Maroc',
            'city' => 'Casablanca',
            'device_name' => 'phpunit',
        ]);

        $response
            ->assertCreated()
            ->assertCookie('yazoo_api_token')
            ->assertJsonPath('user.marketplacePublishing.canPublish', false)
            ->assertJsonPath('user.marketplacePublishing.destination', null)
            ->assertJsonStructure([
                'message',
                'user' => ['id', 'name', 'email', 'phone', 'country', 'city', 'isAdmin'],
            ]);

        $this->assertArrayNotHasKey('token', $response->json());
        $this->assertDatabaseHas('users', [
            'email' => 'tester@yazoo.app',
            'city' => 'Casablanca',
            'is_admin' => false,
        ]);
        $response->assertJsonPath('user.isAdmin', false);
        Mail::assertQueued(VerifyEmailMail::class);
    }

    public function test_registration_succeeds_when_verification_email_cannot_be_enqueued(): void
    {
        $this->mock(AccountSecurityService::class)
            ->shouldReceive('sendEmailVerification')
            ->once()
            ->andThrow(new \RuntimeException('Queue unavailable'));

        $this->postJson('/api/auth/register', [
            'name' => 'Queue Safe User',
            'email' => 'queue-safe@yazoo.app',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'phone' => '+212600000009',
            'country' => 'Maroc',
            'city' => 'Rabat',
            'device_name' => 'phpunit',
        ])->assertCreated();

        $this->assertDatabaseHas('users', [
            'email' => 'queue-safe@yazoo.app',
        ]);
    }

    public function test_user_can_login_me_and_logout_with_bearer_token_from_secure_cookie(): void
    {
        $user = User::factory()->admin()->create([
            'name' => 'Existing User',
            'email' => 'existing@yazoo.app',
            'password' => 'password123',
        ]);
        ProfessionalVerification::query()->create([
            'user_id' => $user->id,
            'business_type' => 'seller',
            'status' => 'approved',
            'document_path' => 'professional-verifications/private.pdf',
            'reviewed_by' => $user->id,
            'reviewed_at' => now(),
        ]);

        $loginResponse = $this->postJson('/api/auth/login', [
            'email' => 'existing@yazoo.app',
            'password' => 'password123',
            'device_name' => 'phpunit',
        ]);

        $token = $this->plainTokenFromCookie($loginResponse);

        $loginResponse
            ->assertOk()
            ->assertCookie('yazoo_api_token')
            ->assertJsonPath('user.email', $user->email)
            ->assertJsonPath('user.isAdmin', true)
            ->assertJsonPath('user.marketplacePublishing.canPublish', true)
            ->assertJsonPath('user.marketplacePublishing.destination', 'products');

        $this->assertArrayNotHasKey('token', $loginResponse->json());
        $this->assertArrayNotHasKey('documentPath', $loginResponse->json('user.marketplacePublishing'));
        $this->assertArrayNotHasKey('document_path', $loginResponse->json('user.marketplacePublishing'));

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/auth/me')
            ->assertOk()
            ->assertJsonPath('user.email', $user->email)
            ->assertJsonPath('user.isAdmin', true)
            ->assertJsonPath('user.marketplacePublishing.destination', 'products');

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson('/api/auth/logout')
            ->assertOk()
            ->assertJsonPath('message', 'Deconnexion reussie.');

        $this->assertDatabaseCount('personal_access_tokens', 0);
    }

    public function test_legacy_login_route_is_removed(): void
    {
        $this->postJson('/api/login', [
            'email' => 'legacy-login@yazoo.app',
            'password' => 'password123',
            'device_name' => 'legacy-api-client',
        ])->assertNotFound();
    }

    public function test_user_can_authenticate_with_the_http_only_cookie_flow(): void
    {
        $user = User::factory()->create([
            'email' => 'cookie@yazoo.app',
            'password' => 'password123',
        ]);

        $loginResponse = $this->postJson('/api/auth/login', [
            'email' => 'cookie@yazoo.app',
            'password' => 'password123',
            'device_name' => 'frontend',
        ]);

        $encryptedToken = $this->authCookieValue($loginResponse);

        $loginResponse
            ->assertOk()
            ->assertCookie('yazoo_api_token');

        $this->withCredentials()
            ->withUnencryptedCookie('yazoo_api_token', $encryptedToken)
            ->getJson('/api/auth/me')
            ->assertOk()
            ->assertJsonPath('user.email', $user->email);

        $this->withCredentials()
            ->withUnencryptedCookie('yazoo_api_token', $encryptedToken)
            ->withUnencryptedCookie('XSRF-TOKEN', 'csrf-test-token')
            ->withHeader('X-XSRF-TOKEN', 'csrf-test-token')
            ->withHeader('Origin', 'https://yazoo.azurewebsites.net')
            ->postJson('/api/auth/logout')
            ->assertOk()
            ->assertJsonPath('message', 'Deconnexion reussie.');
    }

    public function test_cookie_authenticated_mutation_requires_csrf_token(): void
    {
        User::factory()->create([
            'email' => 'csrf-missing@yazoo.app',
            'password' => 'password123',
        ]);

        $loginResponse = $this->postJson('/api/auth/login', [
            'email' => 'csrf-missing@yazoo.app',
            'password' => 'password123',
            'device_name' => 'frontend',
        ]);

        $this->withCredentials()
            ->withUnencryptedCookie('yazoo_api_token', $this->authCookieValue($loginResponse))
            ->withHeader('Origin', 'https://yazoo.azurewebsites.net')
            ->postJson('/api/posts', [
                'content' => 'Mutation sans CSRF',
                'visibility' => 'public',
            ])
            ->assertStatus(419);
    }

    public function test_cookie_authenticated_mutation_rejects_untrusted_origin(): void
    {
        User::factory()->create([
            'email' => 'csrf-origin@yazoo.app',
            'password' => 'password123',
        ]);

        $loginResponse = $this->postJson('/api/auth/login', [
            'email' => 'csrf-origin@yazoo.app',
            'password' => 'password123',
            'device_name' => 'frontend',
        ]);

        $this->withCredentials()
            ->withUnencryptedCookie('yazoo_api_token', $this->authCookieValue($loginResponse))
            ->withUnencryptedCookie('XSRF-TOKEN', 'csrf-test-token')
            ->withHeader('X-XSRF-TOKEN', 'csrf-test-token')
            ->withHeader('Origin', 'https://evil.example')
            ->postJson('/api/posts', [
                'content' => 'Mutation mauvaise origine',
                'visibility' => 'public',
            ])
            ->assertStatus(419);
    }

    public function test_cookie_authenticated_mutation_with_csrf_succeeds_and_get_remains_read_only(): void
    {
        User::factory()->create([
            'email' => 'csrf-ok@yazoo.app',
            'password' => 'password123',
        ]);

        $loginResponse = $this->postJson('/api/auth/login', [
            'email' => 'csrf-ok@yazoo.app',
            'password' => 'password123',
            'device_name' => 'frontend',
        ]);
        $encryptedToken = $this->authCookieValue($loginResponse);

        $this->withCredentials()
            ->withUnencryptedCookie('yazoo_api_token', $encryptedToken)
            ->getJson('/api/posts')
            ->assertOk();

        $this->withCredentials()
            ->withUnencryptedCookie('yazoo_api_token', $encryptedToken)
            ->withUnencryptedCookie('XSRF-TOKEN', 'csrf-test-token')
            ->withHeader('X-XSRF-TOKEN', 'csrf-test-token')
            ->withHeader('Origin', 'https://yazoo.azurewebsites.net')
            ->postJson('/api/posts', [
                'content' => 'Mutation avec CSRF',
                'visibility' => 'public',
            ])
            ->assertCreated();
    }

    public function test_bearer_mutation_does_not_require_cookie_csrf(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('api-client')->plainTextToken;

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson('/api/posts', [
                'content' => 'Mutation Bearer legitime',
                'visibility' => 'public',
            ])
            ->assertCreated();
    }

    public function test_request_otp_never_exposes_debug_code(): void
    {
        config(['services.sms.driver' => 'log']);
        User::factory()->create([
            'phone' => '+212600000010',
        ]);

        $response = $this->postJson('/api/auth/otp/request', [
            'phone' => '+212600000010',
            'intent' => 'login',
        ]);

        $response
            ->assertOk()
            ->assertJsonStructure(['message', 'expires_at']);

        $this->assertArrayNotHasKey('otp_debug_code', $response->json());
    }

    public function test_request_otp_fails_when_sms_is_disabled(): void
    {
        config(['services.sms.driver' => 'disabled']);
        User::factory()->create(['phone' => '+212600000011']);

        $this->postJson('/api/auth/otp/request', [
            'phone' => '+212600000011',
            'intent' => 'login',
        ])
            ->assertServiceUnavailable()
            ->assertJsonMissing(['expires_at']);
    }

    public function test_login_rejects_invalid_credentials(): void
    {
        User::factory()->create([
            'email' => 'wrong@yazoo.app',
            'password' => 'password123',
        ]);

        $this->postJson('/api/auth/login', [
            'email' => 'wrong@yazoo.app',
            'password' => 'bad-password',
            'device_name' => 'phpunit',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['email']);
    }

    public function test_login_rate_limit_does_not_mix_distinct_accounts_on_the_same_ip(): void
    {
        foreach (range(1, 14) as $index) {
            $this->postJson('/api/auth/login', [
                'email' => "manual-test-{$index}@yazoo.app",
                'password' => 'bad-password',
                'device_name' => 'phpunit',
            ])
                ->assertUnprocessable()
                ->assertJsonValidationErrors(['email']);
        }
    }

    public function test_login_rate_limit_blocks_repeated_attempts_for_the_same_account(): void
    {
        User::factory()->create([
            'email' => 'rate-limited@yazoo.app',
            'password' => 'password123',
        ]);

        foreach (range(1, 5) as $attempt) {
            $this->postJson('/api/auth/login', [
                'email' => 'rate-limited@yazoo.app',
                'password' => 'bad-password',
                'device_name' => 'phpunit',
            ])->assertUnprocessable();
        }

        $this->postJson('/api/auth/login', [
            'email' => 'rate-limited@yazoo.app',
            'password' => 'bad-password',
            'device_name' => 'phpunit',
        ])
            ->assertTooManyRequests()
            ->assertHeader('Retry-After')
            ->assertJsonPath('message', __('messages.auth.login_throttled'));
    }

    public function test_banned_user_cannot_login_with_password(): void
    {
        User::factory()->create([
            'email' => 'banned@yazoo.app',
            'password' => 'password123',
            'banned_at' => now(),
            'banned_reason' => 'Abus',
        ]);

        $this->postJson('/api/auth/login', [
            'email' => 'banned@yazoo.app',
            'password' => 'password123',
            'device_name' => 'phpunit',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['email']);
    }

    public function test_unauthenticated_plain_api_request_returns_json_instead_of_a_server_error(): void
    {
        $this->get('/api/auth/me')
            ->assertUnauthorized()
            ->assertJson([
                'message' => 'Unauthenticated.',
            ]);
    }

    public function test_public_registration_does_not_create_admin_when_bootstrap_disabled(): void
    {
        $firstResponse = $this->postJson('/api/auth/register', [
            'name' => 'Premier Utilisateur',
            'email' => 'first@yazoo.app',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'device_name' => 'phpunit',
        ]);

        $secondResponse = $this->postJson('/api/auth/register', [
            'name' => 'Second User',
            'email' => 'user@yazoo.app',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'device_name' => 'phpunit',
        ]);

        $firstResponse
            ->assertCreated()
            ->assertJsonPath('user.isAdmin', false);

        $secondResponse
            ->assertCreated()
            ->assertJsonPath('user.isAdmin', false);
    }

    public function test_admin_bootstrap_only_works_when_explicitly_enabled_outside_production(): void
    {
        config(['auth.admin_bootstrap.enabled' => true]);

        $firstResponse = $this->postJson('/api/auth/register', [
            'name' => 'Bootstrap Admin',
            'email' => 'bootstrap-admin@yazoo.app',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'device_name' => 'phpunit',
        ]);

        $secondResponse = $this->postJson('/api/auth/register', [
            'name' => 'Regular User',
            'email' => 'regular-user@yazoo.app',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'device_name' => 'phpunit',
        ]);

        $firstResponse
            ->assertCreated()
            ->assertJsonPath('user.isAdmin', true);

        $secondResponse
            ->assertCreated()
            ->assertJsonPath('user.isAdmin', false);
    }

    public function test_admin_bootstrap_is_blocked_in_production_even_when_enabled(): void
    {
        config(['auth.admin_bootstrap.enabled' => true]);
        $this->app->detectEnvironment(fn () => 'production');

        $response = $this
            ->withHeader('X-Forwarded-Proto', 'https')
            ->postJson('/api/auth/register', [
                'name' => 'Production User',
                'email' => 'production-user@yazoo.app',
                'password' => 'password123',
                'password_confirmation' => 'password123',
                'device_name' => 'phpunit',
            ]);

        $response
            ->assertCreated()
            ->assertJsonPath('user.isAdmin', false);
    }

    public function test_google_oauth_never_creates_admin_automatically_in_production(): void
    {
        config(['auth.admin_bootstrap.enabled' => true]);
        $this->app->detectEnvironment(fn () => 'production');

        $result = app(AuthService::class)->loginWithGoogle($this->googleUser(
            'google-123',
            'google-user@yazoo.app',
            'Google User',
        ));

        $this->assertFalse($result->user->is_admin);
        $this->assertSame(
            [
                'canPublish' => false,
                'businessType' => null,
                'verificationStatus' => null,
                'destination' => null,
                'serviceType' => null,
            ],
            app(AuthService::class)->userPayload($result->user)['marketplacePublishing'],
        );
        $this->assertDatabaseHas('users', [
            'email' => 'google-user@yazoo.app',
            'is_admin' => false,
        ]);
    }

    public function test_google_oauth_creates_a_normalized_non_admin_account(): void
    {
        config(['auth.admin_bootstrap.enabled' => true]);

        $result = app(AuthService::class)->loginWithGoogle($this->googleUser(
            'google-new-user',
            '  NEW-GOOGLE@YAZOO.APP  ',
            'New Google User',
        ));

        $this->assertSame('new-google@yazoo.app', $result->user->email);
        $this->assertSame('google-new-user', $result->user->google_id);
        $this->assertFalse($result->user->is_admin);
        $this->assertNotEmpty($result->plainTextToken);
    }

    public function test_google_oauth_links_an_existing_email_account_without_replacing_identity(): void
    {
        $existing = User::factory()->create([
            'email' => 'Existing-Google@YaZoo.App',
            'google_id' => null,
            'is_admin' => false,
        ]);

        $result = app(AuthService::class)->loginWithGoogle($this->googleUser(
            'google-existing-user',
            'existing-google@yazoo.app',
            'Existing Google User',
        ));

        $this->assertTrue($result->user->is($existing));
        $this->assertSame('google-existing-user', $existing->refresh()->google_id);
        $this->assertFalse($existing->is_admin);
    }

    public function test_google_oauth_rejects_conflicting_google_identity_links(): void
    {
        User::factory()->create([
            'email' => 'first-google@yazoo.app',
            'google_id' => 'google-conflict',
        ]);

        User::factory()->create([
            'email' => 'second-google@yazoo.app',
            'google_id' => null,
        ]);

        $this->expectException(ValidationException::class);

        app(AuthService::class)->loginWithGoogle($this->googleUser(
            'google-conflict',
            'second-google@yazoo.app',
            'Conflicting Google User',
        ));
    }

    public function test_google_oauth_never_replaces_an_existing_google_link(): void
    {
        User::factory()->create([
            'email' => 'linked-google@yazoo.app',
            'google_id' => 'google-original',
        ]);

        $this->expectException(ValidationException::class);

        app(AuthService::class)->loginWithGoogle($this->googleUser(
            'google-attacker',
            'linked-google@yazoo.app',
            'Different Google User',
        ));
    }

    public function test_google_oauth_rejects_an_empty_google_identifier(): void
    {
        $this->expectException(ValidationException::class);

        app(AuthService::class)->loginWithGoogle($this->googleUser(
            '',
            'missing-id@yazoo.app',
            'Missing Google Id',
        ));
    }

    public function test_google_oauth_refuses_existing_banned_user(): void
    {
        $user = User::factory()->create([
            'email' => 'banned-google@yazoo.app',
            'google_id' => null,
            'banned_at' => now(),
            'banned_reason' => 'Abus',
        ]);

        try {
            app(AuthService::class)->loginWithGoogle($this->googleUser(
                'google-banned',
                'banned-google@yazoo.app',
                'Banned Google User',
            ));
            $this->fail('A banned account must not authenticate with Google.');
        } catch (ValidationException) {
            $this->assertNull($user->refresh()->google_id);
            $this->assertDatabaseCount('personal_access_tokens', 0);
        }
    }

    public function test_google_oauth_missing_configuration_returns_a_clean_frontend_error(): void
    {
        config([
            'services.google.client_id' => null,
            'services.google.client_secret' => null,
            'services.google.redirect' => null,
            'services.google.login_redirect' => 'https://yazoo.test/login',
        ]);

        $this->get('/api/auth/google')
            ->assertRedirect('https://yazoo.test/login?auth_error=google_not_configured');
    }

    public function test_google_oauth_redirect_uses_a_session_backed_state_value(): void
    {
        config([
            'services.google.client_id' => 'test-client-id',
            'services.google.client_secret' => 'oauth-fixture',
            'services.google.redirect' => 'https://api.yazoo.test/api/auth/google/callback',
        ]);

        $response = $this->get('/api/auth/google');
        $location = (string) $response->headers->get('Location');
        $query = [];

        parse_str((string) parse_url($location, PHP_URL_QUERY), $query);

        $response->assertRedirect();
        $this->assertNotEmpty($query['state'] ?? null);
        $this->assertSame($query['state'], session('state'));
    }

    public function test_create_admin_command_can_create_an_admin(): void
    {
        $this->artisan('yazoo:create-admin', [
            '--name' => 'Commission Admin',
            '--email' => 'commission-admin@example.com',
        ])
            ->expectsQuestion('Mot de passe admin', 'Password123')
            ->expectsQuestion('Confirmer le mot de passe admin', 'Password123')
            ->expectsConfirmation('Creer un administrateur pour commission-admin@example.com ?', 'yes')
            ->assertExitCode(0);

        $this->assertDatabaseHas('users', [
            'email' => 'commission-admin@example.com',
            'is_admin' => true,
        ]);
    }

    public function test_create_admin_command_can_promote_existing_user(): void
    {
        User::factory()->create([
            'email' => 'promote-me@example.com',
            'is_admin' => false,
        ]);

        $this->artisan('yazoo:create-admin', [
            '--email' => 'promote-me@example.com',
            '--promote' => true,
        ])
            ->expectsConfirmation('Promouvoir promote-me@example.com en administrateur ?', 'yes')
            ->assertExitCode(0);

        $this->assertDatabaseHas('users', [
            'email' => 'promote-me@example.com',
            'is_admin' => true,
        ]);
    }

    public function test_create_admin_command_rejects_a_weak_password(): void
    {
        $this->artisan('yazoo:create-admin', [
            '--name' => 'Weak Admin',
            '--email' => 'weak-admin@example.com',
        ])
            ->expectsQuestion('Mot de passe admin', 'password')
            ->expectsQuestion('Confirmer le mot de passe admin', 'password')
            ->assertExitCode(1);

        $this->assertDatabaseMissing('users', [
            'email' => 'weak-admin@example.com',
        ]);
    }

    public function test_create_admin_command_is_idempotent_for_an_existing_admin(): void
    {
        User::factory()->admin()->create(['email' => 'existing-admin@example.com']);

        $this->artisan('yazoo:create-admin', [
            '--email' => 'existing-admin@example.com',
            '--promote' => true,
        ])
            ->expectsOutput("L'utilisateur existing-admin@example.com est deja admin.")
            ->assertExitCode(0);

        $this->assertSame(1, User::query()->where('email', 'existing-admin@example.com')->count());
    }

    private function plainTokenFromCookie(TestResponse $response): string
    {
        return Crypt::decryptString(rawurldecode($this->authCookieValue($response)));
    }

    private function authCookieValue(TestResponse $response): string
    {
        foreach ($response->headers->getCookies() as $cookie) {
            if ($cookie->getName() === 'yazoo_api_token') {
                return $cookie->getValue();
            }
        }

        $this->fail('Missing yazoo_api_token cookie.');
    }

    private function googleUser(string $id, string $email, string $name): SocialiteUser
    {
        return new class($id, $email, $name) implements SocialiteUser
        {
            public function __construct(
                private string $id,
                private string $email,
                private string $name,
            ) {}

            public function getId()
            {
                return $this->id;
            }

            public function getNickname()
            {
                return null;
            }

            public function getName()
            {
                return $this->name;
            }

            public function getEmail()
            {
                return $this->email;
            }

            public function getAvatar()
            {
                return null;
            }
        };
    }
}
