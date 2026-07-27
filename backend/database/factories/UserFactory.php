<?php

namespace Database\Factories;

use App\Models\ProfessionalVerification;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * @extends Factory<User>
 */
class UserFactory extends Factory
{
    /**
     * The current password being used by the factory.
     */
    protected static ?string $password;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->name(),
            'email' => fake()->unique()->safeEmail(),
            'email_verified_at' => now(),
            'phone' => '+2126'.fake()->unique()->numerify('########'),
            'phone_verified_at' => now(),
            'preferred_locale' => 'fr',
            'is_admin' => false,
            'password' => static::$password ??= Hash::make('password'),
            'remember_token' => Str::random(10),
        ];
    }

    /**
     * Indicate that the model's email address should be unverified.
     */
    public function unverified(): static
    {
        return $this->state(fn (array $attributes) => [
            'email_verified_at' => null,
        ]);
    }

    /**
     * Indicate that the user is an admin.
     */
    public function admin(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_admin' => true,
        ]);
    }

    public function approvedProfessional(string $businessType): static
    {
        return $this->afterCreating(function (User $user) use ($businessType): void {
            $admin = User::factory()->admin()->create();

            ProfessionalVerification::query()->create([
                'user_id' => $user->id,
                'business_type' => $businessType,
                'legal_name' => $user->name,
                'document_type' => $businessType === 'veterinarian'
                    ? 'veterinarian_license'
                    : 'professional_card',
                'professional_license_number' => $businessType === 'veterinarian'
                    ? 'VET-'.str_pad((string) $user->id, 6, '0', STR_PAD_LEFT)
                    : null,
                'document_path' => 'professional-verifications/test-document.pdf',
                'document_expires_at' => now()->addYear(),
                'status' => 'approved',
                'verified_by' => $admin->id,
                'verified_at' => now(),
                'reviewed_by' => $admin->id,
                'reviewed_at' => now(),
            ]);
        });
    }
}
