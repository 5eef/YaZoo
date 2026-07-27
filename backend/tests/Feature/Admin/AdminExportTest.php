<?php

namespace Tests\Feature\Admin;

use App\Models\ProfessionalVerification;
use App\Models\Report;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminExportTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_export_stats_csv(): void
    {
        Sanctum::actingAs(User::factory()->admin()->create(), ['*']);

        $response = $this->get('/api/admin/exports/stats.csv')
            ->assertOk()
            ->assertHeader('content-type', 'text/csv; charset=UTF-8');

        $this->assertStringContainsString('users', $response->streamedContent());
    }

    public function test_non_admin_cannot_export_reports_csv(): void
    {
        Sanctum::actingAs(User::factory()->create(), ['*']);

        $this->get('/api/admin/exports/reports.csv')->assertForbidden();
    }

    public function test_user_controlled_csv_cells_are_neutralized_without_breaking_utf8(): void
    {
        $admin = User::factory()->admin()->create();
        $reporter = User::factory()->create(['name' => '=HYPERLINK("https://evil.test")']);
        Report::query()->create([
            'reporter_id' => $reporter->id,
            'reportable_type' => 'post',
            'reportable_id' => 1,
            'reason' => '+SUM(1,1)',
            'details' => "Texte arabe: مرحبا\nsuite normale",
            'status' => 'pending',
        ]);
        ProfessionalVerification::query()->create([
            'user_id' => $reporter->id,
            'business_type' => 'seller',
            'legal_name' => '  @commande',
            'ice' => "  \tmalicious",
            'onssa_authorization_number' => 'مرحبا',
            'professional_license_number' => " \rformula",
            'status' => 'pending',
        ]);
        ProfessionalVerification::query()->create([
            'user_id' => User::factory()->create()->id,
            'business_type' => 'breeder',
            'legal_name' => " \nmalicious",
            'status' => 'pending',
        ]);

        $this->actingAs($admin);

        $reports = $this->get('/api/admin/exports/reports.csv')->assertOk()->streamedContent();
        $verifications = $this->get('/api/admin/exports/professional-verifications.csv')
            ->assertOk()
            ->streamedContent();

        $this->assertStringContainsString('\'=HYPERLINK', $reports);
        $this->assertStringContainsString('\'+SUM', $reports);
        $this->assertStringContainsString("'  @commande", $verifications);
        $this->assertStringContainsString("'  \tmalicious", $verifications);
        $this->assertStringContainsString("' \rformula", $verifications);
        $this->assertStringContainsString("' \nmalicious", $verifications);
        $this->assertStringContainsString('مرحبا', $verifications);
    }
}
