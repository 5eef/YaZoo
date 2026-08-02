<?php

namespace Tests\Feature;

use App\Models\Animal;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ReportApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_report_another_users_content_and_admin_can_update_status(): void
    {
        $owner = User::factory()->create();
        $reporter = User::factory()->create();
        $admin = User::factory()->create(['is_admin' => true]);
        $animal = Animal::factory()->create(['user_id' => $owner->id]);

        Sanctum::actingAs($reporter, ['*']);

        $createResponse = $this->postJson('/api/reports', [
            'reportable_type' => 'animal',
            'reportable_id' => $animal->id,
            'reason' => 'animal_welfare',
            'details' => 'Annonce a verifier avant publication large.',
        ]);

        $reportId = $createResponse->json('report.id');

        $createResponse
            ->assertCreated()
            ->assertJsonPath('report.reportableType', 'animal')
            ->assertJsonPath('report.reason', 'animal_welfare')
            ->assertJsonPath('report.status', 'pending');

        Sanctum::actingAs($admin, ['*']);

        $this->patchJson("/api/admin/reports/{$reportId}/status", [
            'status' => 'reviewed',
        ])
            ->assertOk()
            ->assertJsonPath('data.status', 'reviewed')
            ->assertJsonPath('data.reviewer.id', $admin->id);
    }

    public function test_user_cannot_report_own_content(): void
    {
        $owner = User::factory()->create();
        $animal = Animal::factory()->create(['user_id' => $owner->id]);

        Sanctum::actingAs($owner, ['*']);

        $this->postJson('/api/reports', [
            'reportable_type' => 'animal',
            'reportable_id' => $animal->id,
            'reason' => 'other',
        ])->assertUnprocessable();

        $this->assertDatabaseCount('reports', 0);
    }
}
