<?php

namespace Tests\Feature\Marketplace;

use App\Models\Animal;
use App\Models\Product;
use App\Models\ServiceListing;
use App\Models\User;
use App\Models\Veterinarian;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PublicMarketplaceApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_sees_only_approved_previews_without_sensitive_contact_details(): void
    {
        $seller = User::factory()->create([
            'name' => 'Vendeur public',
            'email' => 'seller@example.com',
            'phone' => '+212600000099',
            'city' => 'Casablanca',
        ]);

        Animal::factory()->create([
            'user_id' => $seller->id,
            'name' => 'Animal approuve',
            'description' => 'Contact seller@example.com ou +212611111111',
            'location' => '12 rue privee, Casablanca',
            'legal_status' => 'approved',
            'listing_status' => 'available',
            'contact_phone' => '+212611111111',
            'health_certificate_path' => 'private/health.pdf',
            'vaccination_book_path' => 'private/vaccine.pdf',
            'onssa_authorization_number' => 'ONSSA-PRIVATE',
        ]);
        Animal::factory()->create([
            'user_id' => $seller->id,
            'name' => 'Animal en attente',
            'legal_status' => 'pending_review',
            'listing_status' => 'available',
        ]);
        Product::factory()->create([
            'user_id' => $seller->id,
            'name' => 'Produit visible',
            'moderation_status' => 'active',
            'listing_status' => 'available',
            'stock' => 3,
        ]);
        Product::factory()->create([
            'user_id' => $seller->id,
            'name' => 'Produit masque',
            'moderation_status' => 'hidden',
            'listing_status' => 'available',
            'stock' => 3,
        ]);
        Product::factory()->create([
            'user_id' => $seller->id,
            'name' => 'Produit epuise',
            'moderation_status' => 'active',
            'listing_status' => 'available',
            'stock' => 0,
        ]);
        ServiceListing::factory()->create([
            'user_id' => $seller->id,
            'title' => 'Service visible',
            'description' => 'Ecrire a private-service@example.com',
            'status' => 'active',
            'moderation_status' => 'active',
            'address' => 'Adresse privee',
            'contact_phone' => '+212622222222',
            'contact_email' => 'private-service@example.com',
        ]);
        ServiceListing::factory()->create([
            'user_id' => $seller->id,
            'title' => 'Service suspendu',
            'status' => 'active',
            'moderation_status' => 'suspended',
        ]);
        Veterinarian::factory()->create([
            'user_id' => $seller->id,
            'name' => 'Veterinaire visible',
            'description' => 'WhatsApp +212644444444',
            'is_active' => true,
            'moderation_status' => 'active',
            'address' => 'Cabinet prive',
            'phone' => '+212633333333',
            'whatsapp' => '+212644444444',
            'email' => 'private-vet@example.com',
            'latitude' => 33.5731104,
            'longitude' => -7.5898434,
        ]);
        Veterinarian::factory()->create([
            'user_id' => $seller->id,
            'name' => 'Veterinaire rejete',
            'is_active' => true,
            'moderation_status' => 'rejected',
        ]);

        $response = $this->getJson('/api/marketplace/public-preview?per_section=6');

        $response
            ->assertOk()
            ->assertJsonCount(1, 'data.animals')
            ->assertJsonCount(1, 'data.products')
            ->assertJsonCount(1, 'data.services')
            ->assertJsonCount(1, 'data.veterinarians')
            ->assertJsonPath('data.animals.0.title', 'Animal approuve')
            ->assertJsonPath('data.animals.0.location', 'Casablanca')
            ->assertJsonPath('data.products.0.title', 'Produit visible')
            ->assertJsonPath('data.services.0.title', 'Service visible')
            ->assertJsonPath('data.veterinarians.0.title', 'Veterinaire visible');

        $this->assertNoSensitiveKeys($response->json('data'));

        $payload = json_encode($response->json(), JSON_THROW_ON_ERROR);

        $this->assertStringNotContainsString('seller@example.com', $payload);
        $this->assertStringNotContainsString('+212600000099', $payload);
        $this->assertStringNotContainsString('+212611111111', $payload);
        $this->assertStringNotContainsString('private-service@example.com', $payload);
        $this->assertStringNotContainsString('+212644444444', $payload);
        $this->assertStringNotContainsString('12 rue privee', $payload);
        $this->assertStringNotContainsString('Animal en attente', $payload);
        $this->assertStringNotContainsString('Produit masque', $payload);
        $this->assertStringNotContainsString('Produit epuise', $payload);
        $this->assertStringNotContainsString('Service suspendu', $payload);
        $this->assertStringNotContainsString('Veterinaire rejete', $payload);
    }

    public function test_public_preview_caps_each_section_at_twelve_items(): void
    {
        Animal::factory()->count(15)->create([
            'legal_status' => 'approved',
            'listing_status' => 'available',
        ]);

        $this->getJson('/api/marketplace/public-preview?per_section=99')
            ->assertOk()
            ->assertJsonCount(12, 'data.animals');
    }

    public function test_public_text_cleanup_only_removes_separators_at_the_edges(): void
    {
        $seller = User::factory()->create([
            'name' => '--- Association YaZoo ;;;',
            'city' => '--- Casablanca ;;;',
        ]);

        Animal::factory()->create([
            'user_id' => $seller->id,
            'name' => '--- Animal visible ;;;',
            'description' => ';;; Texte - utile ---',
            'legal_status' => 'approved',
            'listing_status' => 'available',
        ]);

        $this->getJson('/api/marketplace/public-preview')
            ->assertOk()
            ->assertJsonPath('data.animals.0.title', 'Animal visible')
            ->assertJsonPath('data.animals.0.description', 'Texte - utile')
            ->assertJsonPath('data.animals.0.location', 'Casablanca')
            ->assertJsonPath('data.animals.0.author.name', 'Association YaZoo');
    }

    public function test_veterinarian_badge_requires_complete_admin_reviewed_veterinarian_license(): void
    {
        $unverified = User::factory()->create();
        $verified = User::factory()->approvedProfessional('veterinarian')->create();

        Veterinarian::factory()->create([
            'user_id' => $unverified->id,
            'name' => 'Veterinaire sans preuve',
            'is_active' => true,
            'moderation_status' => 'active',
        ]);
        Veterinarian::factory()->create([
            'user_id' => $verified->id,
            'name' => 'Veterinaire verifie',
            'is_active' => true,
            'moderation_status' => 'active',
        ]);

        $items = collect(
            $this->getJson('/api/marketplace/public-preview')
                ->assertOk()
                ->json('data.veterinarians'),
        )->keyBy('title');

        $this->assertNull($items['Veterinaire sans preuve']['professionalBadge']);
        $this->assertSame('verified_veterinarian', $items['Veterinaire verifie']['professionalBadge']);
    }

    public function test_public_preview_exposes_business_specific_badges_for_each_marketplace_destination(): void
    {
        $petShop = User::factory()->approvedProfessional('pet_shop')->create();
        $breeder = User::factory()->approvedProfessional('breeder')->create();
        $trainer = User::factory()->approvedProfessional('trainer')->create();
        $provider = User::factory()->approvedProfessional('service_provider')->create();

        Product::factory()->create([
            'user_id' => $petShop->id,
            'name' => 'Produit animalerie',
            'moderation_status' => 'active',
            'listing_status' => 'available',
            'stock' => 2,
        ]);
        Animal::factory()->create([
            'user_id' => $breeder->id,
            'name' => 'Animal eleveur',
            'legal_status' => 'approved',
            'listing_status' => 'available',
        ]);
        ServiceListing::factory()->create([
            'user_id' => $trainer->id,
            'title' => 'Dressage verifie',
            'type' => 'training',
            'status' => 'active',
            'moderation_status' => 'active',
        ]);
        ServiceListing::factory()->create([
            'user_id' => $provider->id,
            'title' => 'Service verifie',
            'type' => 'pet_sitting',
            'status' => 'active',
            'moderation_status' => 'active',
        ]);

        $data = $this->getJson('/api/marketplace/public-preview')
            ->assertOk()
            ->json('data');

        $this->assertSame('verified_pet_shop', collect($data['products'])->firstWhere('title', 'Produit animalerie')['professionalBadge']);
        $this->assertSame('verified_breeder', collect($data['animals'])->firstWhere('title', 'Animal eleveur')['professionalBadge']);

        $services = collect($data['services'])->keyBy('title');
        $this->assertSame('verified_trainer', $services['Dressage verifie']['professionalBadge']);
        $this->assertSame('verified_service_provider', $services['Service verifie']['professionalBadge']);
    }

    private function assertNoSensitiveKeys(array $payload): void
    {
        $sensitiveKeys = [
            'email',
            'phone',
            'whatsapp',
            'address',
            'latitude',
            'longitude',
            'locationUrl',
            'contactPhone',
            'contactEmail',
            'healthCertificatePath',
            'vaccinationBookPath',
            'onssaAuthorizationNumber',
            'moderationNote',
        ];

        foreach ($payload as $key => $value) {
            $this->assertNotContains((string) $key, $sensitiveKeys);

            if (is_array($value)) {
                $this->assertNoSensitiveKeys($value);
            }
        }
    }
}
