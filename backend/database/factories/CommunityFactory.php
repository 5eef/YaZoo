<?php

namespace Database\Factories;

use App\Models\Community;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Community>
 */
class CommunityFactory extends Factory
{
    /**
     * The name of the factory's corresponding model.
     *
     * @var class-string<Community>
     */
    protected $model = Community::class;

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
            'description' => fake()->sentence(15),
            'image_url' => fake()->imageUrl(640, 480, 'nature'),
            'is_private' => false,
        ];
    }

    public function private(): static
    {
        return $this->state(fn (): array => ['is_private' => true]);
    }
}
