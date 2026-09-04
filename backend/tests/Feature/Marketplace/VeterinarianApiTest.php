<?php

namespace Tests\Feature\Marketplace;

use App\Models\User;
use App\Models\Veterinarian;
use App\Models\VeterinarianAppointment;
use App\Models\VeterinarianAppointmentReview;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Middleware\TrustProxies;
use Illuminate\Http\Request as HttpRequest;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class VeterinarianApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_cannot_access_veterinarian_contact_routes(): void
    {
        $veterinarian = Veterinarian::factory()->create([
            'name' => 'Dr Public Vet',
            'is_active' => true,
        ]);

        $this->getJson('/api/veterinarians')->assertUnauthorized();
        $this->getJson("/api/veterinarians/{$veterinarian->id}")->assertUnauthorized();
    }

    public function test_pagination_links_honor_forwarded_https_proxy_headers(): void
    {
        Veterinarian::factory()->count(13)->create(['is_active' => true]);
        Sanctum::actingAs(User::factory()->create(), ['*']);

        TrustProxies::at('*');
        TrustProxies::withHeaders(
            HttpRequest::HEADER_X_FORWARDED_FOR
            | HttpRequest::HEADER_X_FORWARDED_HOST
            | HttpRequest::HEADER_X_FORWARDED_PORT
            | HttpRequest::HEADER_X_FORWARDED_PROTO
            | HttpRequest::HEADER_X_FORWARDED_PREFIX
            | HttpRequest::HEADER_X_FORWARDED_AWS_ELB
        );

        $response = $this
            ->withServerVariables([
                'REMOTE_ADDR' => '10.0.0.5',
                'HTTP_HOST' => 'demo.example',
                'HTTP_X_FORWARDED_FOR' => '203.0.113.10',
                'HTTP_X_FORWARDED_HOST' => 'demo.example',
                'HTTP_X_FORWARDED_PROTO' => 'https',
                'HTTP_X_FORWARDED_PORT' => '443',
            ])
            ->getJson('/api/veterinarians?per_page=1');

        $response->assertOk();

        $this->assertStringStartsWith('https://demo.example', $response->json('links.first'));
        $this->assertStringStartsWith('https://demo.example', $response->json('meta.path'));
    }

    public function test_guest_cannot_create_veterinarian(): void
    {
        $this->postJson('/api/veterinarians', [
            'name' => 'Guest Vet',
        ])->assertUnauthorized();
    }

    public function test_authenticated_user_can_list_veterinarians_with_filters(): void
    {
        $user = User::factory()->approvedProfessional('veterinarian')->create();

        Veterinarian::factory()->create([
            'name' => 'Dr Sara Vet',
            'city' => 'Casablanca',
            'specialties' => ['cats', 'surgery'],
            'is_active' => true,
        ]);

        Veterinarian::factory()->create([
            'name' => 'Inactive Rabat Vet',
            'city' => 'Rabat',
            'specialties' => ['dogs'],
            'is_active' => false,
        ]);

        Sanctum::actingAs($user, ['*']);

        $this->getJson('/api/veterinarians?search=Sara&city=Casa&specialty=cats')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.name', 'Dr Sara Vet')
            ->assertJsonPath('data.0.city', 'Casablanca')
            ->assertJsonPath('data.0.isActive', true);
    }

    public function test_veterinarian_rating_uses_preloaded_appointment_review_aggregates(): void
    {
        $viewer = User::factory()->create();
        $veterinarian = Veterinarian::factory()->create([
            'is_active' => true,
            'moderation_status' => Veterinarian::MODERATION_STATUS_ACTIVE,
        ]);
        $client = User::factory()->create();
        $appointment = VeterinarianAppointment::query()->create([
            'veterinarian_id' => $veterinarian->id,
            'client_id' => $client->id,
            'animal_type' => 'chat',
            'reason' => 'Controle',
            'starts_at' => now()->subHour(),
            'ends_at' => now(),
            'status' => 'completed',
        ]);
        VeterinarianAppointmentReview::query()->create([
            'veterinarian_appointment_id' => $appointment->id,
            'client_id' => $client->id,
            'rating' => 4,
            'comment' => 'Consultation utile',
        ]);

        Sanctum::actingAs($viewer, ['*']);

        $this->getJson('/api/veterinarians')
            ->assertOk()
            ->assertJsonPath('data.0.reviewsCount', 1)
            ->assertJsonPath('data.0.averageRating', 4);

        $this->getJson("/api/veterinarians/{$veterinarian->id}")
            ->assertOk()
            ->assertJsonPath('data.reviewsCount', 1)
            ->assertJsonPath('data.averageRating', 4);
    }

    public function test_authenticated_user_can_create_update_and_delete_veterinarian(): void
    {
        $user = User::factory()->approvedProfessional('veterinarian')->create();
        Sanctum::actingAs($user, ['*']);

        $createResponse = $this->postJson('/api/veterinarians', [
            'name' => 'Dr Youssef',
            'clinic_name' => 'Clinique YaZoo',
            'description' => 'Cabinet veterinaire pour chats et chiens.',
            'city' => 'Casablanca',
            'address' => 'Maarif',
            'phone' => '+212600000000',
            'whatsapp' => '+212600000001',
            'email' => 'vet@example.com',
            'specialties' => ['cats', 'dogs'],
            'working_hours' => ['monday' => '09:00-18:00'],
            'latitude' => 33.5731104,
            'longitude' => -7.5898434,
            'location_url' => 'https://maps.google.com/?q=33.5731104,-7.5898434',
            'is_active' => true,
        ]);

        $veterinarianId = $createResponse->json('data.id');

        $createResponse
            ->assertCreated()
            ->assertJsonPath('data.name', 'Dr Youssef')
            ->assertJsonPath('data.clinicName', 'Clinique YaZoo')
            ->assertJsonPath('data.specialties.0', 'cats');

        $this->patchJson("/api/veterinarians/{$veterinarianId}", [
            'name' => 'Dr Youssef Updated',
            'city' => 'Rabat',
            'specialties' => ['surgery'],
        ])
            ->assertOk()
            ->assertJsonPath('data.name', 'Dr Youssef Updated')
            ->assertJsonPath('data.city', 'Rabat')
            ->assertJsonPath('data.specialties.0', 'surgery');

        $this->deleteJson("/api/veterinarians/{$veterinarianId}")
            ->assertOk()
            ->assertJsonPath('message', 'Veterinaire supprime avec succes.');

        $this->assertSoftDeleted('veterinarians', ['id' => $veterinarianId]);
    }

    public function test_validation_fails_without_name(): void
    {
        Sanctum::actingAs(User::factory()->approvedProfessional('veterinarian')->create(), ['*']);

        $this->postJson('/api/veterinarians', [
            'city' => 'Casablanca',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['name']);
    }

    public function test_user_cannot_update_or_delete_another_users_veterinarian(): void
    {
        $user = User::factory()->create();
        $other = User::factory()->create();
        $veterinarian = Veterinarian::factory()->create(['user_id' => $other->id]);

        Sanctum::actingAs($user, ['*']);

        $this->patchJson("/api/veterinarians/{$veterinarian->id}", [
            'name' => 'Refus',
        ])->assertForbidden();

        $this->deleteJson("/api/veterinarians/{$veterinarian->id}")
            ->assertForbidden();
    }
}
