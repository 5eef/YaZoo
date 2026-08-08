<?php

namespace App\Services\Privacy;

use App\Exceptions\StorageCleanupException;
use App\Models\Animal;
use App\Models\DataDeletionRequest;
use App\Models\Payment;
use App\Models\Post;
use App\Models\Product;
use App\Models\ProfessionalVerification;
use App\Models\ServiceListing;
use App\Models\Story;
use App\Models\User;
use App\Models\Veterinarian;
use App\Support\AccountDeletionRetryPolicy;
use App\Support\MediaStorage;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;
use Throwable;

class AccountDeletionService
{
    public function process(DataDeletionRequest $deletionRequest, User $reviewer): DataDeletionRequest
    {
        $deletionRequest->refresh();

        if ($deletionRequest->status === 'completed') {
            return $deletionRequest;
        }

        try {
            if (! $this->claimAndBlockAccess($deletionRequest, $reviewer)) {
                return $deletionRequest->fresh();
            }

            $manifest = $this->anonymizeDatabase($deletionRequest, $reviewer);
            $this->purgePhysicalFiles($manifest);
            $this->completePurge($deletionRequest, $reviewer);
        } catch (Throwable $exception) {
            $currentRequest = $deletionRequest->fresh();
            $failureCode = $this->failureCode($exception);

            if (
                $currentRequest->processing_attempts
                >= AccountDeletionRetryPolicy::maxProcessingAttempts()
            ) {
                $failureCode = AccountDeletionRetryPolicy::exhaustedFailureCode($currentRequest);
            }

            DataDeletionRequest::query()
                ->whereKey($deletionRequest->id)
                ->where('status', '!=', 'completed')
                ->update([
                    'status' => 'failed',
                    'failure_code' => $failureCode,
                    'processing_started_at' => null,
                    'reviewed_by' => $reviewer->id,
                    'reviewed_at' => now(),
                    'updated_at' => now(),
                ]);

            if (str_ends_with($failureCode, '_exhausted')) {
                Log::critical('Account deletion processing reached its configured attempt limit.', [
                    'deletion_request_id' => $deletionRequest->id,
                    'failure_code' => $failureCode,
                    'processing_attempts' => $currentRequest->processing_attempts,
                ]);
            }

            if ($deletionRequest->fresh()->status !== 'completed') {
                throw $exception;
            }
        }

        return $deletionRequest->fresh();
    }

    private function claimAndBlockAccess(DataDeletionRequest $deletionRequest, User $reviewer): bool
    {
        return DB::transaction(function () use ($deletionRequest, $reviewer): bool {
            $lockedRequest = DataDeletionRequest::query()->lockForUpdate()->findOrFail($deletionRequest->id);

            if ($lockedRequest->status === 'completed') {
                return false;
            }

            if (AccountDeletionRetryPolicy::isTerminal($lockedRequest)) {
                return false;
            }

            if (
                $lockedRequest->processing_attempts
                >= AccountDeletionRetryPolicy::maxProcessingAttempts()
            ) {
                $failureCode = AccountDeletionRetryPolicy::exhaustedFailureCode($lockedRequest);
                $lockedRequest->forceFill([
                    'status' => 'failed',
                    'failure_code' => $failureCode,
                    'processing_started_at' => null,
                ])->save();
                Log::critical('Account deletion processing refused after its configured attempt limit.', [
                    'deletion_request_id' => $lockedRequest->id,
                    'failure_code' => $failureCode,
                    'processing_attempts' => $lockedRequest->processing_attempts,
                ]);

                return false;
            }

            if (
                $lockedRequest->status === 'processing'
                && ! AccountDeletionRetryPolicy::hasExpiredProcessingLease($lockedRequest)
            ) {
                return false;
            }

            $user = User::query()->lockForUpdate()->findOrFail($lockedRequest->user_id);

            $lockedRequest->forceFill([
                'status' => 'processing',
                'processing_attempts' => (int) $lockedRequest->processing_attempts + 1,
                'failure_code' => null,
                'processing_started_at' => now(),
                'reviewed_by' => $reviewer->id,
                'reviewed_at' => now(),
            ])->save();

            $user->forceFill([
                'is_suspended' => true,
                'suspended_at' => $user->suspended_at ?? now(),
                'suspended_reason' => 'account_deletion_processing',
                'banned_at' => $user->banned_at ?? now(),
                'banned_reason' => 'account_deletion_processing',
            ])->save();

            $user->tokens()->delete();
            DB::table('sessions')->where('user_id', $user->id)->delete();
            DB::table('password_reset_tokens')->where('email', $user->email)->delete();

            return true;
        });
    }

    /**
     * @param  array{private: array<int, string>, public: array<int, string|null>}  $manifest
     */
    private function purgePhysicalFiles(array $manifest): void
    {
        try {
            $disk = Storage::disk((string) config('professional_verifications.disk', 'private'));

            foreach ($manifest['private'] as $path) {
                if ($disk->exists($path) && ! $disk->delete($path)) {
                    throw new RuntimeException('Private document cleanup failed.');
                }
            }

            MediaStorage::deleteStoredFilesOrFail($manifest['public']);
        } catch (Throwable $exception) {
            throw new StorageCleanupException(
                'Account deletion storage purge failed.',
                previous: $exception,
            );
        }
    }

    /**
     * @return array<int, string|null>
     */
    private function publicMediaPaths(User $user): array
    {
        $paths = [$user->avatar, $user->cover_photo];

        Post::query()->where('user_id', $user->id)->each(function (Post $post) use (&$paths): void {
            $paths[] = $post->media_path;
            $paths[] = $post->image_path;
        });

        Story::query()->where('user_id', $user->id)->each(
            function (Story $story) use (&$paths): void {
                $paths[] = $story->media_path;
            },
        );

        Animal::query()->where('user_id', $user->id)->each(function (Animal $animal) use (&$paths): void {
            array_push(
                $paths,
                $animal->photo_url,
                $animal->health_certificate_path,
                $animal->vaccination_book_path,
                ...($animal->gallery_urls ?? []),
            );
        });

        Product::query()->where('user_id', $user->id)->each(function (Product $product) use (&$paths): void {
            array_push($paths, $product->image_url, ...($product->gallery_urls ?? []));
        });

        ServiceListing::withTrashed()->where('user_id', $user->id)->each(
            function (ServiceListing $service) use (&$paths): void {
                foreach ($service->media ?? [] as $media) {
                    $paths[] = is_array($media) ? ($media['path'] ?? $media['url'] ?? null) : $media;
                }
            },
        );

        Veterinarian::withTrashed()->where('user_id', $user->id)->each(
            function (Veterinarian $veterinarian) use (&$paths): void {
                $paths[] = $veterinarian->image_path;
            },
        );

        return array_values(array_unique($paths, SORT_REGULAR));
    }

    /**
     * @return array{private: array<int, string>, public: array<int, string|null>}
     */
    private function anonymizeDatabase(DataDeletionRequest $deletionRequest, User $reviewer): array
    {
        return DB::transaction(function () use ($deletionRequest, $reviewer): array {
            $lockedRequest = DataDeletionRequest::query()->lockForUpdate()->findOrFail($deletionRequest->id);

            if ($lockedRequest->database_anonymized_at !== null) {
                return $this->normalizeManifest($lockedRequest->purge_manifest);
            }

            $lockedUser = User::query()->lockForUpdate()->findOrFail($lockedRequest->user_id);
            $manifest = $this->buildPurgeManifest($lockedUser);

            $lockedRequest->forceFill(['purge_manifest' => $manifest])->save();

            $this->removeSocialData($lockedUser);
            $this->anonymizeRetainedRecords($lockedUser);

            $anonymousId = substr(hash_hmac(
                'sha256',
                'deleted-user:'.$lockedUser->id,
                (string) config('app.key'),
            ), 0, 24);

            $lockedUser->forceFill([
                'name' => 'Utilisateur supprime '.$anonymousId,
                'email' => "deleted.{$anonymousId}@deleted.invalid",
                'email_verified_at' => null,
                'phone' => null,
                'phone_verified_at' => null,
                'country' => null,
                'city' => null,
                'bio' => null,
                'avatar' => null,
                'cover_photo' => null,
                'google_id' => null,
                'google_avatar' => null,
                'remember_token' => null,
                'password' => Hash::make(Str::random(64)),
                'preferred_locale' => 'fr',
                'is_admin' => false,
                'is_suspended' => true,
                'suspended_reason' => 'account_deleted',
                'banned_reason' => 'account_deleted',
            ])->save();

            $lockedRequest->forceFill([
                'reason' => null,
                'admin_note' => null,
                'status' => 'processing',
                'failure_code' => null,
                'database_anonymized_at' => now(),
                'reviewed_by' => $reviewer->id,
                'reviewed_at' => now(),
            ])->save();

            return $manifest;
        });
    }

    /**
     * @return array{private: array<int, string>, public: array<int, string|null>}
     */
    private function buildPurgeManifest(User $user): array
    {
        $privatePaths = ProfessionalVerification::query()
            ->where('user_id', $user->id)
            ->whereNotNull('document_path')
            ->pluck('document_path')
            ->filter(fn (mixed $path): bool => is_string($path) && $this->isSafePrivatePath($path))
            ->unique()
            ->values()
            ->all();

        return [
            'private' => $privatePaths,
            'public' => $this->publicMediaPaths($user),
        ];
    }

    /**
     * @return array{private: array<int, string>, public: array<int, string|null>}
     */
    private function normalizeManifest(mixed $manifest): array
    {
        if (! is_array($manifest)) {
            throw new RuntimeException('Account deletion purge manifest is missing.');
        }

        return [
            'private' => array_values(array_filter(
                $manifest['private'] ?? [],
                fn (mixed $path): bool => is_string($path) && $this->isSafePrivatePath($path),
            )),
            'public' => array_values(array_filter(
                $manifest['public'] ?? [],
                fn (mixed $path): bool => is_string($path) && $path !== '',
            )),
        ];
    }

    private function completePurge(DataDeletionRequest $deletionRequest, User $reviewer): void
    {
        DB::transaction(function () use ($deletionRequest, $reviewer): void {
            $lockedRequest = DataDeletionRequest::query()->lockForUpdate()->findOrFail($deletionRequest->id);

            if ($lockedRequest->status === 'completed') {
                return;
            }

            $lockedRequest->forceFill([
                'status' => 'completed',
                'failure_code' => null,
                'purge_manifest' => null,
                'purge_completed_at' => now(),
                'completed_at' => now(),
                'reviewed_by' => $reviewer->id,
                'reviewed_at' => now(),
            ])->save();
        });
    }

    private function removeSocialData(User $user): void
    {
        $postIds = DB::table('posts')->where('user_id', $user->id)->pluck('id');
        DB::table('likes')
            ->where('likeable_type', Post::class)
            ->whereIn('likeable_id', $postIds)
            ->delete();
        DB::table('posts')->where('user_id', $user->id)->delete();

        DB::table('comments')->where('user_id', $user->id)->delete();
        DB::table('likes')->where('user_id', $user->id)->delete();
        DB::table('favorites')->where('user_id', $user->id)->delete();
        DB::table('follows')
            ->where('follower_user_id', $user->id)
            ->orWhere('followed_user_id', $user->id)
            ->delete();
        DB::table('stories')->where('user_id', $user->id)->delete();
        DB::table('story_views')->where('user_id', $user->id)->delete();
        DB::table('community_members')->where('user_id', $user->id)->delete();
        DB::table('notifications')
            ->where('notifiable_type', User::class)
            ->where('notifiable_id', $user->id)
            ->delete();
        DB::table('privacy_consents')->where('user_id', $user->id)->delete();
        ProfessionalVerification::query()->where('user_id', $user->id)->delete();
    }

    private function anonymizeRetainedRecords(User $user): void
    {
        DB::table('messages')->where('user_id', $user->id)->update([
            'body' => '[message supprime]',
            'updated_at' => now(),
        ]);

        DB::table('reservations')
            ->where('buyer_id', $user->id)
            ->orWhere('seller_id', $user->id)
            ->update([
                'note' => null,
                'contact_phone' => null,
                'provider_note' => null,
                'delivery_contact_name' => null,
                'delivery_phone' => null,
                'delivery_city' => null,
                'delivery_address' => null,
                'delivery_notes' => null,
                'updated_at' => now(),
            ]);

        $paymentIds = Payment::query()
            ->where('buyer_id', $user->id)
            ->orWhere('seller_id', $user->id)
            ->pluck('id');
        DB::table('payments')->whereIn('id', $paymentIds)->update([
            'metadata' => null,
            'checkout_url' => null,
            'updated_at' => now(),
        ]);
        DB::table('payment_transactions')->whereIn('payment_id', $paymentIds)->update([
            'request_payload' => null,
            'response_payload' => null,
            'ip_address' => null,
            'user_agent' => null,
            'updated_at' => now(),
        ]);

        DB::table('activity_logs')
            ->where('user_id', $user->id)
            ->orWhere('actor_id', $user->id)
            ->update([
                'description' => null,
                'metadata' => null,
                'ip_address' => null,
                'user_agent' => null,
            ]);

        DB::table('reports')->where('reporter_id', $user->id)->update(['details' => null]);

        Animal::query()->where('user_id', $user->id)->update([
            'name' => 'Annonce retiree',
            'description' => null,
            'location' => 'Non communique',
            'contact_phone' => null,
            'photo_url' => null,
            'gallery_urls' => null,
            'health_certificate_path' => null,
            'vaccination_book_path' => null,
            'legal_status' => 'suspended',
        ]);
        Product::query()->where('user_id', $user->id)->update([
            'name' => 'Produit retire',
            'description' => 'Contenu retire',
            'location' => 'Non communique',
            'image_url' => null,
            'gallery_urls' => null,
            'moderation_status' => 'suspended',
        ]);
        ServiceListing::withTrashed()->where('user_id', $user->id)->update([
            'title' => 'Service retire',
            'description' => 'Contenu retire',
            'city' => null,
            'address' => null,
            'contact_phone' => null,
            'contact_email' => null,
            'media' => null,
            'status' => 'archived',
            'moderation_status' => 'suspended',
        ]);
        Veterinarian::withTrashed()->where('user_id', $user->id)->update([
            'name' => 'Fiche retiree',
            'clinic_name' => null,
            'description' => null,
            'city' => null,
            'address' => null,
            'phone' => null,
            'whatsapp' => null,
            'email' => null,
            'image_path' => null,
            'location_url' => null,
            'is_active' => false,
            'moderation_status' => 'suspended',
        ]);
    }

    private function isSafePrivatePath(string $path): bool
    {
        $normalized = str_replace('\\', '/', $path);

        return $normalized !== ''
            && ! str_contains($normalized, "\0")
            && ! str_contains($normalized, '../')
            && str_starts_with($normalized, 'professional-verifications/');
    }

    private function failureCode(Throwable $exception): string
    {
        return match (true) {
            $exception instanceof StorageCleanupException => 'storage_cleanup_failed',
            default => 'database_processing_failed',
        };
    }
}
