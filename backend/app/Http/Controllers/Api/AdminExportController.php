<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Animal;
use App\Models\Conversation;
use App\Models\DataDeletionRequest;
use App\Models\Message;
use App\Models\ModerationAction;
use App\Models\Post;
use App\Models\Product;
use App\Models\ProfessionalVerification;
use App\Models\Report;
use App\Models\Reservation;
use App\Models\ServiceListing;
use App\Models\User;
use App\Models\Veterinarian;
use App\Support\CsvCellSanitizer;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AdminExportController extends Controller
{
    public function stats(Request $request): StreamedResponse
    {
        return $this->csv('yazoo-admin-stats.csv', [
            ['metric', 'value'],
            ['users', User::query()->count()],
            ['posts', Post::query()->count()],
            ['animals', Animal::query()->count()],
            ['products', Product::query()->count()],
            ['services', ServiceListing::query()->count()],
            ['veterinarians', Veterinarian::query()->count()],
            ['conversations', Conversation::query()->count()],
            ['messages', Message::query()->count()],
            ['reservations', Reservation::query()->count()],
            ['reports_pending', Report::query()->where('status', 'pending')->count()],
            ['reports_actioned', Report::query()->where('status', 'actioned')->count()],
            ['professional_verifications_pending', ProfessionalVerification::query()->where('status', 'pending')->count()],
            ['professional_verifications_approved', ProfessionalVerification::query()->where('status', 'approved')->count()],
            ['professional_verifications_rejected', ProfessionalVerification::query()->where('status', 'rejected')->count()],
            ['data_deletion_requests_pending', DataDeletionRequest::query()->where('status', 'pending')->count()],
            ['data_deletion_requests_completed', DataDeletionRequest::query()->where('status', 'completed')->count()],
        ]);
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
