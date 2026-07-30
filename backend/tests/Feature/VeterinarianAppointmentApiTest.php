<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Veterinarian;
use App\Models\VeterinarianAppointment;
use App\Notifications\VeterinarianAppointmentNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Notification;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class VeterinarianAppointmentApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_veterinarian_defines_non_overlapping_slots_and_client_books_once(): void
    {
        Notification::fake();
        [$vetUser, $veterinarian] = $this->veterinarian();
        $client = User::factory()->create();
        $startsAt = now()->addDay()->startOfHour();
        $endsAt = $startsAt->copy()->addMinutes(30);

        Sanctum::actingAs($vetUser);
        $slotId = $this->postJson("/api/veterinarians/{$veterinarian->id}/availability", [
            'starts_at' => $startsAt->toISOString(),
            'ends_at' => $endsAt->toISOString(),
        ])->assertCreated()->json('data.id');

        $this->postJson("/api/veterinarians/{$veterinarian->id}/availability", [
            'starts_at' => $startsAt->copy()->addMinutes(15)->toISOString(),
            'ends_at' => $endsAt->copy()->addMinutes(15)->toISOString(),
        ])->assertUnprocessable();

        Sanctum::actingAs($client);
        $this->postJson("/api/veterinarians/{$veterinarian->id}/appointments", [
            'availability_slot_id' => $slotId,
            'animal_type' => 'chat',
            'reason' => 'Controle preventif',
        ])->assertCreated()
            ->assertJsonPath('data.status', 'pending')
            ->assertJsonMissingPath('data.client.email');

        $otherClient = User::factory()->create();
        Sanctum::actingAs($otherClient);
        $this->postJson("/api/veterinarians/{$veterinarian->id}/appointments", [
            'availability_slot_id' => $slotId,
            'animal_type' => 'chien',
            'reason' => 'Vaccination',
        ])->assertUnprocessable();

        $this->assertDatabaseCount('veterinarian_appointments', 1);
        Notification::assertSentTo($vetUser, VeterinarianAppointmentNotification::class);
    }

    public function test_only_participants_can_view_and_status_transitions_are_enforced(): void
    {
        Notification::fake();
        [$vetUser, $veterinarian] = $this->veterinarian();
        $client = User::factory()->create();
        $stranger = User::factory()->create();
        $appointment = VeterinarianAppointment::query()->create([
            'veterinarian_id' => $veterinarian->id,
            'client_id' => $client->id,
            'animal_type' => 'chat',
            'reason' => 'Consultation',
            'starts_at' => now()->addHour(),
            'ends_at' => now()->addHours(2),
            'status' => 'pending',
        ]);

        Sanctum::actingAs($stranger);
        $this->patchJson("/api/veterinarian-appointments/{$appointment->id}/status", [
            'status' => 'confirmed',
        ])->assertForbidden();
        $this->getJson('/api/veterinarian-appointments')->assertJsonCount(0, 'data');

        Sanctum::actingAs($client);
        $this->patchJson("/api/veterinarian-appointments/{$appointment->id}/status", [
            'status' => 'confirmed',
        ])->assertUnprocessable();

        Sanctum::actingAs($vetUser);
        $this->patchJson("/api/veterinarian-appointments/{$appointment->id}/status", [
            'status' => 'confirmed',
        ])->assertOk()->assertJsonPath('data.status', 'confirmed');

        $this->patchJson("/api/veterinarian-appointments/{$appointment->id}/status", [
            'status' => 'completed',
        ])->assertUnprocessable();

        Carbon::setTestNow(now()->addHours(3));
        $this->patchJson("/api/veterinarian-appointments/{$appointment->id}/status", [
            'status' => 'completed',
        ])->assertOk()->assertJsonPath('data.status', 'completed');
        Carbon::setTestNow();
    }

    public function test_review_is_allowed_only_for_client_after_completion_and_only_once(): void
    {
        [$vetUser, $veterinarian] = $this->veterinarian();
        $client = User::factory()->create();
        $appointment = VeterinarianAppointment::query()->create([
            'veterinarian_id' => $veterinarian->id,
            'client_id' => $client->id,
            'animal_type' => 'oiseau',
            'reason' => 'Suivi',
            'starts_at' => now()->subHours(2),
            'ends_at' => now()->subHour(),
            'status' => 'confirmed',
        ]);

        Sanctum::actingAs($client);
        $this->postJson("/api/veterinarian-appointments/{$appointment->id}/review", ['rating' => 5])
            ->assertForbidden();

        $appointment->update(['status' => 'completed']);
        $this->postJson("/api/veterinarian-appointments/{$appointment->id}/review", [
            'rating' => 5,
            'comment' => 'Tres bien',
        ])->assertCreated();
        $this->postJson("/api/veterinarian-appointments/{$appointment->id}/review", ['rating' => 4])
            ->assertForbidden();
    }

    /** @return array{User, Veterinarian} */
    private function veterinarian(): array
    {
        $user = User::factory()->create();
        $veterinarian = Veterinarian::query()->create([
            'user_id' => $user->id,
            'name' => 'Clinique test',
            'is_active' => true,
            'moderation_status' => Veterinarian::MODERATION_STATUS_ACTIVE,
        ]);

        return [$user, $veterinarian];
    }
}
