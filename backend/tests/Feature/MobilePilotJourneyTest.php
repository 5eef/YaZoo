<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Veterinarian;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class MobilePilotJourneyTest extends TestCase
{
    use RefreshDatabase;

    public function test_owner_and_professional_complete_the_care_journey_with_native_tokens(): void
    {
        Notification::fake();
        $professional = User::factory()->create(['email' => 'professional@example.test', 'password' => 'password123']);
        $owner = User::factory()->create(['email' => 'owner@example.test', 'password' => 'password123']);
        $vet = Veterinarian::factory()->create(['user_id' => $professional->id, 'city' => 'Sefrou', 'is_active' => true, 'moderation_status' => 'active']);
        $ownerToken = $this->postJson('/api/auth/mobile/login', ['email' => $owner->email, 'password' => 'password123', 'device_name' => 'Owner Android test'])->assertOk()->json('token');
        $professionalToken = $this->postJson('/api/auth/mobile/login', ['email' => $professional->email, 'password' => 'password123', 'device_name' => 'Professional Android test'])->assertOk()->json('token');

        $this->device($professionalToken);
        $slot = $this->postJson("/api/veterinarians/{$vet->id}/availability", ['starts_at' => now()->addDay()->toISOString(), 'ends_at' => now()->addDay()->addHour()->toISOString()])->assertCreated()->json('data.id');
        $this->device($ownerToken);
        $this->getJson('/api/marketplace/public/veterinarians?city=Sefrou')->assertOk()->assertJsonCount(1, 'data');
        $this->getJson("/api/veterinarians/{$vet->id}")->assertOk()->assertJsonPath('data.id', $vet->id);
        $appointment = $this->postJson("/api/veterinarians/{$vet->id}/appointments", ['availability_slot_id' => $slot, 'animal_type' => 'cat', 'reason' => 'Demonstration test only'])->assertCreated()->json('data.id');
        $this->postJson("/api/veterinarian-appointments/{$appointment}/review", ['rating' => 5])->assertForbidden();
        $conversation = $this->postJson('/api/conversations/direct', ['recipient_id' => $professional->id, 'body' => 'Demonstration test request'])->assertCreated()->json('data.id');

        $this->device($professionalToken);
        $this->getJson('/api/veterinarian-appointments')->assertOk()->assertJsonPath('data.0.id', $appointment);
        $this->patchJson("/api/veterinarian-appointments/{$appointment}/status", ['status' => 'confirmed'])->assertOk();
        $this->getJson("/api/conversations/{$conversation}")->assertOk()->assertJsonPath('data.id', $conversation);
        $this->postJson("/api/conversations/{$conversation}/messages", ['body' => 'Demonstration test response'])->assertCreated();
        $this->travel(2)->days();
        $this->patchJson("/api/veterinarian-appointments/{$appointment}/status", ['status' => 'completed'])->assertOk();
        $this->device($ownerToken);
        $this->postJson("/api/veterinarian-appointments/{$appointment}/review", ['rating' => 5, 'comment' => 'Demonstration test only'])->assertCreated();
        $this->getJson('/api/veterinarian-appointments')->assertOk()->assertJsonPath('data.0.canReview', false);
        $this->travelBack();
    }

    private function device(string $token): void
    {
        $this->app['auth']->forgetGuards();
        $this->withToken($token);
    }
}
