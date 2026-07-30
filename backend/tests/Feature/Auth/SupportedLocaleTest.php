<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SupportedLocaleTest extends TestCase
{
    use RefreshDatabase;

    public function test_fr_ar_and_en_are_accepted_for_profile_preferences(): void
    {
        foreach (User::SUPPORTED_LOCALES as $locale) {
            $user = User::factory()->create();
            Sanctum::actingAs($user, ['*']);

            $this->patchJson("/api/users/{$user->id}", [
                'name' => $user->name,
                'preferred_locale' => $locale,
            ])
                ->assertOk()
                ->assertJsonPath('data.preferredLocale', $locale);

            $this->assertDatabaseHas('users', [
                'id' => $user->id,
                'preferred_locale' => $locale,
            ]);
        }
    }

    public function test_unsupported_profile_locales_are_rejected_cleanly(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user, ['*']);

        foreach (['de', 'es', 'nl', 'pt', 'it', 'ru'] as $locale) {
            $this->patchJson("/api/users/{$user->id}", [
                'name' => $user->name,
                'preferred_locale' => $locale,
            ])
                ->assertUnprocessable()
                ->assertJsonValidationErrors('preferred_locale');
        }
    }

    public function test_legacy_invalid_locale_falls_back_to_french_without_crashing(): void
    {
        $user = User::factory()->create();
        DB::table('users')->where('id', $user->id)->update([
            'preferred_locale' => 'de',
        ]);
        $user->refresh();

        $this->assertSame('fr', $user->preferred_locale);

        Sanctum::actingAs($user, ['*']);
        $this->getJson("/api/users/{$user->id}")
            ->assertOk()
            ->assertJsonPath('data.preferredLocale', 'fr');
    }
}
