<?php

namespace Tests\Feature\Marketplace;

use App\Models\Favorite;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class MarketplaceModerationVisibilityTest extends TestCase
{
    use RefreshDatabase;

    public function test_pending_listing_is_visible_to_owner_only_until_admin_approval(): void
    {
        $owner = User::factory()->create();
        $viewer = User::factory()->create();
        $admin = User::factory()->admin()->create();
        $product = Product::factory()->create([
            'user_id' => $owner->id,
            'name' => 'Produit en revue',
            'moderation_status' => Product::MODERATION_STATUS_PENDING_REVIEW,
            'listing_status' => 'available',
            'stock' => 3,
        ]);

        Sanctum::actingAs($owner, ['*']);
        $this->getJson('/api/products')
            ->assertOk()
            ->assertJsonPath('data.0.id', $product->id);
        $this->getJson("/api/products/{$product->id}")->assertOk();

        Sanctum::actingAs($viewer, ['*']);
        $this->getJson('/api/products')->assertJsonCount(0, 'data');
        $this->getJson("/api/products/{$product->id}")->assertNotFound();
        $this->getJson('/api/search?q=Produit&type=products')
            ->assertOk()
            ->assertJsonCount(0, 'data.products');

        Sanctum::actingAs($admin, ['*']);
        $this->patchJson("/api/admin/content/product/{$product->id}/moderation-status", [
            'action' => 'approve',
            'moderation_note' => 'Contenu verifie.',
        ])
            ->assertOk()
            ->assertJsonPath('moderationStatus', Product::MODERATION_STATUS_ACTIVE);

        Sanctum::actingAs($viewer, ['*']);
        $this->getJson("/api/products/{$product->id}")->assertOk();
        $this->getJson('/api/products')->assertJsonCount(1, 'data');
    }

    public function test_non_approved_statuses_are_hidden_from_direct_search_favorites_and_reservations(): void
    {
        $owner = User::factory()->approvedProfessional('seller')->create();
        $viewer = User::factory()->create();

        foreach ([
            Product::MODERATION_STATUS_PENDING_REVIEW,
            'rejected',
            'suspended',
        ] as $status) {
            $product = Product::factory()->create([
                'user_id' => $owner->id,
                'name' => 'Produit '.$status,
                'moderation_status' => $status,
                'listing_status' => 'available',
                'stock' => 3,
            ]);
            Favorite::query()->create([
                'user_id' => $viewer->id,
                'favoritable_type' => Product::class,
                'favoritable_id' => $product->id,
            ]);

            Sanctum::actingAs($viewer, ['*']);
            $this->getJson("/api/products/{$product->id}")->assertNotFound();
            $this->getJson('/api/search?q=Produit&type=products')
                ->assertOk()
                ->assertJsonMissing(['id' => $product->id]);
            $this->postJson('/api/favorites', [
                'type' => 'products',
                'id' => $product->id,
            ])->assertNotFound();
            $this->postJson("/api/products/{$product->id}/reservations", [
                'quantity' => 1,
                'payment_method' => 'cash_on_pickup',
                'delivery_method' => 'pickup',
            ])->assertUnprocessable();
        }

        $favorites = $this->getJson('/api/favorites')->assertOk()->json('data');
        $this->assertNotEmpty($favorites);
        foreach ($favorites as $favorite) {
            $this->assertNull($favorite['item']);
        }
    }

    public function test_owner_edit_of_approved_listing_returns_it_to_pending_review(): void
    {
        $owner = User::factory()->approvedProfessional('seller')->create();
        $product = Product::factory()->create([
            'user_id' => $owner->id,
            'moderation_status' => Product::MODERATION_STATUS_ACTIVE,
        ]);

        Sanctum::actingAs($owner, ['*']);
        $this->putJson("/api/products/{$product->id}", [
            'name' => 'Produit modifie',
            'category' => $product->category,
            'description' => $product->description,
            'price' => $product->price,
            'location' => $product->location,
            'stock' => $product->stock,
            'listing_status' => 'available',
            'condition_status' => $product->condition_status,
        ])
            ->assertOk()
            ->assertJsonPath('data.moderationStatus', Product::MODERATION_STATUS_PENDING_REVIEW);
    }
}
