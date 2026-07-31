<?php

namespace Tests\Feature;

use App\Models\DataDeletionRequest;
use App\Models\Comment;
use App\Models\Conversation;
use App\Models\Post;
use App\Models\Product;
use App\Models\ProfessionalVerification;
use App\Models\Reservation;
use App\Models\PrivacyConsent;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use RuntimeException;
use Tests\TestCase;

class PrivacyApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_cookie_consent_is_stored_without_raw_ip(): void
    {
        $response = $this
            ->withHeader('User-Agent', 'Privacy test browser')
            ->postJson('/api/privacy/consents/public', [
                'type' => 'cookies_analytics',
                'accepted' => false,
                'locale' => 'fr',
            ]);

        $response
            ->assertCreated()
            ->assertJsonPath('consent.type', 'cookies_analytics')
            ->assertJsonPath('consent.accepted', false);

        $consent = PrivacyConsent::query()->firstOrFail();

        $this->assertNull($consent->user_id);
        $this->assertFalse($consent->accepted);
        $this->assertNull($consent->accepted_at);
        $this->assertNotSame('127.0.0.1', $consent->ip_hash);
        $this->assertNotSame('Privacy test browser', $consent->user_agent_hash);
    }

    public function test_authenticated_user_can_store_consent_and_export_data(): void
    {
        $user = User::factory()->create([
            'name' => 'Privacy User',
            'email' => 'privacy@example.com',
            'phone' => '+212600000000',
        ]);
        $otherUser = User::factory()->create();
        $post = Post::factory()->create(['user_id' => $user->id]);
        $post->comments()->create([
            'user_id' => $user->id,
            'body' => 'Mon commentaire exportable',
        ]);
        $conversation = Conversation::query()->create([
            'participant_one_id' => $user->id,
            'participant_two_id' => $otherUser->id,
        ]);
        $conversation->messages()->create([
            'user_id' => $user->id,
            'body' => 'Message écrit par la personne concernée',
        ]);
        $conversation->messages()->create([
            'user_id' => $otherUser->id,
            'body' => 'Message tiers à ne pas exporter',
        ]);
        ProfessionalVerification::query()->create([
            'user_id' => $user->id,
            'business_type' => 'seller',
            'legal_name' => 'Privacy Commerce',
            'status' => 'pending',
        ]);

        Sanctum::actingAs($user, ['*']);

        $this->postJson('/api/privacy/consents', [
            'type' => 'sms_otp',
            'accepted' => true,
            'locale' => 'fr',
        ])
            ->assertCreated()
            ->assertJsonPath('consent.type', 'sms_otp')
            ->assertJsonPath('consent.accepted', true);

        $exportResponse = $this->getJson('/api/privacy/export');

        $exportResponse
            ->assertOk()
            ->assertJsonPath('profile.email', 'privacy@example.com')
            ->assertJsonPath('profile.phone', '+212600000000')
            ->assertJsonMissingPath('profile.password')
            ->assertJsonPath('privacyConsents.0.type', 'sms_otp')
            ->assertJsonPath('comments.0.body', 'Mon commentaire exportable')
            ->assertJsonPath('sentMessages.0.body', 'Message écrit par la personne concernée')
            ->assertJsonPath('professionalVerifications.0.legal_name', 'Privacy Commerce')
            ->assertJsonMissing(['Message tiers à ne pas exporter'])
            ->assertJsonPath('excluded.messagesAuthoredByOthers', 'Only messages authored by this account are included.');
    }

    public function test_user_can_create_only_one_pending_deletion_request(): void
    {
        $user = User::factory()->create();

        Sanctum::actingAs($user, ['*']);

        $this->postJson('/api/privacy/delete-request', [
            'reason' => 'Je veux fermer mon compte.',
        ])
            ->assertCreated()
            ->assertJsonPath('request.status', 'pending');

        $this->postJson('/api/privacy/delete-request', [
            'reason' => 'Deuxieme demande.',
        ])
            ->assertOk()
            ->assertJsonPath('request.status', 'pending');

        $this->assertDatabaseCount('data_deletion_requests', 1);
    }

    public function test_admin_can_update_deletion_request_status(): void
    {
        $user = User::factory()->create();
        $admin = User::factory()->create(['is_admin' => true]);
        $deletionRequest = DataDeletionRequest::query()->create([
            'user_id' => $user->id,
            'status' => 'pending',
        ]);

        Sanctum::actingAs($admin, ['*']);

        $this->patchJson("/api/admin/privacy/delete-requests/{$deletionRequest->id}/status", [
            'status' => 'reviewed',
            'admin_note' => 'Revue manuelle ouverte.',
        ])
            ->assertOk()
            ->assertJsonPath('request.status', 'reviewed')
            ->assertJsonPath('request.adminNote', 'Revue manuelle ouverte.');
    }

    public function test_completed_deletion_anonymizes_personal_data_revokes_access_and_removes_files(): void
    {
        Storage::fake('public');
        Storage::fake('private');
        Storage::disk('public')->put('avatars/private.jpg', 'avatar');
        Storage::disk('public')->put('marketplace/private.jpg', 'product');
        Storage::disk('private')->put('professional-verifications/1/license.pdf', 'license');

        $user = User::factory()->create([
            'name' => 'Identite Privee',
            'email' => 'private-person@example.com',
            'phone' => '+212600111222',
            'avatar' => 'avatars/private.jpg',
            'google_id' => 'google-private-id',
        ]);
        $admin = User::factory()->admin()->create();
        $tokenId = $user->createToken('device')->accessToken->id;
        DB::table('sessions')->insert([
            'id' => 'private-session',
            'user_id' => $user->id,
            'ip_address' => '127.0.0.1',
            'user_agent' => 'private browser',
            'payload' => 'private payload',
            'last_activity' => now()->timestamp,
        ]);

        $product = Product::factory()->create([
            'user_id' => $user->id,
            'name' => 'Produit personnel',
            'description' => 'Description personnelle',
            'image_url' => 'marketplace/private.jpg',
            'gallery_urls' => [],
        ]);
        Reservation::factory()->create([
            'buyer_id' => $user->id,
            'seller_id' => $admin->id,
            'reservable_type' => Product::class,
            'reservable_id' => $product->id,
            'note' => 'Note personnelle',
            'contact_phone' => '+212600111222',
            'delivery_contact_name' => 'Identite Privee',
            'delivery_address' => 'Adresse privee',
        ]);
        ProfessionalVerification::query()->create([
            'user_id' => $user->id,
            'business_type' => 'seller',
            'document_path' => 'professional-verifications/1/license.pdf',
            'status' => 'pending',
        ]);
        $deletionRequest = DataDeletionRequest::query()->create([
            'user_id' => $user->id,
            'reason' => 'Motif personnel',
            'status' => 'pending',
        ]);

        Sanctum::actingAs($admin, ['*']);
        $this->patchJson("/api/admin/privacy/delete-requests/{$deletionRequest->id}/status", [
            'status' => 'completed',
        ])
            ->assertOk()
            ->assertJsonPath('request.status', 'completed');

        $user->refresh();
        $this->assertStringStartsWith('deleted.', $user->email);
        $this->assertStringEndsWith('@deleted.invalid', $user->email);
        $this->assertNull($user->phone);
        $this->assertNull($user->avatar);
        $this->assertNull($user->google_id);
        $this->assertTrue($user->isBanned());
        $this->assertFalse($user->is_admin);
        $this->assertDatabaseMissing('personal_access_tokens', ['id' => $tokenId]);
        $this->assertDatabaseMissing('sessions', ['id' => 'private-session']);
        $this->assertDatabaseMissing('professional_verifications', ['user_id' => $user->id]);
        $this->assertDatabaseHas('reservations', [
            'buyer_id' => $user->id,
            'note' => null,
            'contact_phone' => null,
            'delivery_contact_name' => null,
            'delivery_address' => null,
        ]);
        $this->assertDatabaseHas('products', [
            'id' => $product->id,
            'name' => 'Produit retire',
            'moderation_status' => 'suspended',
            'image_url' => null,
        ]);
        Storage::disk('public')->assertMissing('avatars/private.jpg');
        Storage::disk('public')->assertMissing('marketplace/private.jpg');
        Storage::disk('private')->assertMissing('professional-verifications/1/license.pdf');

        $this->postJson('/api/auth/login', [
            'email' => 'private-person@example.com',
            'password' => 'password',
        ])->assertUnprocessable();
    }

    public function test_deletion_processing_is_idempotent(): void
    {
        Storage::fake('public');
        Storage::fake('private');
        $user = User::factory()->create();
        $admin = User::factory()->admin()->create();
        $deletionRequest = DataDeletionRequest::query()->create([
            'user_id' => $user->id,
            'status' => 'pending',
        ]);

        Sanctum::actingAs($admin, ['*']);
        foreach (range(1, 2) as $attempt) {
            $this->patchJson("/api/admin/privacy/delete-requests/{$deletionRequest->id}/status", [
                'status' => 'completed',
            ])->assertOk();
        }

        $deletionRequest->refresh();
        $this->assertSame('completed', $deletionRequest->status);
        $this->assertSame(1, $deletionRequest->processing_attempts);
        $this->assertNotNull($deletionRequest->completed_at);
    }

    public function test_storage_failure_is_recorded_without_completing_request(): void
    {
        $user = User::factory()->create();
        $admin = User::factory()->admin()->create();
        ProfessionalVerification::query()->create([
            'user_id' => $user->id,
            'business_type' => 'seller',
            'document_path' => 'professional-verifications/failure.pdf',
            'status' => 'pending',
        ]);
        $deletionRequest = DataDeletionRequest::query()->create([
            'user_id' => $user->id,
            'status' => 'pending',
        ]);

        Storage::shouldReceive('disk')
            ->once()
            ->with('private')
            ->andThrow(new RuntimeException('simulated storage failure'));

        Sanctum::actingAs($admin, ['*']);
        $this->patchJson("/api/admin/privacy/delete-requests/{$deletionRequest->id}/status", [
            'status' => 'completed',
        ])->assertServerError();

        $deletionRequest->refresh();
        $this->assertSame('failed', $deletionRequest->status);
        $this->assertSame('storage_cleanup_failed', $deletionRequest->failure_code);
        $this->assertNull($deletionRequest->completed_at);
        $this->assertTrue($user->fresh()->isBanned());
    }
}
