<?php

namespace Tests\Feature\Admin;

use App\Models\Animal;
use App\Models\Community;
use App\Models\CommunityMember;
use App\Models\Post;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminModerationApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_non_admin_cannot_access_global_moderation_dashboard(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user, ['*']);

        $this->getJson('/api/admin/moderation')
            ->assertForbidden()
            ->assertJsonPath('message', 'Acces reserve aux admins.');
    }

    public function test_admin_can_view_global_moderation_dashboard(): void
    {
        $admin = User::factory()->admin()->create();
        $author = User::factory()->create();

        Post::factory()->create([
            'user_id' => $author->id,
            'content' => 'Post a moderer',
        ]);

        Animal::factory()->create([
            'user_id' => $author->id,
            'name' => 'Luna',
            'photo_url' => 'marketplace/animals/luna.png',
            'gallery_urls' => ['marketplace/animals/luna.png'],
        ]);

        Product::factory()->create([
            'user_id' => $author->id,
            'name' => 'Panier',
            'image_url' => 'marketplace/products/panier.png',
            'gallery_urls' => ['marketplace/products/panier.png'],
        ]);

        $community = Community::factory()->create([
            'user_id' => $author->id,
            'name' => 'Amis des chats',
            'is_private' => true,
        ]);

        CommunityMember::factory()->create([
            'community_id' => $community->id,
            'user_id' => $admin->id,
            'role' => 'admin',
            'status' => 'approved',
        ]);

        CommunityMember::factory()->create([
            'community_id' => $community->id,
            'user_id' => User::factory()->create()->id,
            'role' => 'member',
            'status' => 'pending',
        ]);

        Sanctum::actingAs($admin, ['*']);

        $this->getJson('/api/admin/moderation')
            ->assertOk()
            ->assertJsonPath('stats.admins', 1)
            ->assertJsonPath('stats.posts', 1)
            ->assertJsonPath('stats.animals', 1)
            ->assertJsonPath('stats.products', 1)
            ->assertJsonPath('stats.communities', 1)
            ->assertJsonPath('stats.pendingCommunityRequests', 1)
            ->assertJsonPath('posts.0.title', 'Post a moderer')
            ->assertJsonPath('animals.0.title', 'Luna')
            ->assertJsonPath('products.0.title', 'Panier')
            ->assertJsonPath('communities.0.title', 'Amis des chats');
    }

    public function test_admin_can_delete_posts_animals_products_and_communities(): void
    {
        Storage::fake('public');

        $admin = User::factory()->admin()->create();
        $author = User::factory()->create();

        $post = Post::factory()->create([
            'user_id' => $author->id,
            'content' => 'Post supprime',
        ]);
        $post->comments()->create([
            'user_id' => $author->id,
            'body' => 'Commentaire associe',
        ]);
        $post->likes()->create([
            'user_id' => $author->id,
        ]);

        Storage::disk('public')->put('marketplace/animals/admin-delete.png', 'animal');
        $animal = Animal::factory()->create([
            'user_id' => $author->id,
            'photo_url' => 'marketplace/animals/admin-delete.png',
            'gallery_urls' => ['marketplace/animals/admin-delete.png'],
        ]);

        Storage::disk('public')->put('marketplace/products/admin-delete.png', 'product');
        $product = Product::factory()->create([
            'user_id' => $author->id,
            'image_url' => 'marketplace/products/admin-delete.png',
            'gallery_urls' => ['marketplace/products/admin-delete.png'],
        ]);

        $community = Community::factory()->create([
            'user_id' => $author->id,
        ]);

        Sanctum::actingAs($admin, ['*']);

        $this->deleteJson("/api/admin/posts/{$post->id}")
            ->assertOk()
            ->assertJsonPath('message', 'Post supprime par moderation admin.');

        $this->deleteJson("/api/admin/animals/{$animal->id}")
            ->assertOk()
            ->assertJsonPath('message', 'Annonce animal supprimee par moderation admin.');

        $this->deleteJson("/api/admin/products/{$product->id}")
            ->assertOk()
            ->assertJsonPath('message', 'Produit supprime par moderation admin.');

        $this->deleteJson("/api/admin/communities/{$community->id}")
            ->assertOk()
            ->assertJsonPath('message', 'Communaute supprimee par moderation admin.');

        $this->assertDatabaseMissing('posts', ['id' => $post->id]);
        $this->assertDatabaseMissing('comments', ['post_id' => $post->id]);
        $this->assertDatabaseMissing('likes', [
            'likeable_type' => Post::class,
            'likeable_id' => $post->id,
        ]);
        $this->assertSoftDeleted('animals', ['id' => $animal->id]);
        $this->assertSoftDeleted('products', ['id' => $product->id]);
        $this->assertDatabaseMissing('communities', ['id' => $community->id]);
        Storage::disk('public')->assertExists('marketplace/animals/admin-delete.png');
        Storage::disk('public')->assertExists('marketplace/products/admin-delete.png');
    }

    public function test_marketplace_moderation_is_paginated_bounded_and_filterable(): void
    {
        $admin = User::factory()->admin()->create();
        $author = User::factory()->create();

        Product::factory()->count(25)->create([
            'user_id' => $author->id,
            'moderation_status' => Product::MODERATION_STATUS_PENDING_REVIEW,
        ]);
        Product::factory()->create([
            'user_id' => $author->id,
            'name' => 'Produit approuve distinctif',
            'moderation_status' => Product::MODERATION_STATUS_ACTIVE,
        ]);

        Sanctum::actingAs($admin, ['*']);

        $this->getJson('/api/admin/moderation/products?per_page=10&page=2')
            ->assertOk()
            ->assertJsonCount(10, 'data')
            ->assertJsonPath('meta.currentPage', 2)
            ->assertJsonPath('meta.perPage', 10)
            ->assertJsonPath('meta.total', 26)
            ->assertJsonPath('meta.lastPage', 3);

        $this->getJson('/api/admin/moderation/products?status=active&q=distinctif')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.title', 'Produit approuve distinctif');

        $this->getJson('/api/admin/moderation/products?per_page=51')
            ->assertUnprocessable()
            ->assertJsonValidationErrors('per_page');

        $this->getJson('/api/admin/moderation/products?status=unknown')
            ->assertUnprocessable()
            ->assertJsonValidationErrors('status');
    }
}
