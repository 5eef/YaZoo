<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UpdateAnimalLegalStatusRequest;
use App\Http\Resources\Marketplace\AnimalResource;
use App\Models\Animal;
use App\Services\Admin\ModerationLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class AdminAnimalReviewController extends Controller
{
    public function __construct(
        private readonly ModerationLogger $logger,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        abort_unless((bool) $request->user()?->is_admin, 403);

        $animals = Animal::query()
            ->with([
                'user:id,name,email,phone,phone_verified_at,avatar,city,country',
                'user.latestProfessionalVerification',
            ])
            ->when($request->filled('status'), fn ($query) => $query->where('legal_status', $request->string('status')->trim()))
            ->latest()
            ->limit((int) min(max($request->integer('limit', 50), 1), 100))
            ->get();

        return AnimalResource::collection($animals);
    }

    public function updateStatus(UpdateAnimalLegalStatusRequest $request, Animal $animal): JsonResponse
    {
        abort_unless((bool) $request->user()?->is_admin, 403);

        $animal->update([
            'legal_status' => $request->validated('legal_status'),
            'moderation_note' => $request->validated('moderation_note') ?? $animal->moderation_note,
            'moderated_by' => $request->user()->id,
            'moderated_at' => now(),
        ]);

        $this->logger->log($request, $this->actionForStatus($request->validated('legal_status')), $animal, $request->validated('moderation_note'), [
            'legal_status' => $request->validated('legal_status'),
        ]);

        return response()->json([
            'message' => __('messages.admin.animal_legal_status_updated'),
            'animal' => AnimalResource::make(
                $animal->load([
                    'user:id,name,email,phone,phone_verified_at,avatar,city,country',
                    'user.latestProfessionalVerification',
                ]),
            ),
        ]);
    }

    private function actionForStatus(string $status): string
    {
        return match ($status) {
            'approved' => 'approve_animal',
            'rejected' => 'reject_animal',
            'suspended' => 'suspend_animal',
            default => 'restore_animal',
        };
    }
}
