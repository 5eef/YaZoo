<?php

namespace Tests\Feature\Marketplace;

use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ProductApiTest extends TestCase
{
    use RefreshDatabase;

    protected function fakeImageUpload(string $name): UploadedFile
    {
        return UploadedFile::fake()->createWithContent(
            $name,
            base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+X2FoAAAAASUVORK5CYII='),
        );
    }

    public function test_authenticated_user_can_list_products_with_filters(): void
    {
        $user = User::factory()->approvedProfessional('seller')->create();

        Product::factory()->create([
            'name' => 'Croquettes premium',
            'category' => 'food',
            'price' => 350,
            'location' => 'Casablanca',
            'listing_status' => 'available',
            'condition_status' => 'new',
        ]);

        Product::factory()->create([
            'name' => 'Panier occasion',
            'category' => 'habitat',
            'price' => 120,
            'location' => 'Rabat',
            'listing_status' => 'sold',
            'condition_status' => 'used',
        ]);

        Sanctum::actingAs($user, ['*']);

        $this->getJson('/api/products?min_price=300&condition_status=new&category=food&listing_status=available')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.name', 'Croquettes premium')
            ->assertJsonPath('data.0.category', 'food')
            ->assertJsonPath('data.0.listingStatus', 'available');
    }

    public function test_authenticated_user_can_create_update_and_delete_a_product_listing(): void
    {
        $user = User::factory()->approvedProfessional('seller')->create();
        Sanctum::actingAs($user, ['*']);

        $createResponse = $this->postJson('/api/products', [
            'name' => 'Laisse ergonomique',
            'category' => 'accessory',
            'description' => 'Laisse robuste pour promenade quotidienne.',
            'price' => 199.99,
            'image_url' => 'https://example.com/product.jpg',
            'gallery_urls' => [
                'https://example.com/product.jpg',
                'https://example.com/product-side.jpg',
            ],
            'location' => 'Casablanca',
            'stock' => 7,
            'listing_status' => 'available',
            'condition_status' => 'new',
        ]);

        $productId = $createResponse->json('data.id');

        $createResponse
            ->assertCreated()
            ->assertJsonPath('data.name', 'Laisse ergonomique')
            ->assertJsonPath('data.category', 'accessory')
            ->assertJsonPath('data.stock', 7)
            ->assertJsonPath('data.galleryUrls.1', 'https://example.com/product-side.jpg')
            ->assertJsonPath('data.listingStatus', 'available');

        $this->putJson("/api/products/{$productId}", [
            'name' => 'Laisse ergonomique',
            'category' => 'accessory',
            'description' => 'Version mise a jour du produit.',
            'price' => 149.99,
            'image_url' => 'https://example.com/product.jpg',
            'gallery_urls' => [
                'https://example.com/product.jpg',
                'https://example.com/product-rabat.jpg',
            ],
            'location' => 'Rabat',
            'stock' => 5,
            'listing_status' => 'sold',
            'condition_status' => 'used',
        ])
            ->assertOk()
            ->assertJsonPath('data.location', 'Rabat')
            ->assertJsonPath('data.conditionStatus', 'used')
            ->assertJsonPath('data.listingStatus', 'sold');

        $this->deleteJson("/api/products/{$productId}")
            ->assertOk()
            ->assertJsonPath('message', 'Produit supprime avec succes.');

        $this->assertSoftDeleted('products', ['id' => $productId]);
    }

    public function test_user_cannot_update_or_delete_another_users_product(): void
    {
        $user = User::factory()->approvedProfessional('seller')->create();
        $other = User::factory()->create();
        $product = Product::factory()->create(['user_id' => $other->id]);

        Sanctum::actingAs($user, ['*']);

        $payload = [
            'name' => 'Refus',
            'category' => 'other',
            'description' => 'Refus',
            'price' => 10,
            'image_url' => null,
            'gallery_urls' => [],
            'location' => 'Fes',
            'stock' => 1,
            'listing_status' => 'reserved',
            'condition_status' => 'new',
        ];

        $this->putJson("/api/products/{$product->id}", $payload)->assertForbidden();
        $this->deleteJson("/api/products/{$product->id}")->assertForbidden();
    }

    public function test_authenticated_user_can_upload_real_images_for_a_product_listing(): void
    {
        Storage::fake('public');
        $user = User::factory()->approvedProfessional('seller')->create();
        Sanctum::actingAs($user, ['*']);

        $response = $this
            ->withHeaders(['Accept' => 'application/json'])
            ->post('/api/products', [
                'name' => 'Panier upload',
                'category' => 'habitat',
                'description' => 'Produit avec upload reel.',
                'price' => 250,
                'image' => $this->fakeImageUpload('product-main.png'),
                'gallery_files' => [
                    $this->fakeImageUpload('product-gallery-1.png'),
                    $this->fakeImageUpload('product-gallery-2.png'),
                ],
                'location' => 'Rabat',
                'stock' => 3,
                'listing_status' => 'available',
                'condition_status' => 'new',
            ]);

        $product = Product::query()->latest('id')->first();

        $response
            ->assertCreated()
            ->assertJsonPath('data.name', 'Panier upload');

        $this->assertNotNull($product);
        Storage::disk('public')->assertExists($product->image_url);
        collect($product->gallery_urls)->each(
            fn ($path) => Storage::disk('public')->assertExists($path),
        );
        $this->assertStringContainsString(
            '/storage/marketplace/products/',
            $response->json('data.imageUrl'),
        );
    }

    public function test_authenticated_user_can_update_a_product_listing_with_real_uploaded_images(): void
    {
        Storage::fake('public');
        $user = User::factory()->approvedProfessional('seller')->create();
        $product = Product::factory()->create([
            'user_id' => $user->id,
            'image_url' => null,
            'gallery_urls' => [],
        ]);

        Sanctum::actingAs($user, ['*']);

        $response = $this
            ->withHeaders(['Accept' => 'application/json'])
            ->post("/api/products/{$product->id}", [
                '_method' => 'PUT',
                'name' => 'Produit Modifie',
                'category' => 'accessory',
                'description' => 'Produit modifie avec upload reel.',
                'price' => 180,
                'image' => $this->fakeImageUpload('product-updated-main.png'),
                'gallery_files' => [
                    $this->fakeImageUpload('product-updated-gallery.png'),
                ],
                'location' => 'Agadir',
                'stock' => 4,
                'listing_status' => 'reserved',
                'condition_status' => 'used',
            ]);

        $product->refresh();

        $response
            ->assertOk()
            ->assertJsonPath('data.name', 'Produit Modifie')
            ->assertJsonPath('data.listingStatus', 'reserved');

        Storage::disk('public')->assertExists($product->image_url);
        collect($product->gallery_urls)->each(
            fn ($path) => Storage::disk('public')->assertExists($path),
        );
    }
}
