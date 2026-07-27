<?php

namespace Tests\Feature\Marketplace;

use App\Models\ProfessionalVerification;
use App\Models\ServiceListing;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ServiceListingApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_approved_trainer_can_create_update_list_and_delete_a_service(): void
    {
        $admin = User::factory()->admin()->create();
        $trainer = User::factory()->create();
        ProfessionalVerification::query()->create([
            'user_id' => $trainer->id,
            'business_type' => 'trainer',
            'status' => 'approved',
            'reviewed_by' => $admin->id,
            'reviewed_at' => now(),
        ]);
        Sanctum::actingAs($trainer, ['*']);

        $serviceId = $this->postJson('/api/services', [
            'type' => 'training',
            'title' => 'Education canine',
            'description' => 'Seances individuelles',
            'city' => 'Rabat',
            'price' => 250,
            'price_type' => 'fixed',
        ])
            ->assertCreated()
            ->assertJsonPath('data.moderationStatus', 'pending_review')
            ->json('data.id');

        $this->getJson('/api/my/services?per_page=5')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $serviceId);

        ServiceListing::query()->whereKey($serviceId)->update([
            'moderation_status' => ServiceListing::MODERATION_STATUS_ACTIVE,
        ]);

        $this->getJson('/api/services?type=training&city=Rab&per_page=5')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.title', 'Education canine');

        $this->getJson("/api/services/{$serviceId}")
            ->assertOk()
            ->assertJsonPath('data.viewsCount', 1);

        $this->putJson("/api/services/{$serviceId}", [
            'type' => 'training',
            'title' => 'Education canine positive',
            'description' => 'Seances mises a jour',
            'city' => 'Rabat',
            'price_type' => 'fixed',
        ])
            ->assertOk()
            ->assertJsonPath('data.moderationStatus', 'pending_review');

        $this->deleteJson("/api/services/{$serviceId}")
            ->assertOk();
        $this->assertSoftDeleted('service_listings', ['id' => $serviceId]);
    }

    public function test_feed_is_bounded_approved_only_and_excludes_the_current_users_services(): void
    {
        $viewer = User::factory()->create();
        $provider = User::factory()->create();
        ServiceListing::factory()->count(14)->create([
            'user_id' => $provider->id,
            'moderation_status' => ServiceListing::MODERATION_STATUS_ACTIVE,
        ]);
        ServiceListing::factory()->create([
            'user_id' => $provider->id,
            'title' => 'Invisible',
            'moderation_status' => ServiceListing::MODERATION_STATUS_PENDING_REVIEW,
        ]);
        ServiceListing::factory()->create([
            'user_id' => $viewer->id,
            'title' => 'Propre service',
            'moderation_status' => ServiceListing::MODERATION_STATUS_ACTIVE,
        ]);
        Sanctum::actingAs($viewer, ['*']);

        $response = $this->getJson('/api/services/feed?per_page=12')
            ->assertOk()
            ->assertJsonCount(12, 'data')
            ->assertJsonPath('meta.total', 14);

        $titles = collect($response->json('data'))->pluck('title');
        $this->assertFalse($titles->contains('Invisible'));
        $this->assertFalse($titles->contains('Propre service'));

        $this->getJson('/api/services/types')
            ->assertOk()
            ->assertJsonCount(2, 'data');
    }
}
