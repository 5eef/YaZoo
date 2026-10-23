<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class RegistrationIntegrityTest extends TestCase
{
    use RefreshDatabase;

    public function test_invalid_or_duplicate_registration_never_changes_an_existing_identity(): void
    {
        Mail::fake();
        $existing = User::factory()->create(['email' => 'existing@registration-isolated.test']);
        $passwordHash = $existing->password;
        $this->postJson('/api/auth/register', [
            'name' => '', 'email' => 'invalid-email',
            'password' => 'short', 'password_confirmation' => 'different',
        ])->assertUnprocessable()->assertJsonValidationErrors(['name', 'email', 'password']);
        $this->postJson('/api/auth/register', [
            'name' => 'Duplicate isolated identity', 'email' => $existing->email,
            'password' => 'Registration-Isolated-2026!',
            'password_confirmation' => 'Registration-Isolated-2026!',
            'city' => 'Sefrou',
        ])->assertUnprocessable()->assertJsonValidationErrors(['email']);
        $this->assertDatabaseCount('users', 1);
        $this->assertDatabaseCount('personal_access_tokens', 0);
        $this->assertSame($passwordHash, $existing->fresh()->password);
        Mail::assertNothingQueued();
    }
}
