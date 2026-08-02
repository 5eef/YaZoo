<?php

namespace Tests\Feature\Marketplace;

use App\Models\MediaAsset;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class MediaAssetOwnershipTest extends TestCase
{
    use RefreshDatabase;

    public function test_another_user_cannot_attach_replace_or_delete_an_owned_marketplace_asset(): void
    {
        Storage::fake('public');
        $owner = User::factory()->approvedProfessional('seller')->create();
        $attacker = User::factory()->approvedProfessional('seller')->create();

        Sanctum::actingAs($owner, ['*']);
        $ownerResponse = $this->post('/api/products', [
            ...$this->productPayload('Owned product'),
            'image' => $this->fakeImageUpload('owned.png'),
        ])->assertCreated();

        $ownerProduct = Product::query()->findOrFail($ownerResponse->json('data.id'));
        $asset = MediaAsset::query()->where('attachable_id', $ownerProduct->id)->firstOrFail();
        $this->assertSame($owner->id, $asset->owner_id);
        $this->assertSame($asset->id, $ownerResponse->json('data.imageAssetId'));
        Storage::disk('public')->assertExists($asset->path);

        Sanctum::actingAs($attacker, ['*']);
        $attackerProductId = $this->postJson('/api/products', $this->productPayload('Attacker product'))
            ->assertCreated()
            ->json('data.id');

        $this->putJson("/api/products/{$attackerProductId}", [
            ...$this->productPayload('Hijack attempt'),
            'image_asset_id' => $asset->id,
        ])->assertUnprocessable();

        $this->putJson("/api/products/{$attackerProductId}", [
            ...$this->productPayload('Raw path attempt'),
            'image_url' => $asset->path,
        ])->assertUnprocessable();

        $this->deleteJson("/api/products/{$ownerProduct->id}")->assertForbidden();

        $this->assertNull(Product::query()->findOrFail($attackerProductId)->image_url);
        $this->assertDatabaseHas('media_assets', [
            'id' => $asset->id,
            'owner_id' => $owner->id,
            'attachable_id' => $ownerProduct->id,
        ]);
        Storage::disk('public')->assertExists($asset->path);
    }

    public function test_asset_identifiers_are_not_exposed_to_non_owners(): void
    {
        Storage::fake('public');
        $owner = User::factory()->approvedProfessional('seller')->create();
        $viewer = User::factory()->create();

        Sanctum::actingAs($owner, ['*']);
        $productId = $this->post('/api/products', [
            ...$this->productPayload('Visible product'),
            'image' => $this->fakeImageUpload('visible.png'),
        ])->assertCreated()->json('data.id');
        Product::query()->whereKey($productId)->update(['moderation_status' => Product::MODERATION_STATUS_ACTIVE]);

        Sanctum::actingAs($viewer, ['*']);
        $response = $this->getJson("/api/products/{$productId}")->assertOk();
        $response->assertJsonMissingPath('data.imageAssetId');
        $response->assertJsonMissingPath('data.galleryAssetIds');
        $response->assertJsonMissingPath('data.imagePath');
        $response->assertJsonMissingPath('data.galleryPaths');
    }

    /** @return array<string, mixed> */
    private function productPayload(string $name): array
    {
        return [
            'name' => $name,
            'category' => 'accessory',
            'description' => 'Description suffisamment longue pour le produit.',
            'price' => 100,
            'location' => 'Rabat',
            'stock' => 2,
            'listing_status' => 'available',
            'condition_status' => 'new',
        ];
    }

    private function fakeImageUpload(string $name): UploadedFile
    {
        return UploadedFile::fake()->createWithContent(
            $name,
            base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+X2FoAAAAASUVORK5CYII='),
        );
    }
}
