<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Report\StoreReportRequest;
use App\Http\Requests\Report\UpdateReportStatusRequest;
use App\Http\Resources\ReportResource;
use App\Models\Animal;
use App\Models\Post;
use App\Models\Product;
use App\Models\Report;
use App\Models\ServiceListing;
use App\Models\Veterinarian;
use App\Services\Admin\ModerationLogger;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReportController extends Controller
{
    public function __construct(
        private readonly ModerationLogger $logger,
    ) {}

    /**
     * @var array<string, class-string<Model>>
     */
    private const REPORTABLE_MAP = [
        'animal' => Animal::class,
        'product' => Product::class,
        'service' => ServiceListing::class,
        'veterinarian' => Veterinarian::class,
        'post' => Post::class,
    ];

    public function store(StoreReportRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $reportable = $this->findReportable(
            $validated['reportable_type'],
            (int) $validated['reportable_id'],
        );

        abort_if(
            (int) ($reportable->user_id ?? 0) === (int) $request->user()->id,
            422,
            __('messages.reports.self_report'),
        );

        $report = Report::query()->create([
            'reporter_id' => $request->user()->id,
            'reportable_type' => self::REPORTABLE_MAP[$validated['reportable_type']],
            'reportable_id' => $reportable->getKey(),
            'reason' => $validated['reason'],
            'details' => $validated['details'] ?? null,
            'status' => 'pending',
        ])->load(['reporter:id,name,email', 'reviewer:id,name']);

        return response()->json([
            'message' => __('messages.reports.created'),
            'report' => ReportResource::make($report),
        ], 201);
    }

    public function index(Request $request)
    {
        abort_unless((bool) $request->user()?->is_admin, 403);

        $reports = Report::query()
            ->with(['reporter:id,name,email', 'reviewer:id,name'])
            ->latest()
            ->limit((int) min(max($request->integer('limit', 50), 1), 100))
            ->get();

        return ReportResource::collection($reports);
    }

    public function updateStatus(UpdateReportStatusRequest $request, Report $report): ReportResource
    {
        abort_unless((bool) $request->user()?->is_admin, 403);

        $report->update([
            'status' => $request->validated('status'),
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
        ]);

        $this->logger->log($request, 'update_report_status', $report, null, [
            'status' => $request->validated('status'),
        ]);

        return ReportResource::make($report->load(['reporter:id,name,email', 'reviewer:id,name']));
    }

    private function findReportable(string $type, int $id): Model
    {
        $modelClass = self::REPORTABLE_MAP[$type] ?? null;
        abort_unless($modelClass, 422);

        $query = $modelClass::query();
        if ($modelClass === Post::class) {
            $query->visibleTo(request()->user());
        }

        return $query->findOrFail($id);
    }
}
