<?php

namespace Tests\Feature;

use App\Models\Animal;
use App\Models\ProfessionalVerification;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class ProfessionalVerificationApiTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @return array<string, array{string}>
     */
    public static function addedBusinessTypes(): array
    {
        return [
            'seller' => ['seller'],
            'trainer' => ['trainer'],
        ];
    }

    #[DataProvider('addedBusinessTypes')]
    public function test_user_can_submit_new_business_types(string $businessType): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user, ['*']);

        $this->postJson('/api/professional-verifications', [
            'business_type' => $businessType,
        ])
            ->assertCreated()
            ->assertJsonPath('verification.businessType', $businessType)
            ->assertJsonPath('verification.documentPath', null);
    }

    public function test_user_can_submit_and_list_professional_verification_requests(): void
    {
        Storage::fake('private');

        $user = User::factory()->create();
        Sanctum::actingAs($user, ['*']);

        $this->post('/api/professional-verifications', [
            'business_type' => 'veterinarian',
            'legal_name' => 'Clinique YaZoo',
            'ice' => '0011223344',
            'onssa_authorization_number' => 'ONSSA-A-123',
            'professional_license_number' => 'LIC-456',
            'document_type' => 'veterinarian_license',
            'document_expires_at' => now()->addYear()->toDateString(),
            'document' => UploadedFile::fake()->create('license.pdf', 120, 'application/pdf'),
        ])
            ->assertCreated()
            ->assertJsonPath('verification.status', 'pending')
            ->assertJsonPath('verification.businessType', 'veterinarian')
            ->assertJsonPath('verification.documentPath', null)
            ->assertJsonPath('verification.hasDocument', true);

        $this->getJson('/api/professional-verifications/me')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.legalName', 'Clinique YaZoo')
            ->assertJsonPath('data.0.documentPath', null)
            ->assertJsonPath('data.0.documentDownloadUrl', '/api/professional-verifications/1/document')
            ->assertJsonPath('data.0.documentOriginalName', 'license.pdf');

        $verification = ProfessionalVerification::query()->firstOrFail();

        $this->assertNotNull($verification->document_path);
        Storage::disk('private')->assertExists($verification->document_path);
    }

    public function test_user_supplied_document_path_is_ignored(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user, ['*']);

        $this->postJson('/api/professional-verifications', [
            'business_type' => 'seller',
            'document_type' => 'license',
            'document_path' => 'professional-verifications/evil.pdf',
        ])
            ->assertCreated()
            ->assertJsonPath('verification.documentPath', null)
            ->assertJsonPath('verification.hasDocument', false);

        $this->assertDatabaseHas('professional_verifications', [
            'user_id' => $user->id,
            'business_type' => 'seller',
            'document_path' => null,
        ]);
    }

    public function test_only_one_pending_request_per_user_and_business_type_is_allowed_and_new_upload_is_cleaned(): void
    {
        Storage::fake('private');
        $user = User::factory()->create();
        $existing = ProfessionalVerification::query()->create([
            'user_id' => $user->id,
            'business_type' => 'seller',
            'status' => 'pending',
            'pending_key' => $user->id.':seller',
        ]);
        Sanctum::actingAs($user, ['*']);

        $this->postJson('/api/professional-verifications', [
            'business_type' => 'seller',
            'legal_name' => 'Nouvelle demande',
            'document' => UploadedFile::fake()->create('preuve.pdf', 64, 'application/pdf'),
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('business_type');

        $this->assertSame(1, ProfessionalVerification::query()
            ->where('user_id', $user->id)
            ->where('business_type', 'seller')
            ->where('status', 'pending')
            ->count());
        $this->assertDatabaseHas('professional_verifications', ['id' => $existing->id]);
        $this->assertSame([], Storage::disk('private')->allFiles());
    }

    public function test_successful_replacement_removes_the_previous_private_document(): void
    {
        Storage::fake('private');
        $user = User::factory()->create();
        Storage::disk('private')->put('professional-verifications/old.pdf', 'old');
        $previous = ProfessionalVerification::query()->create([
            'user_id' => $user->id,
            'business_type' => 'seller',
            'status' => 'rejected',
            'document_path' => 'professional-verifications/old.pdf',
        ]);
        Sanctum::actingAs($user, ['*']);

        $this->postJson('/api/professional-verifications', [
            'business_type' => 'seller',
            'legal_name' => 'Nouvelle demande',
            'document' => UploadedFile::fake()->create('preuve.pdf', 64, 'application/pdf'),
        ])->assertCreated();

        Storage::disk('private')->assertMissing('professional-verifications/old.pdf');
        $this->assertNull($previous->fresh()->document_path);
        $this->assertCount(1, Storage::disk('private')->allFiles());
    }

    public function test_professional_verification_submission_has_a_dedicated_rate_limit(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user, ['*']);

        $this->postJson('/api/professional-verifications', [
            'business_type' => 'seller',
        ])->assertCreated();

        foreach (range(1, 4) as $_) {
            $this->postJson('/api/professional-verifications', [
                'business_type' => 'seller',
            ])->assertUnprocessable();
        }

        $this->postJson('/api/professional-verifications', [
            'business_type' => 'seller',
        ])->assertTooManyRequests();
    }

    public function test_veterinarian_request_requires_complete_future_license_information(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user, ['*']);

        $this->postJson('/api/professional-verifications', [
            'business_type' => 'veterinarian',
            'document_type' => 'veterinarian_license',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors([
                'professional_license_number',
                'document',
                'document_expires_at',
            ]);

        $this->post('/api/professional-verifications', [
            'business_type' => 'veterinarian',
            'professional_license_number' => 'VET-100',
            'document_type' => 'license',
            'document_expires_at' => now()->addYear()->toDateString(),
            'document' => UploadedFile::fake()->create('license.pdf', 120, 'application/pdf'),
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['document_type']);
    }

    public function test_admin_cannot_approve_incomplete_veterinarian_credentials(): void
    {
        $admin = User::factory()->admin()->create();
        $verification = ProfessionalVerification::query()->create([
            'user_id' => User::factory()->create()->id,
            'business_type' => 'veterinarian',
            'document_type' => 'veterinarian_license',
            'status' => 'pending',
        ]);

        Sanctum::actingAs($admin, ['*']);

        $this->patchJson("/api/admin/professional-verifications/{$verification->id}/status", [
            'status' => 'approved',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['status']);
    }

    public function test_admin_can_review_professional_verification_requests(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);
        $verification = ProfessionalVerification::query()->create([
            'user_id' => User::factory()->create()->id,
            'business_type' => 'pet_shop',
            'status' => 'pending',
        ]);

        Sanctum::actingAs($admin, ['*']);

        $this->patchJson("/api/admin/professional-verifications/{$verification->id}/status", [
            'status' => 'approved',
            'admin_note' => 'Documents verifies par l administration YaZoo.',
        ])
            ->assertOk()
            ->assertJsonPath('verification.status', 'approved')
            ->assertJsonPath('verification.adminNote', 'Documents verifies par l administration YaZoo.');

        $this->assertDatabaseHas('professional_verifications', [
            'id' => $verification->id,
            'status' => 'approved',
            'verified_by' => $admin->id,
            'reviewed_by' => $admin->id,
        ]);
    }

    public function test_invalid_document_mime_is_refused(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user, ['*']);

        $this->post('/api/professional-verifications', [
            'business_type' => 'association',
            'document_type' => 'association_document',
            'document' => UploadedFile::fake()->create('notes.txt', 12, 'text/plain'),
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('document');
    }

    public function test_oversized_document_is_refused(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user, ['*']);

        $this->post('/api/professional-verifications', [
            'business_type' => 'pet_shop',
            'document_type' => 'license',
            'document' => UploadedFile::fake()->create('large.pdf', 5121, 'application/pdf'),
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('document');
    }

    public function test_user_cannot_download_another_users_professional_document(): void
    {
        Storage::fake('private');

        $owner = User::factory()->create();
        $otherUser = User::factory()->create();
        $verification = $this->verificationWithPrivateDocument($owner);

        Sanctum::actingAs($otherUser, ['*']);

        $this->getJson("/api/admin/professional-verifications/{$verification->id}/document")
            ->assertForbidden();
    }

    public function test_guest_cannot_download_professional_document(): void
    {
        Storage::fake('private');

        $verification = $this->verificationWithPrivateDocument(User::factory()->create());

        $this->getJson("/api/admin/professional-verifications/{$verification->id}/document")
            ->assertUnauthorized();
    }

    public function test_owner_can_download_own_professional_document(): void
    {
        Storage::fake('private');

        $owner = User::factory()->create();
        $verification = $this->verificationWithPrivateDocument($owner);

        Sanctum::actingAs($owner, ['*']);

        $this->get("/api/professional-verifications/{$verification->id}/document")
            ->assertOk()
            ->assertHeader('content-disposition', 'attachment; filename=private.pdf');
    }

    public function test_admin_can_download_private_professional_document(): void
    {
        Storage::fake('private');

        $admin = User::factory()->create(['is_admin' => true]);
        $verification = $this->verificationWithPrivateDocument(User::factory()->create(), '../../private.pdf');

        Sanctum::actingAs($admin, ['*']);

        $this->get("/api/admin/professional-verifications/{$verification->id}/document")
            ->assertOk()
            ->assertHeader('content-disposition', 'attachment; filename=private.pdf');

        $this->assertDatabaseHas('moderation_actions', [
            'admin_id' => $admin->id,
            'action' => 'download_professional_verification_document',
            'target_type' => ProfessionalVerification::class,
            'target_id' => $verification->id,
        ]);
    }

    public function test_missing_private_document_returns_clean_not_found(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);
        $verification = ProfessionalVerification::query()->create([
            'user_id' => User::factory()->create()->id,
            'business_type' => 'veterinarian',
            'document_path' => 'professional-verifications/missing/private.pdf',
            'document_original_name' => 'private.pdf',
            'status' => 'pending',
        ]);

        Sanctum::actingAs($admin, ['*']);

        $response = $this->getJson("/api/admin/professional-verifications/{$verification->id}/document")
            ->assertNotFound();

        $this->assertStringNotContainsString('professional-verifications/missing/private.pdf', $response->getContent());
    }

    public function test_unsafe_document_path_is_not_downloaded(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);
        $verification = ProfessionalVerification::query()->create([
            'user_id' => User::factory()->create()->id,
            'business_type' => 'veterinarian',
            'document_path' => '../private.pdf',
            'document_original_name' => 'private.pdf',
            'status' => 'pending',
        ]);

        Sanctum::actingAs($admin, ['*']);

        $this->getJson("/api/admin/professional-verifications/{$verification->id}/document")
            ->assertNotFound();
    }

    public function test_expired_private_documents_can_be_purged_after_retention(): void
    {
        Storage::fake('private');
        config(['professional_verifications.retention_days' => 30]);

        $verification = $this->verificationWithPrivateDocument(User::factory()->create());
        $verification->forceFill([
            'document_expires_at' => now()->subDays(31),
        ])->save();

        Storage::disk('private')->assertExists($verification->document_path);

        $this->artisan('yazoo:purge-professional-documents')
            ->expectsOutputToContain('scanned=1 deleted=1 failed=0 disk=private')
            ->assertExitCode(0);

        Storage::disk('private')->assertMissing('professional-verifications/test/private.pdf');
        $this->assertDatabaseHas('professional_verifications', [
            'id' => $verification->id,
            'document_path' => null,
            'document_size' => null,
        ]);
    }

    public function test_expired_private_document_purge_dry_run_does_not_delete_or_clear_metadata(): void
    {
        Storage::fake('private');
        config(['professional_verifications.retention_days' => 30]);

        $verification = $this->verificationWithPrivateDocument(User::factory()->create());
        $verification->forceFill(['document_expires_at' => now()->subDays(31)])->save();

        $this->artisan('yazoo:purge-professional-documents', ['--dry-run' => true])
            ->expectsOutputToContain('dry-run: scanned=1 deleted=0 failed=0 disk=private')
            ->assertExitCode(0);

        Storage::disk('private')->assertExists($verification->document_path);
        $this->assertDatabaseHas('professional_verifications', [
            'id' => $verification->id,
            'document_path' => $verification->document_path,
        ]);
    }

    public function test_rejected_document_shows_review_reason_without_private_admin_note_to_owner(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);
        $owner = User::factory()->create();
        $verification = ProfessionalVerification::query()->create([
            'user_id' => $owner->id,
            'business_type' => 'breeder',
            'status' => 'pending',
        ]);

        Sanctum::actingAs($admin, ['*']);

        $this->patchJson("/api/admin/professional-verifications/{$verification->id}/status", [
            'status' => 'rejected',
            'review_reason' => 'Document illisible.',
            'admin_note' => 'Verifier un nouveau document avant approbation.',
        ])->assertOk();

        Sanctum::actingAs($owner, ['*']);

        $this->getJson('/api/professional-verifications/me')
            ->assertOk()
            ->assertJsonPath('data.0.status', 'rejected')
            ->assertJsonPath('data.0.reviewReason', 'Document illisible.')
            ->assertJsonPath('data.0.adminNote', null);
    }

    public function test_expired_document_status_is_exposed_without_public_path(): void
    {
        $owner = User::factory()->create();
        ProfessionalVerification::query()->create([
            'user_id' => $owner->id,
            'business_type' => 'service_provider',
            'status' => 'approved',
            'document_expires_at' => now()->subDay(),
            'document_path' => 'professional-verifications/expired.pdf',
        ]);

        Sanctum::actingAs($owner, ['*']);

        $this->getJson('/api/professional-verifications/me')
            ->assertOk()
            ->assertJsonPath('data.0.status', 'expired')
            ->assertJsonPath('data.0.documentPath', null);
    }

    public function test_legal_config_endpoint_exposes_public_readiness_values(): void
    {
        config([
            'legal.entity_name' => 'YaZoo Test',
            'legal.data_request_response_days' => 30,
        ]);

        $this->getJson('/api/legal/config')
            ->assertOk()
            ->assertJsonPath('entityName', 'YaZoo Test')
            ->assertJsonPath('dataRequestResponseDays', 30);
    }

    public function test_animal_resource_uses_prudent_documentary_status_without_onssa_certification_claim(): void
    {
        $seller = User::factory()->create();
        $animal = Animal::factory()->create([
            'user_id' => $seller->id,
            'legal_status' => 'approved',
            'onssa_authorization_number' => 'ONSSA-DECLARED-1',
        ]);

        Sanctum::actingAs(User::factory()->create(), ['*']);

        $response = $this->getJson("/api/animals/{$animal->id}")
            ->assertOk()
            ->assertJsonPath('data.documentaryStatus', 'documents_verified_by_yazoo');

        $payload = $response->getContent();

        $this->assertStringNotContainsString('certifie ONSSA', $payload);
        $this->assertStringNotContainsString('approuve ONSSA', $payload);
    }

    private function verificationWithPrivateDocument(User $owner, string $originalName = 'private.pdf'): ProfessionalVerification
    {
        Storage::disk('private')->put('professional-verifications/test/private.pdf', 'private document');

        return ProfessionalVerification::query()->create([
            'user_id' => $owner->id,
            'business_type' => 'veterinarian',
            'document_path' => 'professional-verifications/test/private.pdf',
            'document_original_name' => $originalName,
            'document_mime' => 'application/pdf',
            'document_size' => 16,
            'status' => 'pending',
        ]);
    }
}
