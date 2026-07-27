<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Privacy\StoreDataDeletionRequestRequest;
use App\Http\Resources\DataDeletionRequestResource;
use App\Models\DataDeletionRequest;
use App\Services\Admin\ModerationLogger;
use App\Services\Privacy\AccountDeletionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

class DataDeletionRequestController extends Controller
{
    public function __construct(
        private readonly ModerationLogger $logger,
        private readonly AccountDeletionService $accountDeletion,
    ) {}

    public function store(StoreDataDeletionRequestRequest $request): JsonResponse
    {
        $existingRequest = DataDeletionRequest::query()
            ->where('user_id', $request->user()->id)
            ->where('status', 'pending')
            ->latest()
            ->first();

        if ($existingRequest) {
            return response()->json([
                'message' => __('messages.privacy.deletion_request_already_pending'),
                'request' => DataDeletionRequestResource::make($existingRequest),
            ]);
        }

        $deletionRequest = DataDeletionRequest::query()->create([
            'user_id' => $request->user()->id,
            'reason' => $request->validated('reason'),
            'status' => 'pending',
        ]);

        return response()->json([
            'message' => __('messages.privacy.deletion_request_created'),
            'request' => DataDeletionRequestResource::make($deletionRequest),
        ], 201);
    }

    public function show(Request $request): AnonymousResourceCollection
    {
        $requests = DataDeletionRequest::query()
            ->where('user_id', $request->user()->id)
            ->with('reviewer:id,name')
            ->latest()
            ->get();

        return DataDeletionRequestResource::collection($requests);
    }

    public function adminIndex(Request $request): AnonymousResourceCollection
    {
        abort_unless((bool) $request->user()?->is_admin, 403);

        $requests = DataDeletionRequest::query()
            ->with(['user:id,name,email', 'reviewer:id,name'])
            ->latest()
            ->limit((int) min(max($request->integer('limit', 50), 1), 100))
            ->get();

        return DataDeletionRequestResource::collection($requests);
    }

    public function updateStatus(Request $request, DataDeletionRequest $dataDeletionRequest): JsonResponse
    {
        abort_unless((bool) $request->user()?->is_admin, 403);

        $validated = $request->validate([
            'status' => ['required', 'string', Rule::in(['pending', 'reviewed', 'rejected', 'completed'])],
            'admin_note' => ['nullable', 'string', 'max:2000'],
        ]);

        if ($validated['status'] === 'completed') {
            $dataDeletionRequest = $this->accountDeletion->process(
                $dataDeletionRequest,
                $request->user(),
            );
        } else {
            $dataDeletionRequest->update([
                'status' => $validated['status'],
                'admin_note' => $validated['admin_note'] ?? $dataDeletionRequest->admin_note,
                'reviewed_by' => $request->user()->id,
                'reviewed_at' => now(),
            ]);
        }

        $this->logger->log($request, 'update_delete_request', $dataDeletionRequest, $validated['admin_note'] ?? null, [
            'status' => $validated['status'],
        ]);

        return response()->json([
            'message' => __('messages.privacy.deletion_request_updated'),
            'request' => DataDeletionRequestResource::make(
                $dataDeletionRequest->load('reviewer:id,name'),
            ),
        ]);
    }
}
