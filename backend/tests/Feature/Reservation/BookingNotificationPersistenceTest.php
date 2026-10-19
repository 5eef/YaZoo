<?php

namespace Tests\Feature\Reservation;

use App\Models\ServiceListing;
use App\Models\User;
use App\Models\Veterinarian;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class BookingNotificationPersistenceTest extends TestCase
{
    use RefreshDatabase;

    public function test_service_request_approval_and_cancellation_persist_recipient_notifications(): void
    {
        $provider = User::factory()->create();
        $client = User::factory()->create();
        $stranger = User::factory()->create();
        $service = ServiceListing::factory()->create(['user_id' => $provider->id, 'type' => 'training', 'status' => 'active']);
        Sanctum::actingAs($client);
        $id = $this->postJson('/api/reservations', ['category' => 'training', 'reservable_id' => $service->id])->assertCreated()->json('data.id');
        $this->assertSame('reservation_requested', $provider->notifications()->firstOrFail()->data['kind']);
        Sanctum::actingAs($stranger);
        $this->postJson("/api/reservations/{$id}/approve")->assertForbidden();
        $this->getJson('/api/notifications')->assertOk()->assertJsonCount(0, 'data');
        Sanctum::actingAs($provider);
        $this->postJson("/api/reservations/{$id}/approve")->assertOk()->assertJsonPath('data.status', 'approved');
        $this->assertSame('reservation_approved', $client->notifications()->firstOrFail()->data['kind']);
        Sanctum::actingAs($client);
        $this->postJson("/api/reservations/{$id}/cancel")->assertOk()->assertJsonPath('data.status', 'cancelled');
        $this->assertDatabaseHas('reservations', ['id' => $id, 'reservation_status' => 'cancelled']);
        $this->assertSame(2, $provider->notifications()->count());
        $this->assertTrue($provider->notifications()->get()->contains(fn ($notification) => $notification->data['kind'] === 'reservation_cancelled'));
        $this->getJson('/api/reservations')->assertOk()->assertJsonFragment(['id' => $id, 'status' => 'cancelled']);
    }

    public function test_veterinarian_slot_confirm_cancel_rebook_and_persisted_notifications(): void
    {
        $vet = User::factory()->create();
        $client = User::factory()->create();
        $stranger = User::factory()->create();
        $profile = Veterinarian::query()->create(['user_id' => $vet->id, 'name' => 'Isolated clinic', 'is_active' => true, 'moderation_status' => 'active']);
        Sanctum::actingAs($vet);
        $slot = $this->postJson("/api/veterinarians/{$profile->id}/availability", [
            'starts_at' => now()->addDays(2)->startOfHour()->toISOString(),
            'ends_at' => now()->addDays(2)->startOfHour()->addMinutes(30)->toISOString(),
        ])->assertCreated()->json('data.id');
        Sanctum::actingAs($client);
        $payload = ['availability_slot_id' => $slot, 'animal_type' => 'chat', 'reason' => 'Isolated test'];
        $id = $this->postJson("/api/veterinarians/{$profile->id}/appointments", $payload)->assertCreated()->json('data.id');
        $this->assertSame('pending', $vet->notifications()->firstOrFail()->data['meta']['status']);
        Sanctum::actingAs($stranger);
        $this->patchJson("/api/veterinarian-appointments/{$id}/status", ['status' => 'confirmed'])->assertForbidden();
        $this->getJson('/api/veterinarian-appointments')->assertOk()->assertJsonCount(0, 'data');
        Sanctum::actingAs($vet);
        $this->patchJson("/api/veterinarian-appointments/{$id}/status", ['status' => 'confirmed'])->assertOk();
        $this->assertSame('confirmed', $client->notifications()->firstOrFail()->data['meta']['status']);
        Sanctum::actingAs($client);
        $this->patchJson("/api/veterinarian-appointments/{$id}/status", ['status' => 'cancelled'])->assertOk();
        $this->assertDatabaseHas('veterinarian_appointments', ['id' => $id, 'status' => 'cancelled']);
        $this->assertSame(2, $vet->notifications()->count());
        $second = $this->postJson("/api/veterinarians/{$profile->id}/appointments", $payload)->assertCreated()->json('data.id');
        $this->assertDatabaseCount('veterinarian_appointments', 2);
        $this->getJson('/api/veterinarian-appointments')->assertOk()->assertJsonCount(2, 'data');
        $this->patchJson("/api/veterinarian-appointments/{$second}/status", ['status' => 'rejected'])->assertUnprocessable();
        Sanctum::actingAs($vet);
        $this->patchJson("/api/veterinarian-appointments/{$second}/status", ['status' => 'rejected'])->assertOk();
        $this->assertDatabaseHas('veterinarian_appointments', ['id' => $second, 'status' => 'rejected']);
        $this->assertTrue($client->notifications()->get()->contains(fn ($notification) => ($notification->data['meta']['status'] ?? null) === 'rejected'));
    }
}
