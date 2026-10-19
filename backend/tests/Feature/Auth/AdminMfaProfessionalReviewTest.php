<?php

namespace Tests\Feature\Auth;

use App\Models\ProfessionalVerification;
use App\Models\User;
use App\Support\Totp;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminMfaProfessionalReviewTest extends TestCase
{
    use RefreshDatabase;

    public function test_veterinarian_badge_requires_persisted_admin_review_behind_enforced_mfa(): void
    {
        config(['auth.admin_mfa.enforced' => true]);
        Storage::fake('private');
        Storage::disk('private')->put('professional-verifications/isolated-test.pdf', '%PDF-1.4 isolated synthetic fixture');
        $owner = User::factory()->create();
        $admin = User::factory()->create(['is_admin' => true, 'password' => Hash::make('Isolated-MFA-Only-2026!')]);
        $verification = ProfessionalVerification::query()->create([
            'user_id' => $owner->id, 'business_type' => 'veterinarian', 'status' => 'pending',
            'professional_license_number' => 'ISOLATED-TEST-LICENSE', 'document_type' => 'veterinarian_license',
            'document_path' => 'professional-verifications/isolated-test.pdf', 'document_expires_at' => now()->addYear(),
        ]);
        Sanctum::actingAs($owner);
        $this->getJson("/api/users/{$owner->id}")->assertOk()->assertJsonPath('data.isProfessionalVerified', false);
        $this->patchJson("/api/admin/professional-verifications/{$verification->id}/status", ['status' => 'approved'])->assertForbidden();
        Sanctum::actingAs($admin);
        $review = "/api/admin/professional-verifications/{$verification->id}/status";
        $this->patchJson($review, ['status' => 'approved'])->assertStatus(423)->assertJsonPath('reason', 'enrollment_required');
        $this->postJson('/api/admin/mfa/enroll', ['password' => 'Isolated-MFA-Only-2026!'])->assertOk();
        $code = Totp::code((string) $admin->refresh()->admin_mfa_secret, intdiv(time(), 30));
        $this->postJson('/api/admin/mfa/confirm', ['code' => $code])->assertOk();
        $this->patchJson($review, ['status' => 'approved'])->assertStatus(423)->assertJsonPath('reason', 'challenge_required');
        $this->postJson('/api/admin/mfa/challenge', ['code' => $code])->assertOk();
        $this->patchJson($review, ['status' => 'approved'])->assertOk();
        $this->assertDatabaseHas('professional_verifications', ['id' => $verification->id, 'status' => 'approved', 'reviewed_by' => $admin->id]);
        Sanctum::actingAs($owner->fresh());
        $this->getJson("/api/users/{$owner->id}")->assertOk()->assertJsonPath('data.isProfessionalVerified', true);
        Sanctum::actingAs($admin->fresh());
        $this->patchJson($review, ['status' => 'rejected', 'review_reason' => 'Isolated revocation test'])->assertOk();
        Sanctum::actingAs($owner->fresh());
        $this->getJson("/api/users/{$owner->id}")->assertOk()->assertJsonPath('data.isProfessionalVerified', false);
    }
}
