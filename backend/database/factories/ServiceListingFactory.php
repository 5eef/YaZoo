<?php

namespace Database\Factories;

use App\Models\ServiceListing;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ServiceListing>
 */
class ServiceListingFactory extends Factory
{
    protected $model = ServiceListing::class;

    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'type' => fake()->randomElement(ServiceListing::TYPES),
            'title' => fake()->sentence(4),
            'description' => fake()->paragraph(),
            'animal_types' => fake()->randomElements(['dog', 'cat', 'bird'], 2),
            'city' => fake()->city(),
            'address' => fake()->streetAddress(),
            'price' => fake()->randomFloat(2, 80, 900),
            'price_type' => fake()->randomElement(ServiceListing::PRICE_TYPES),
            'availability' => ['weekdays' => ['monday', 'wednesday']],
            'contact_phone' => '+212600000000',
            'contact_email' => fake()->safeEmail(),
            'whatsapp_enabled' => true,
            'status' => 'active',
            'media' => [],
            'moderation_status' => ServiceListing::MODERATION_STATUS_ACTIVE,
        ];
    }
}
