<?php

namespace Tests\Feature;

use App\Models\Conversation;
use App\Models\DataDeletionRequest;
use App\Models\Post;
use App\Models\PrivacyConsent;
use App\Models\Product;
use App\Models\ProfessionalVerification;
use App\Models\Reservation;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use RuntimeException;
use Symfony\Component\HttpFoundation\StreamedJsonResponse;
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

        $this->assertInstanceOf(StreamedJsonResponse::class, $exportResponse->baseResponse);

        $exportResponse
            ->assertOk()
            ->assertJsonPath('profile.email', 'privacy@example.com')
            ->assertJsonPath('profile.phone', '+212600000000')
            ->assertJsonMissingPath('profile.password')
            ->assertJsonMissingPath('posts.0.user_id')
            ->assertJsonPath('privacyConsents.0.type', 'sms_otp')
            ->assertJsonPath('comments.0.body', 'Mon commentaire exportable')
            ->assertJsonPath('sentMessages.0.body', 'Message écrit par la personne concernée')
            ->assertJsonPath('professionalVerifications.0.legal_name', 'Privacy Commerce')
            ->assertJsonMissingPath('professionalVerifications.0.document_path')
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
        $this->assertNotNull($deletionRequest->database_anonymized_at);
        $this->assertNotNull($deletionRequest->purge_manifest);
        $this->assertTrue($user->fresh()->isBanned());
        $this->assertStringStartsWith('deleted.', $user->fresh()->email);

    }

    public function test_partially_completed_deletion_can_retry_the_persisted_purge_manifest(): void
    {
        Storage::fake('public');
        Storage::fake('private');
        Storage::disk('public')->put('avatars/retry.jpg', 'avatar');
        Storage::disk('private')->put('professional-verifications/retry.pdf', 'document');

        $user = User::factory()->create([
            'email' => 'deleted.retry@deleted.invalid',
            'is_suspended' => true,
            'banned_at' => now(),
        ]);
        $admin = User::factory()->admin()->create();
        $deletionRequest = DataDeletionRequest::query()->create([
            'user_id' => $user->id,
            'status' => 'failed',
            'processing_attempts' => 1,
            'failure_code' => 'storage_cleanup_failed',
            'database_anonymized_at' => now(),
            'purge_manifest' => [
                'private' => ['professional-verifications/retry.pdf'],
                'public' => ['avatars/retry.jpg'],
            ],
        ]);

        Sanctum::actingAs($admin, ['*']);
        $this->patchJson("/api/admin/privacy/delete-requests/{$deletionRequest->id}/status", [
            'status' => 'completed',
        ])->assertOk()->assertJsonPath('request.status', 'completed');

        $deletionRequest->refresh();
        $this->assertSame(2, $deletionRequest->processing_attempts);
        $this->assertNull($deletionRequest->purge_manifest);
        $this->assertNotNull($deletionRequest->purge_completed_at);
        Storage::disk('public')->assertMissing('avatars/retry.jpg');
        Storage::disk('private')->assertMissing('professional-verifications/retry.pdf');
    }

    public function test_database_failure_never_deletes_files_before_anonymization_commits(): void
    {
        Storage::fake('public');
        Storage::fake('private');
        Storage::disk('public')->put('avatars/must-survive.jpg', 'avatar');

        $user = User::factory()->create([
            'email' => 'database-failure@example.com',
            'avatar' => 'avatars/must-survive.jpg',
        ]);
        $anonymousId = substr(hash_hmac(
            'sha256',
            'deleted-user:'.$user->id,
            (string) config('app.key'),
        ), 0, 24);
        User::factory()->create([
            'email' => "deleted.{$anonymousId}@deleted.invalid",
        ]);
        $admin = User::factory()->admin()->create();
        $deletionRequest = DataDeletionRequest::query()->create([
            'user_id' => $user->id,
            'status' => 'pending',
        ]);

        Sanctum::actingAs($admin, ['*']);
        $this->patchJson("/api/admin/privacy/delete-requests/{$deletionRequest->id}/status", [
            'status' => 'completed',
        ])->assertServerError();

        $deletionRequest->refresh();
        $this->assertSame('failed', $deletionRequest->status);
        $this->assertSame('database_processing_failed', $deletionRequest->failure_code);
        $this->assertNull($deletionRequest->database_anonymized_at);
        $this->assertNull($deletionRequest->purge_manifest);
        $this->assertSame('database-failure@example.com', $user->fresh()->email);
        Storage::disk('public')->assertExists('avatars/must-survive.jpg');
    }

    public function test_a_recent_processing_lease_prevents_concurrent_deletion_work(): void
    {
        Storage::fake('public');
        Storage::disk('public')->put('avatars/concurrent.jpg', 'avatar');

        $user = User::factory()->create([
            'email' => 'concurrent-deletion@example.com',
            'avatar' => 'avatars/concurrent.jpg',
        ]);
        $admin = User::factory()->admin()->create();
        $deletionRequest = DataDeletionRequest::query()->create([
            'user_id' => $user->id,
            'status' => 'processing',
            'processing_attempts' => 1,
            'processing_started_at' => now(),
        ]);

        Sanctum::actingAs($admin, ['*']);
        $this->patchJson("/api/admin/privacy/delete-requests/{$deletionRequest->id}/status", [
            'status' => 'completed',
        ])->assertOk()->assertJsonPath('request.status', 'processing');

        $deletionRequest->refresh();
        $this->assertSame(1, $deletionRequest->processing_attempts);
        $this->assertNull($deletionRequest->database_anonymized_at);
        $this->assertSame('concurrent-deletion@example.com', $user->fresh()->email);
        Storage::disk('public')->assertExists('avatars/concurrent.jpg');
    }
}
