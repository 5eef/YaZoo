<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ModerationAction;
use App\Models\ProfessionalVerification;
use App\Models\Report;
use App\Services\Admin\BusinessKpiService;
use App\Support\CsvCellSanitizer;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AdminExportController extends Controller
{
    public function stats(Request $request): StreamedResponse
    {
        $validated = $request->validate(['days' => ['nullable', 'integer', 'in:7,30,90']]);
        $metrics = app(BusinessKpiService::class)->get((int) ($validated['days'] ?? 30));
        $rows = collect($metrics)
            ->map(fn (mixed $value, string $metric): array => [$metric, $value])
            ->prepend(['metric', 'value'])
            ->values()
            ->all();

        return $this->csv('yazoo-admin-stats.csv', $rows);
    }

    public function reports(Request $request): StreamedResponse
    {
        $rows = Report::query()
            ->with(['reporter:id,name,email', 'reviewer:id,name'])
            ->latest()
            ->limit(1000)
            ->get()
            ->map(fn (Report $report): array => [
                $report->id,
                $report->reporter?->name,
                $report->reportable_type,
                $report->reportable_id,
                $report->reason,
                $report->status,
                $report->created_at?->toISOString(),
                $report->reviewed_at?->toISOString(),
            ])
            ->prepend(['id', 'reporter', 'target_type', 'target_id', 'reason', 'status', 'created_at', 'reviewed_at'])
            ->all();

        return $this->csv('yazoo-reports.csv', $rows);
    }

    public function moderationActions(Request $request): StreamedResponse
    {
        $rows = ModerationAction::query()
            ->with('admin:id,name,email')
            ->latest()
            ->limit(1000)
            ->get()
            ->map(fn (ModerationAction $action): array => [
                $action->admin?->name,
                $action->action,
                $action->target_type,
                $action->target_id,
                $action->reason,
                $action->created_at?->toISOString(),
            ])
            ->prepend(['admin', 'action', 'target_type', 'target_id', 'reason', 'created_at'])
            ->all();

        return $this->csv('yazoo-moderation-actions.csv', $rows);
    }

    public function professionalVerifications(Request $request): StreamedResponse
    {
        $rows = ProfessionalVerification::query()
            ->with(['user:id,name,email', 'verifier:id,name'])
            ->latest()
            ->limit(1000)
            ->get()
            ->map(fn (ProfessionalVerification $verification): array => [
                $verification->id,
                $verification->user?->name,
                $verification->business_type,
                $verification->legal_name,
                $verification->ice,
                $verification->onssa_authorization_number,
                $verification->professional_license_number,
                $verification->status,
                $verification->verifier?->name,
                $verification->created_at?->toISOString(),
                $verification->verified_at?->toISOString(),
            ])
            ->prepend(['id', 'user', 'business_type', 'legal_name', 'ice', 'onssa_number', 'license_number', 'status', 'verified_by', 'created_at', 'verified_at'])
            ->all();

        return $this->csv('yazoo-professional-verifications.csv', $rows);
    }

    /**
     * @param  array<int, array<int, mixed>>  $rows
     */
    private function csv(string $filename, array $rows): StreamedResponse
    {
        return response()->streamDownload(function () use ($rows): void {
            $handle = fopen('php://output', 'w');
            fwrite($handle, "\xEF\xBB\xBF");

            foreach ($rows as $row) {
                fputcsv($handle, CsvCellSanitizer::sanitizeRow($row));
            }

            fclose($handle);
        }, $filename, [
            'Content-Type' => 'text/csv; charset=UTF-8',
        ]);
    }
}
