<?php

namespace Tests\Feature\Marketplace;

use App\Models\ProfessionalVerification;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class MarketplacePublishingAuthorizationTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @return array<string, array{string|null, string, string|null}>
     */
    public static function forbiddenVerificationStates(): array
    {
        return [
            'no verification' => [null, 'pending', null],
            'pending' => ['seller', 'pending', null],
            'rejected' => ['seller', 'rejected', null],
            'expired' => ['seller', 'approved', '2020-01-01'],
        ];
    }

    #[DataProvider('forbiddenVerificationStates')]
    public function test_unapproved_professionals_cannot_publish_products(
        ?string $businessType,
        string $status,
        ?string $expiresAt,
    ): void {
        $user = User::factory()->create();

        if ($businessType) {
            ProfessionalVerification::query()->create([
                'user_id' => $user->id,
                'business_type' => $businessType,
                'status' => $status,
                'document_expires_at' => $expiresAt,
            ]);
        }

        Sanctum::actingAs($user, ['*']);

        $this->postJson('/api/products', $this->productPayload())
            ->assertForbidden();
    }

    public function test_approved_professional_can_only_publish_to_compatible_destination(): void
    {
        $seller = User::factory()->approvedProfessional('seller')->create();
        Sanctum::actingAs($seller, ['*']);

        $this->postJson('/api/products', $this->productPayload())
            ->assertCreated()
            ->assertJsonPath('data.moderationStatus', 'pending_review');

        $this->postJson('/api/animals', $this->animalPayload())
            ->assertForbidden();
    }

    public function test_trainer_can_publish_training_but_not_pet_sitting(): void
    {
        $trainer = User::factory()->approvedProfessional('trainer')->create();
        Sanctum::actingAs($trainer, ['*']);

        $this->postJson('/api/services', $this->servicePayload('pet_sitting'))
            ->assertForbidden();

        $this->postJson('/api/services', $this->servicePayload('training'))
            ->assertCreated()
            ->assertJsonPath('data.moderationStatus', 'pending_review');
    }

    public function test_approved_status_without_real_admin_review_cannot_publish(): void
    {
        $user = User::factory()->create();
        ProfessionalVerification::query()->create([
            'user_id' => $user->id,
            'business_type' => 'seller',
            'status' => 'approved',
        ]);

        Sanctum::actingAs($user, ['*']);
        $this->postJson('/api/products', $this->productPayload())->assertForbidden();
    }

    public function test_suspended_and_banned_professionals_cannot_publish(): void
    {
        $suspended = User::factory()->approvedProfessional('seller')->create([
            'is_suspended' => true,
            'suspended_at' => now(),
        ]);
        Sanctum::actingAs($suspended, ['*']);
        $this->postJson('/api/products', $this->productPayload())->assertForbidden();

        $banned = User::factory()->approvedProfessional('seller')->create([
            'banned_at' => now(),
        ]);
        Sanctum::actingAs($banned, ['*']);
        $this->postJson('/api/products', $this->productPayload())->assertForbidden();
    }

    /**
     * @return array<string, mixed>
     */
    private function productPayload(): array
    {
        return [
            'name' => 'Produit controle',
            'category' => 'accessory',
            'description' => 'Produit soumis a la moderation YaZoo.',
            'price' => 100,
            'location' => 'Casablanca',
            'stock' => 2,
            'listing_status' => 'available',
            'condition_status' => 'new',
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function animalPayload(): array
    {
        return [
            'name' => 'Animal controle',
            'category' => 'cat',
            'type' => 'chat',
            'sex' => 'unknown',
            'location' => 'Casablanca',
            'contact_phone' => '+212600000001',
            'is_for_adoption' => true,
            'listing_status' => 'available',
            'description' => 'Annonce animale soumise a moderation.',
            'accepts_animal_rules' => true,
            'seller_type' => 'professional',
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function servicePayload(string $type): array
    {
        return [
            'type' => $type,
            'title' => 'Service controle',
            'description' => 'Service soumis a la moderation YaZoo.',
            'city' => 'Casablanca',
            'price_type' => 'negotiable',
        ];
    }
}
