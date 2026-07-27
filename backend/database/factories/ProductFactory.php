<?php

namespace Database\Factories;

use App\Models\Product;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Product>
 */
class ProductFactory extends Factory
{
    /**
     * The name of the factory's corresponding model.
     *
     * @var class-string<Product>
     */
    protected $model = Product::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'name' => fake()->words(3, true),
            'category' => fake()->randomElement(Product::CATEGORIES),
            'description' => fake()->sentence(12),
            'price' => fake()->randomFloat(2, 10, 2500),
            'image_url' => fake()->imageUrl(640, 480, 'cats'),
            'gallery_urls' => [
                fake()->imageUrl(640, 480, 'cats'),
                fake()->imageUrl(640, 480, 'cats'),
            ],
            'location' => fake()->city(),
            'stock' => fake()->numberBetween(0, 25),
            'listing_status' => fake()->randomElement(Product::LISTING_STATUSES),
            'condition_status' => fake()->randomElement(['new', 'used']),
            'moderation_status' => Product::MODERATION_STATUS_ACTIVE,
        ];
    }
}
