<?php

namespace Tests\Feature\Marketplace;

use App\Models\Animal;
use App\Models\Product;
use App\Models\ServiceListing;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class MarketplaceContactPrivacyTest extends TestCase
{
    use RefreshDatabase;

    public function test_account_identifiers_never_leak_and_messages_only_hides_listing_contacts(): void
    {
        $owner = User::factory()->create([
            'email' => 'account-secret@example.test',
            'phone' => '+212600000001',
        ]);
        $viewer = User::factory()->create();
        $animal = Animal::factory()->create([
            'user_id' => $owner->id,
            'legal_status' => 'approved',
            'contact_visibility' => 'messages_only',
            'contact_phone' => '+212611111111',
            'contact_email' => 'listing@example.test',
        ]);

        Sanctum::actingAs($viewer, ['*']);

        $response = $this->getJson("/api/animals/{$animal->id}")
            ->assertOk()
            ->assertJsonPath('data.contactVisibility', 'messages_only')
            ->assertJsonPath('data.contactPhone', null)
            ->assertJsonPath('data.contactEmail', null)
            ->assertJsonMissingPath('data.author.email')
            ->assertJsonMissingPath('data.author.phone');

        $encoded = json_encode($response->json(), JSON_THROW_ON_ERROR);
        $this->assertStringNotContainsString('account-secret@example.test', $encoded);
        $this->assertStringNotContainsString('+212600000001', $encoded);
        $this->assertStringNotContainsString('+212611111111', $encoded);
        $this->assertStringNotContainsString('listing@example.test', $encoded);
    }

    public function test_approved_listing_discloses_only_the_explicitly_selected_contact(): void
    {
        $owner = User::factory()->create([
            'email' => 'auth@example.test',
            'phone' => '+212600000002',
        ]);
        $viewer = User::factory()->create();
        $product = Product::factory()->create([
            'user_id' => $owner->id,
            'moderation_status' => Product::MODERATION_STATUS_ACTIVE,
            'contact_visibility' => 'email',
            'contact_phone' => '+212622222222',
            'contact_email' => 'voluntary@example.test',
        ]);

        Sanctum::actingAs($viewer, ['*']);

        $this->getJson("/api/products/{$product->id}")
            ->assertOk()
            ->assertJsonPath('data.contactVisibility', 'email')
            ->assertJsonPath('data.contactEmail', 'voluntary@example.test')
            ->assertJsonPath('data.contactPhone', null)
            ->assertJsonPath('data.whatsappEnabled', false)
            ->assertJsonMissingPath('data.author.email')
            ->assertJsonMissingPath('data.author.phone');
    }

    public function test_owner_and_admin_can_review_contacts_while_listing_is_pending(): void
    {
        $owner = User::factory()->create();
        $admin = User::factory()->admin()->create();
        $service = ServiceListing::factory()->create([
            'user_id' => $owner->id,
            'status' => 'active',
            'moderation_status' => ServiceListing::MODERATION_STATUS_PENDING_REVIEW,
            'contact_visibility' => 'whatsapp',
            'contact_phone' => '+212633333333',
            'contact_email' => 'moderation@example.test',
            'whatsapp_enabled' => true,
        ]);

        Sanctum::actingAs($owner, ['*']);
        $this->getJson("/api/services/{$service->id}")
            ->assertOk()
            ->assertJsonPath('data.contactPhone', '+212633333333')
            ->assertJsonPath('data.contactEmail', 'moderation@example.test')
            ->assertJsonPath('data.whatsappEnabled', true);

        Sanctum::actingAs($admin, ['*']);
        $this->getJson("/api/services/{$service->id}")
            ->assertOk()
            ->assertJsonPath('data.contactPhone', '+212633333333')
            ->assertJsonPath('data.contactEmail', 'moderation@example.test')
            ->assertJsonPath('data.whatsappEnabled', true);
    }

    public function test_guest_public_catalog_never_receives_listing_contacts(): void
    {
        $service = ServiceListing::factory()->create([
            'status' => 'active',
            'moderation_status' => ServiceListing::MODERATION_STATUS_ACTIVE,
            'contact_visibility' => 'phone',
            'contact_phone' => '+212644444444',
            'contact_email' => 'public-hidden@example.test',
        ]);

        $response = $this->getJson("/api/marketplace/public/services/{$service->id}")
            ->assertOk()
            ->assertJsonMissingPath('data.contactPhone')
            ->assertJsonMissingPath('data.contactEmail')
            ->assertJsonMissingPath('data.contactVisibility');

        $encoded = json_encode($response->json(), JSON_THROW_ON_ERROR);
        $this->assertStringNotContainsString('+212644444444', $encoded);
        $this->assertStringNotContainsString('public-hidden@example.test', $encoded);
    }
}
