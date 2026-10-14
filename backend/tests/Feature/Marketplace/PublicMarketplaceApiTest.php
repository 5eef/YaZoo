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

    protected function setUp(): void
    {
        parent::setUp();
        config(['features.animal_listings_public' => true]);
    }

    public function test_public_veterinarian_detail_exposes_calendar_without_private_fields(): void
    {
        $vet = Veterinarian::factory()->create([
            'is_active' => true, 'moderation_status' => 'active',
            'specialties' => ['Vaccination'], 'working_hours' => ['09:00-18:00'],
            'email' => 'private@example.com', 'phone' => '+212611111111',
            'address' => 'Private address',
        ]);
        $slot = $vet->availabilitySlots()->create(['starts_at' => now()->addDay(), 'ends_at' => now()->addDay()->addMinutes(30)]);
        $response = $this->getJson('/api/marketplace/public/veterinarians/'.$vet->id)
            ->assertOk()->assertJsonPath('data.specialties.0', 'Vaccination')
            ->assertJsonPath('data.ownerId', $vet->user_id)
            ->assertJsonPath('data.availability.0.id', $slot->id)
            ->assertJsonPath('data.availability.0.isAvailable', true)
            ->assertJsonPath('data.address', null);
        $this->assertStringNotContainsString('private@example.com', $response->getContent());
        $this->assertStringNotContainsString('+212611111111', $response->getContent());
        $this->assertStringNotContainsString('Private address', $response->getContent());
        $vet->appointments()->create(['client_id' => User::factory()->create()->id, 'availability_slot_id' => $slot->id,
            'starts_at' => $slot->starts_at, 'ends_at' => $slot->ends_at, 'animal_type' => 'cat', 'reason' => 'PRIVATE appointment reason', 'status' => 'pending']);
        $calendar = $this->getJson('/api/marketplace/public/veterinarians/'.$vet->id)->assertOk()
            ->assertJsonPath('data.availability.0.isAvailable', false);
        $this->assertStringNotContainsString('PRIVATE appointment reason', $calendar->getContent());
        $vet->update(['moderation_status' => 'pending_review']);
        $this->getJson('/api/marketplace/public/veterinarians/'.$vet->id)->assertNotFound();
    }

    public function test_only_authorized_fictitious_veterinarians_expose_precise_demo_location(): void
    {
        config(['operations.deployment_profile' => 'showcase']);
        $owner = User::factory()->create(['email' => 'veterinaire.agadir@yazoo.test']);
        $vet = Veterinarian::factory()->create(['user_id' => $owner->id, 'name' => 'DEMO Sefrou', 'description' => 'Profil fictif', 'is_active' => true, 'moderation_status' => 'active', 'address' => 'Cabinet fictif Sefrou', 'latitude' => 33.8305, 'longitude' => -4.8353]);
        $service = ServiceListing::factory()->create(['user_id' => $owner->id, 'title' => 'Consultation fictive', 'status' => 'active', 'moderation_status' => 'active']);
        ServiceListing::factory()->create(['user_id' => $owner->id, 'moderation_status' => 'hidden']);
        $this->getJson('/api/marketplace/public/veterinarians/'.$vet->id)->assertOk()
            ->assertJsonPath('data.address', 'Cabinet fictif Sefrou')->assertJsonPath('data.professionalBadge', null)
            ->assertJsonCount(1, 'data.services')->assertJsonPath('data.services.0.id', $service->id);
        $owner->update(['email' => 'real@example.com']);
        $this->getJson('/api/marketplace/public/veterinarians/'.$vet->id)->assertOk()->assertJsonPath('data.address', null)->assertJsonPath('data.latitude', null);
    }

    public function test_pilot_disables_animal_preview_and_direct_public_routes(): void
    {
        config(['features.animal_listings_public' => false]);
        $this->getJson('/api/marketplace/public-preview')->assertOk()->assertJsonPath('data.animals', []);
        $this->getJson('/api/marketplace/public/animals')->assertNotFound();
        $this->getJson('/api/marketplace/public/animals/1')->assertNotFound();
    }

    public function test_public_care_filters_use_real_city_and_specialty(): void
    {
        Veterinarian::factory()->create(['name' => 'Pilot Vet', 'city' => 'Sefrou', 'specialties' => ['cats'], 'is_active' => true, 'moderation_status' => 'active']);
        Veterinarian::factory()->create(['name' => 'Other Vet', 'city' => 'Rabat', 'specialties' => ['dogs'], 'is_active' => true, 'moderation_status' => 'active']);
        $this->getJson('/api/marketplace/public/veterinarians?city=Sefrou&specialty=cats&search=Pilot')->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.title', 'Pilot Vet');
        $this->getJson('/api/marketplace/public/veterinarians?city=Sefrou&specialty=dogs')->assertOk()->assertJsonCount(0, 'data');
        $this->getJson('/api/marketplace/public/veterinarians?search='.str_repeat('x', 121))->assertUnprocessable();
    }

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

    public function test_guest_can_paginate_only_approved_public_animals(): void
    {
        Animal::factory()->count(13)->create([
            'legal_status' => 'approved',
            'listing_status' => 'available',
        ]);
        Animal::factory()->create([
            'name' => 'Animal prive',
            'legal_status' => 'pending_review',
            'listing_status' => 'available',
        ]);

        $this->getJson('/api/marketplace/public/animals?page=2&per_page=6')
            ->assertOk()
            ->assertJsonCount(6, 'data')
            ->assertJsonPath('meta.currentPage', 2)
            ->assertJsonPath('meta.lastPage', 3)
            ->assertJsonPath('meta.perPage', 6)
            ->assertJsonPath('meta.total', 13)
            ->assertJsonMissing(['title' => 'Animal prive']);
    }

    public function test_guest_can_read_an_approved_listing_but_not_a_hidden_one(): void
    {
        $approved = ServiceListing::factory()->create([
            'title' => 'Garde publique',
            'description' => 'Contact private@example.com ou +212611111111',
            'status' => 'active',
            'moderation_status' => 'active',
            'contact_email' => 'private@example.com',
            'contact_phone' => '+212611111111',
        ]);
        $hidden = ServiceListing::factory()->create([
            'title' => 'Garde privee',
            'status' => 'active',
            'moderation_status' => 'suspended',
        ]);

        $response = $this->getJson("/api/marketplace/public/services/{$approved->id}")
            ->assertOk()
            ->assertJsonPath('data.title', 'Garde publique');

        $this->assertNoSensitiveKeys($response->json('data'));
        $this->assertStringNotContainsString(
            'private@example.com',
            json_encode($response->json(), JSON_THROW_ON_ERROR),
        );
        $this->getJson("/api/marketplace/public/services/{$hidden->id}")
            ->assertNotFound();
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
