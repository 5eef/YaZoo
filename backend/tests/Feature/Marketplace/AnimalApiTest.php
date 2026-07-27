<?php

namespace Tests\Feature\Marketplace;

use App\Models\Animal;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AnimalApiTest extends TestCase
{
    use RefreshDatabase;

    protected function fakeImageUpload(string $name): UploadedFile
    {
        return UploadedFile::fake()->createWithContent(
            $name,
            base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+X2FoAAAAASUVORK5CYII='),
        );
    }

    public function test_authenticated_user_can_list_animals_with_filters(): void
    {
        $user = User::factory()->approvedProfessional('breeder')->create();

        Animal::factory()->create([
            'name' => 'Luna',
            'category' => 'cat',
            'type' => 'chat',
            'sex' => 'female',
            'location' => 'Casablanca',
            'is_for_adoption' => true,
            'listing_status' => 'available',
        ]);

        Animal::factory()->create([
            'name' => 'Rex',
            'category' => 'dog',
            'type' => 'chien',
            'sex' => 'male',
            'location' => 'Rabat',
            'is_for_adoption' => false,
            'listing_status' => 'sold',
        ]);

        Sanctum::actingAs($user, ['*']);

        $this->getJson('/api/animals?category=cat&listing_status=available&adoption=true')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.name', 'Luna')
            ->assertJsonPath('data.0.category', 'cat')
            ->assertJsonPath('data.0.type', 'chat')
            ->assertJsonPath('data.0.isForAdoption', true)
            ->assertJsonPath('data.0.listingStatus', 'available');
    }

    public function test_authenticated_user_can_create_update_and_delete_an_animal_listing(): void
    {
        $user = User::factory()->approvedProfessional('breeder')->create();
        Sanctum::actingAs($user, ['*']);

        $createResponse = $this->postJson('/api/animals', [
            'name' => 'Milo',
            'category' => 'cat',
            'type' => 'chat',
            'breed' => 'Siamois',
            'age' => 2,
            'sex' => 'male',
            'location' => 'Casablanca',
            'contact_phone' => '+212600000001',
            'photo_url' => 'https://example.com/milo.jpg',
            'gallery_urls' => [
                'https://example.com/milo.jpg',
                'https://example.com/milo-2.jpg',
            ],
            'price' => 1200,
            'is_for_adoption' => false,
            'listing_status' => 'available',
            'description' => 'Chat calme et joueur.',
            'accepts_animal_rules' => true,
            'seller_type' => 'individual',
            'origin' => 'Casablanca',
        ]);

        $animalId = $createResponse->json('data.id');

        $createResponse
            ->assertCreated()
            ->assertJsonPath('data.name', 'Milo')
            ->assertJsonPath('data.category', 'cat')
            ->assertJsonPath('data.type', 'chat')
            ->assertJsonPath('data.contactPhone', '+212600000001')
            ->assertJsonPath('data.acceptsAnimalRules', true)
            ->assertJsonPath('data.sellerType', 'individual')
            ->assertJsonPath('data.legalStatus', 'pending_review')
            ->assertJsonPath('data.galleryUrls.1', 'https://example.com/milo-2.jpg')
            ->assertJsonPath('data.listingStatus', 'available');

        $this->putJson("/api/animals/{$animalId}", [
            'name' => 'Milo',
            'category' => 'cat',
            'type' => 'chat',
            'breed' => 'Siamois',
            'age' => 3,
            'sex' => 'male',
            'location' => 'Rabat',
            'contact_phone' => '+212600000002',
            'photo_url' => 'https://example.com/milo.jpg',
            'gallery_urls' => [
                'https://example.com/milo.jpg',
                'https://example.com/milo-rabat.jpg',
            ],
            'price' => 900,
            'is_for_adoption' => true,
            'listing_status' => 'adopted',
            'description' => 'Annonce mise a jour.',
            'accepts_animal_rules' => true,
            'seller_type' => 'association',
            'origin' => 'Rabat',
        ])
            ->assertOk()
            ->assertJsonPath('data.age', 3)
            ->assertJsonPath('data.location', 'Rabat')
            ->assertJsonPath('data.isForAdoption', true)
            ->assertJsonPath('data.listingStatus', 'adopted');

        $this->deleteJson("/api/animals/{$animalId}")
            ->assertOk()
            ->assertJsonPath('message', 'Annonce supprimee avec succes.');

        $this->assertDatabaseMissing('animals', [
            'id' => $animalId,
        ]);
    }

    public function test_user_cannot_update_or_delete_another_users_listing(): void
    {
        $user = User::factory()->approvedProfessional('breeder')->create();
        $other = User::factory()->create();
        $animal = Animal::factory()->create([
            'user_id' => $other->id,
        ]);

        Sanctum::actingAs($user, ['*']);

        $payload = [
            'name' => 'Refus',
            'category' => 'dog',
            'type' => 'chien',
            'breed' => 'Berger',
            'age' => 4,
            'sex' => 'male',
            'location' => 'Fes',
            'contact_phone' => '+212600000003',
            'photo_url' => null,
            'gallery_urls' => [],
            'price' => 1000,
            'is_for_adoption' => false,
            'listing_status' => 'reserved',
            'description' => 'Tentative non autorisee.',
            'accepts_animal_rules' => true,
            'seller_type' => 'individual',
        ];

        $this->putJson("/api/animals/{$animal->id}", $payload)->assertForbidden();
        $this->deleteJson("/api/animals/{$animal->id}")->assertForbidden();
    }

    public function test_authenticated_user_can_upload_real_images_for_an_animal_listing(): void
    {
        Storage::fake('public');
        $user = User::factory()->approvedProfessional('breeder')->create();
        Sanctum::actingAs($user, ['*']);

        $response = $this
            ->withHeaders(['Accept' => 'application/json'])
            ->post('/api/animals', [
                'name' => 'Milo Upload',
                'category' => 'cat',
                'type' => 'chat',
                'breed' => 'Europeen',
                'age' => 2,
                'sex' => 'male',
                'location' => 'Casablanca',
                'contact_phone' => '+212600000004',
                'photo' => $this->fakeImageUpload('milo-main.png'),
                'gallery_files' => [
                    $this->fakeImageUpload('milo-gallery-1.png'),
                    $this->fakeImageUpload('milo-gallery-2.png'),
                ],
                'price' => 800,
                'is_for_adoption' => 'false',
                'listing_status' => 'available',
                'description' => 'Annonce avec upload reel.',
                'accepts_animal_rules' => '1',
                'seller_type' => 'individual',
            ]);

        $animal = Animal::query()->latest('id')->first();

        $response
            ->assertCreated()
            ->assertJsonPath('data.name', 'Milo Upload');

        $this->assertNotNull($animal);
        Storage::disk('public')->assertExists($animal->photo_url);
        collect($animal->gallery_urls)->each(
            fn ($path) => Storage::disk('public')->assertExists($path),
        );
        $this->assertStringContainsString(
            '/storage/marketplace/animals/',
            $response->json('data.photoUrl'),
        );
    }

    public function test_authenticated_user_can_update_an_animal_listing_with_real_uploaded_images(): void
    {
        Storage::fake('public');
        $user = User::factory()->approvedProfessional('breeder')->create();
        $animal = Animal::factory()->create([
            'user_id' => $user->id,
            'photo_url' => null,
            'gallery_urls' => [],
        ]);

        Sanctum::actingAs($user, ['*']);

        $response = $this
            ->withHeaders(['Accept' => 'application/json'])
            ->post("/api/animals/{$animal->id}", [
                '_method' => 'PUT',
                'name' => 'Milo Modifie',
                'category' => 'cat',
                'type' => 'chat',
                'breed' => 'Europeen',
                'age' => 4,
                'sex' => 'male',
                'location' => 'Marrakech',
                'contact_phone' => '+212600000005',
                'photo' => $this->fakeImageUpload('milo-updated-main.png'),
                'gallery_files' => [
                    $this->fakeImageUpload('milo-updated-gallery.png'),
                ],
                'price' => 950,
                'is_for_adoption' => 'false',
                'listing_status' => 'reserved',
                'description' => 'Annonce modifiee avec upload reel.',
                'accepts_animal_rules' => '1',
                'seller_type' => 'individual',
            ]);

        $animal->refresh();

        $response
            ->assertOk()
            ->assertJsonPath('data.name', 'Milo Modifie')
            ->assertJsonPath('data.listingStatus', 'reserved');

        Storage::disk('public')->assertExists($animal->photo_url);
        collect($animal->gallery_urls)->each(
            fn ($path) => Storage::disk('public')->assertExists($path),
        );
    }
}
