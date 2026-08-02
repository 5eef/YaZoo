<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\ProfessionalVerification\StoreProfessionalVerificationRequest;
use App\Http\Requests\ProfessionalVerification\UpdateProfessionalVerificationStatusRequest;
use App\Http\Resources\ProfessionalVerificationResource;
use App\Models\MediaAsset;
use App\Models\ProfessionalVerification;
use App\Services\Admin\ModerationLogger;
use App\Services\MediaAssetService;
use Illuminate\Contracts\Cache\LockTimeoutException;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Throwable;

class ProfessionalVerificationController extends Controller
{
    public function __construct(
        private readonly ModerationLogger $logger,
        private readonly MediaAssetService $mediaAssets,
    ) {}

    public function store(StoreProfessionalVerificationRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $document = $request->file('document');
        unset($validated['document']);
        $businessType = (string) $validated['business_type'];
        $pendingKey = $request->user()->id.':'.$businessType;
        $path = null;
        $documentAsset = null;

        if ($document) {
            $extension = strtolower($document->extension() ?: $document->getClientOriginalExtension());
            $path = $document->storeAs(
                'professional-verifications/'.$request->user()->id,
                Str::uuid()->toString().'.'.$extension,
                $this->documentDisk(),
            );

            $validated = [
                ...$validated,
                'document_path' => $path,
                'document_original_name' => $document->getClientOriginalName(),
                'document_mime' => $document->getMimeType() ?: $document->getClientMimeType(),
                'document_size' => $document->getSize(),
            ];
            $documentAsset = $this->mediaAssets->registerStoredPath(
                $request->user(),
                $path,
                'document',
                MediaAsset::VISIBILITY_PRIVATE,
                $validated['document_mime'],
                $validated['document_size'],
                $validated['document_original_name'],
                $this->documentDisk(),
            );
        }

        try {
            $verification = Cache::lock('professional-verification:'.$pendingKey, 15)->block(
                5,
                function () use ($request, $validated, $pendingKey, $businessType, $documentAsset): ProfessionalVerification {
                    return DB::transaction(function () use (
                        $request,
                        $validated,
                        $pendingKey,
                        $businessType,
                        $documentAsset,
                    ): ProfessionalVerification {
                        $existingPending = ProfessionalVerification::query()
                            ->where('user_id', $request->user()->id)
                            ->where('business_type', $businessType)
                            ->where('status', 'pending')
                            ->lockForUpdate()
                            ->first();

                        if ($existingPending) {
                            throw ValidationException::withMessages([
                                'business_type' => [__('messages.professional_verifications.pending_exists')],
                            ]);
                        }

                        $verification = ProfessionalVerification::query()->create([
                            ...$validated,
                            'user_id' => $request->user()->id,
                            'status' => 'pending',
                            'pending_key' => $pendingKey,
                        ]);

                        if ($documentAsset) {
                            $this->mediaAssets->attach($documentAsset, $verification, 'document_path');
                        }

                        return $verification;
                    });
                },
            );
        } catch (Throwable $exception) {
            if ($documentAsset) {
                $this->mediaAssets->discardUnattached($documentAsset, $request->user());
            }
            if ($path && Storage::disk($this->documentDisk())->exists($path)) {
                Storage::disk($this->documentDisk())->delete($path);
            }

            if (
                $exception instanceof LockTimeoutException
                || ($exception instanceof QueryException
                    && str_contains(strtolower($exception->getMessage()), 'pending_key'))
            ) {
                throw ValidationException::withMessages([
                    'business_type' => [__('messages.professional_verifications.pending_exists')],
                ]);
            }

            throw $exception;
        }

        $previous = ProfessionalVerification::query()
            ->where('user_id', $request->user()->id)
            ->where('business_type', $businessType)
            ->whereKeyNot($verification->id)
            ->whereNotNull('document_path')
            ->latest()
            ->first();

        if ($previous && $this->isSafeDocumentPath((string) $previous->document_path)) {
            $disk = Storage::disk($this->documentDisk());
            if ($disk->exists($previous->document_path)) {
                if (! $disk->delete($previous->document_path)) {
                    $verification->delete();
                    if ($path && $disk->exists($path)) {
                        $disk->delete($path);
                    }

                    throw new \RuntimeException('Previous professional document cleanup failed.');
                }

                $previous->forceFill([
                    'document_path' => null,
                    'document_original_name' => null,
                    'document_mime' => null,
                    'document_size' => null,
                ])->save();
            }
        }

        $verification->load(['user:id,name,email,phone,city,country', 'verifier:id,name', 'reviewer:id,name']);

        return response()->json([
            'message' => __('messages.professional_verifications.submitted'),
            'verification' => ProfessionalVerificationResource::make($verification),
        ], 201);
    }

    public function me(Request $request): AnonymousResourceCollection
    {
        $verifications = ProfessionalVerification::query()
            ->where('user_id', $request->user()->id)
            ->with(['verifier:id,name', 'reviewer:id,name'])
            ->latest()
            ->get();

        return ProfessionalVerificationResource::collection($verifications);
    }

    public function adminIndex(Request $request): AnonymousResourceCollection
    {
        abort_unless((bool) $request->user()?->is_admin, 403);

        $verifications = ProfessionalVerification::query()
            ->with(['user:id,name,email,phone,city,country', 'verifier:id,name', 'reviewer:id,name'])
            ->when($request->filled('status'), fn ($query) => $query->where('status', $request->string('status')->trim()))
            ->latest()
            ->limit((int) min(max($request->integer('limit', 50), 1), 100))
            ->get();

        return ProfessionalVerificationResource::collection($verifications);
    }

    public function updateStatus(
        UpdateProfessionalVerificationStatusRequest $request,
        ProfessionalVerification $professionalVerification,
    ): JsonResponse {
        $status = $request->validated('status');

        if (
            $status === 'approved'
            && $professionalVerification->business_type === 'veterinarian'
            && ! $professionalVerification->hasValidVeterinarianCredentials()
        ) {
            throw ValidationException::withMessages([
                'status' => [__('messages.professional_verifications.veterinarian_credentials_required')],
            ]);
        }

        $professionalVerification->update([
            'status' => $status,
            'pending_key' => $status === 'pending'
                ? $professionalVerification->user_id.':'.$professionalVerification->business_type
                : null,
            'review_reason' => $request->validated('review_reason') ?? $professionalVerification->review_reason,
            'admin_note' => $request->validated('admin_note') ?? $professionalVerification->admin_note,
            'reviewed_by' => $status === 'pending' ? null : $request->user()->id,
            'reviewed_at' => $status === 'pending' ? null : now(),
            'verified_by' => $request->user()->id,
            'verified_at' => $status === 'pending' ? null : now(),
        ]);

        $this->logger->log($request, 'update_professional_verification', $professionalVerification, $request->validated('admin_note'), [
            'status' => $status,
            'review_reason' => $request->validated('review_reason'),
        ]);

        return response()->json([
            'message' => __('messages.professional_verifications.status_updated'),
            'verification' => ProfessionalVerificationResource::make(
                $professionalVerification->load(['user:id,name,email,phone,city,country', 'verifier:id,name', 'reviewer:id,name']),
            ),
        ]);
    }

    public function downloadDocument(Request $request, ProfessionalVerification $professionalVerification): StreamedResponse
    {
        $user = $request->user();
        abort_unless($user && ($user->is_admin || (int) $user->id === (int) $professionalVerification->user_id), 403);
        abort_unless(filled($professionalVerification->document_path), 404);
        abort_unless($this->isSafeDocumentPath((string) $professionalVerification->document_path), 404);
        abort_unless(Storage::disk($this->documentDisk())->exists($professionalVerification->document_path), 404);

        if ($user->is_admin) {
            $this->logger->log($request, 'download_professional_verification_document', $professionalVerification, null, [
                'verification_id' => $professionalVerification->id,
                'owner_id' => $professionalVerification->user_id,
            ]);
        }

        return Storage::disk($this->documentDisk())->download(
            $professionalVerification->document_path,
            $this->safeDownloadName($professionalVerification),
        );
    }

    protected function documentDisk(): string
    {
        return (string) config('professional_verifications.disk', 'private');
    }

    protected function isSafeDocumentPath(string $path): bool
    {
        return $path !== ''
            && ! str_contains($path, "\0")
            && ! str_contains(str_replace('\\', '/', $path), '../')
            && str_starts_with(str_replace('\\', '/', $path), 'professional-verifications/');
    }

    protected function safeDownloadName(ProfessionalVerification $professionalVerification): string
    {
        $originalName = basename((string) $professionalVerification->document_original_name);
        $safeName = preg_replace('/[^A-Za-z0-9._-]+/', '_', $originalName) ?: '';
        $safeName = trim($safeName, '._-');

        if ($safeName !== '') {
            return $safeName;
        }

        $extension = match ($professionalVerification->document_mime) {
            'application/pdf' => 'pdf',
            'image/jpeg' => 'jpg',
            'image/png' => 'png',
            'image/webp' => 'webp',
            default => 'bin',
        };

        return 'verification-document.'.$extension;
    }
}
