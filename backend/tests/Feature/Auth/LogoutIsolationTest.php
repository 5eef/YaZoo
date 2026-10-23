<?php

namespace Tests\Feature\Auth;

use App\Models\ProfessionalVerification;
use App\Models\User;
use App\Services\AuthService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Tests\TestCase;

class LogoutIsolationTest extends TestCase
{
    use RefreshDatabase;

    public function test_cookie_logout_revokes_each_account_and_rejects_the_old_cookie_in_both_orders(): void
    {
        config(['cors.allowed_origins' => ['http://localhost:4173']]);
        $client = User::factory()->create(['email' => 'client-isolated@example.test']);
        $vet = User::factory()->create(['email' => 'vet-isolated@example.test']);
        ProfessionalVerification::query()->create([
            'user_id' => $vet->id,
            'business_type' => 'veterinarian',
            'status' => 'approved',
            'document_path' => 'isolated/private.pdf',
        ]);

        foreach ([$client, $vet, $vet, $client] as $user) {
            Auth::forgetGuards();
            $token = $user->createToken('isolated-web');
            $cookie = app(AuthService::class)->makeAuthCookie($token->plainTextToken)->getValue();
            $this->withCredentials()->withUnencryptedCookie('yazoo_api_token', $cookie)
                ->getJson('/api/auth/me')->assertOk()->assertJsonPath('user.id', $user->id)
                ->assertHeader('Cache-Control', 'no-store, private');

            $this->withUnencryptedCookie('XSRF-TOKEN', 'isolated-csrf')
                ->withHeader('X-XSRF-TOKEN', 'isolated-csrf')
                ->withHeader('Origin', 'http://localhost:4173')
                ->postJson('/api/auth/logout')->assertOk()->assertCookieExpired('yazoo_api_token');
            $this->assertDatabaseMissing('personal_access_tokens', ['id' => $token->accessToken->id]);

            // Reuse the cookie deliberately; the server must reject even a failed browser deletion.
            Auth::forgetGuards();
            $this->withUnencryptedCookie('yazoo_api_token', $cookie)
                ->getJson('/api/auth/me')->assertUnauthorized();
        }
        $this->assertDatabaseCount('users', 2);
    }
}
