<?php

namespace Database\Factories;

use App\Models\User;
use App\Models\Veterinarian;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Veterinarian>
 */
class VeterinarianFactory extends Factory
{
    protected $model = Veterinarian::class;

    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'name' => fake()->name(),
            'clinic_name' => fake()->company().' Vet',
            'description' => fake()->paragraph(),
            'city' => fake()->city(),
            'address' => fake()->streetAddress(),
            'phone' => '+212600000000',
            'whatsapp' => '+212600000000',
            'email' => fake()->safeEmail(),
            'specialties' => ['cats', 'dogs'],
            'working_hours' => ['monday' => '09:00-18:00'],
            'image_path' => null,
            'latitude' => 33.5731104,
            'longitude' => -7.5898434,
            'location_url' => 'https://maps.google.com/?q=33.5731104,-7.5898434',
            'is_active' => true,
            'moderation_status' => Veterinarian::MODERATION_STATUS_ACTIVE,
        ];
    }
}
