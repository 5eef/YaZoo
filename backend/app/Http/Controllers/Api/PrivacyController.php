<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Animal;
use App\Models\ActivityLog;
use App\Models\Comment;
use App\Models\DataDeletionRequest;
use App\Models\Favorite;
use App\Models\Like;
use App\Models\Message;
use App\Models\Payment;
use App\Models\Post;
use App\Models\PrivacyConsent;
use App\Models\Product;
use App\Models\ProfessionalVerification;
use App\Models\Report;
use App\Models\Reservation;
use App\Models\ReservationReview;
use App\Models\ServiceListing;
use App\Models\Story;
use App\Models\StoryView;
use App\Models\Veterinarian;
use App\Models\VeterinarianAppointment;
use App\Models\VeterinarianAppointmentReview;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PrivacyController extends Controller
{
    public function export(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json([
            'message' => __('messages.privacy.export_ready'),
            'exportedAt' => now()->toISOString(),
            'profile' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->publicEmail(),
                'phone' => $user->phone,
                'city' => $user->city,
                'country' => $user->country,
                'bio' => $user->bio,
                'avatar' => $user->avatar,
                'coverPhoto' => $user->cover_photo,
                'preferredLocale' => $user->preferred_locale,
                'emailVerifiedAt' => $user->email_verified_at?->toISOString(),
                'phoneVerifiedAt' => $user->phone_verified_at?->toISOString(),
                'hasGoogleAccount' => filled($user->google_id),
                'createdAt' => $user->created_at?->toISOString(),
                'updatedAt' => $user->updated_at?->toISOString(),
            ],
            'posts' => $this->posts($user->id),
            'comments' => $this->comments($user->id),
            'likes' => $this->likes($user->id),
            'favorites' => $this->favorites($user->id),
            'communityMemberships' => $this->communityMemberships($user->id),
            'stories' => $this->stories($user->id),
            'storyViews' => $this->storyViews($user->id),
            'sentMessages' => $this->sentMessages($user->id),
            'animals' => $this->animals($user->id),
            'products' => $this->products($user->id),
            'services' => $this->services($user->id),
            'veterinarians' => $this->veterinarians($user->id),
            'professionalVerifications' => $this->professionalVerifications($user->id),
            'reservations' => $this->reservations($user->id),
            'reservationReviews' => $this->reservationReviews($user->id),
            'payments' => $this->payments($user->id),
            'veterinarianAppointments' => $this->veterinarianAppointments($user->id),
            'veterinarianAppointmentReviews' => $this->veterinarianAppointmentReviews($user->id),
            'reports' => $this->reports($user->id),
            'notifications' => $this->notifications($user->id),
            'activityLogs' => $this->activityLogs($user->id),
            'privacyConsents' => $this->privacyConsents($user->id),
            'dataDeletionRequests' => $this->dataDeletionRequests($user->id),
            'excluded' => [
                'authenticationSecrets' => 'Passwords, session tokens, MFA secrets and recovery tokens are never exported.',
                'messagesAuthoredByOthers' => 'Only messages authored by this account are included.',
                'paymentSecrets' => 'Checkout URLs, idempotency keys and provider payloads are excluded.',
            ],
        ]);
    }

    private function posts(int $userId)
    {
        return Post::query()
            ->where('user_id', $userId)
            ->latest()
            ->get(['id', 'content', 'location', 'tags', 'visibility', 'created_at', 'updated_at']);
    }

    private function comments(int $userId)
    {
        return Comment::query()->where('user_id', $userId)->latest()
            ->get(['id', 'post_id', 'body', 'created_at', 'updated_at']);
    }

    private function likes(int $userId)
    {
        return Like::query()->where('user_id', $userId)->latest()
            ->get(['id', 'likeable_type', 'likeable_id', 'created_at', 'updated_at']);
    }

    private function favorites(int $userId)
    {
        return Favorite::query()->where('user_id', $userId)->latest()
            ->get(['id', 'favoritable_type', 'favoritable_id', 'created_at', 'updated_at']);
    }

    private function communityMemberships(int $userId)
    {
        return DB::table('community_members')->where('user_id', $userId)->orderByDesc('created_at')
            ->get(['id', 'community_id', 'role', 'status', 'created_at', 'updated_at']);
    }

    private function stories(int $userId)
    {
        return Story::query()->where('user_id', $userId)->latest()
            ->get(['id', 'media_path', 'media_kind', 'content', 'location', 'expires_at', 'created_at', 'updated_at']);
    }

    private function storyViews(int $userId)
    {
        return StoryView::query()->where('user_id', $userId)->latest('viewed_at')
            ->get(['id', 'story_id', 'viewed_at', 'created_at', 'updated_at']);
    }

    private function sentMessages(int $userId)
    {
        return Message::query()->where('user_id', $userId)->latest()
            ->get(['id', 'conversation_id', 'body', 'read_at', 'created_at', 'updated_at']);
    }

    private function animals(int $userId)
    {
        return Animal::query()
            ->where('user_id', $userId)
            ->latest()
            ->get([
                'id',
                'name',
                'category',
                'type',
                'breed',
                'age',
                'sex',
                'location',
                'price',
                'is_for_adoption',
                'listing_status',
                'description',
                'contact_phone',
                'accepts_animal_rules',
                'created_at',
                'updated_at',
            ]);
    }

    private function products(int $userId)
    {
        return Product::query()
            ->where('user_id', $userId)
            ->latest()
            ->get(['id', 'name', 'category', 'description', 'price', 'location', 'stock', 'listing_status', 'condition_status', 'created_at', 'updated_at']);
    }

    private function services(int $userId)
    {
        return ServiceListing::query()
            ->where('user_id', $userId)
            ->latest()
            ->get(['id', 'type', 'title', 'description', 'animal_types', 'city', 'price', 'price_type', 'availability', 'status', 'created_at', 'updated_at']);
    }

    private function veterinarians(int $userId)
    {
        return Veterinarian::query()
            ->where('user_id', $userId)
            ->latest()
            ->get(['id', 'name', 'clinic_name', 'description', 'city', 'address', 'phone', 'whatsapp', 'email', 'specialties', 'working_hours', 'is_active', 'created_at', 'updated_at']);
    }

    private function professionalVerifications(int $userId)
    {
        return ProfessionalVerification::query()->where('user_id', $userId)->latest()
            ->get([
                'id', 'business_type', 'legal_name', 'ice', 'onssa_authorization_number',
                'professional_license_number', 'document_type', 'document_original_name',
                'document_mime', 'document_size', 'document_expires_at', 'status',
                'verified_at', 'review_reason', 'reviewed_at', 'created_at', 'updated_at',
            ]);
    }

    private function reservations(int $userId)
    {
        return Reservation::query()
            ->where(function ($query) use ($userId): void {
                $query->where('buyer_id', $userId)
                    ->orWhere('seller_id', $userId);
            })
            ->latest()
            ->get([
                'id',
                'buyer_id',
                'seller_id',
                'reservable_type',
                'reservable_id',
                'category',
                'quantity',
                'scheduled_at',
                'scheduled_end_at',
                'delivery_method',
                'reservation_status',
                'payment_status',
                'delivery_status',
                'total_price',
                'created_at',
                'updated_at',
            ]);
    }

    private function reservationReviews(int $userId)
    {
        return ReservationReview::query()->where('reviewer_id', $userId)->latest()
            ->get(['id', 'reservation_id', 'reviewee_id', 'rating', 'comment', 'created_at', 'updated_at']);
    }

    private function payments(int $userId)
    {
        return Payment::query()
            ->where(fn ($query) => $query->where('buyer_id', $userId)->orWhere('seller_id', $userId))
            ->latest()
            ->get([
                'id', 'reservation_id', 'buyer_id', 'seller_id', 'provider', 'status', 'amount',
                'currency', 'commission_amount', 'net_amount', 'provider_reference',
                'internal_reference', 'paid_at', 'failed_at', 'refunded_at', 'cancelled_at',
                'created_at', 'updated_at',
            ]);
    }

    private function veterinarianAppointments(int $userId)
    {
        return VeterinarianAppointment::query()
            ->where('client_id', $userId)
            ->orWhereHas('veterinarian', fn ($query) => $query->where('user_id', $userId))
            ->latest()
            ->get([
                'id', 'veterinarian_id', 'availability_slot_id', 'client_id', 'animal_type',
                'reason', 'starts_at', 'ends_at', 'status', 'status_note', 'status_changed_at',
                'created_at', 'updated_at',
            ]);
    }

    private function veterinarianAppointmentReviews(int $userId)
    {
        return VeterinarianAppointmentReview::query()->where('client_id', $userId)->latest()
            ->get(['id', 'veterinarian_appointment_id', 'rating', 'comment', 'created_at', 'updated_at']);
    }

    private function reports(int $userId)
    {
        return Report::query()
            ->where('reporter_id', $userId)
            ->latest()
            ->get(['id', 'reportable_type', 'reportable_id', 'reason', 'details', 'status', 'reviewed_at', 'created_at', 'updated_at']);
    }

    private function notifications(int $userId)
    {
        return DB::table('notifications')->where('notifiable_type', 'App\\Models\\User')
            ->where('notifiable_id', $userId)
            ->orderByDesc('created_at')
            ->get(['id', 'type', 'data', 'read_at', 'created_at', 'updated_at']);
    }

    private function activityLogs(int $userId)
    {
        return ActivityLog::query()
            ->where(fn ($query) => $query->where('user_id', $userId)->orWhere('actor_id', $userId))
            ->latest('created_at')
            ->get([
                'id', 'actor_id', 'subject_type', 'subject_id', 'action', 'category',
                'description', 'metadata', 'ip_address', 'user_agent', 'created_at',
            ]);
    }

    private function privacyConsents(int $userId)
    {
        return PrivacyConsent::query()
            ->where('user_id', $userId)
            ->latest()
            ->get(['id', 'type', 'accepted', 'locale', 'accepted_at', 'created_at', 'updated_at']);
    }

    private function dataDeletionRequests(int $userId)
    {
        return DataDeletionRequest::query()
            ->where('user_id', $userId)
            ->latest()
            ->get(['id', 'reason', 'status', 'reviewed_at', 'created_at', 'updated_at']);
    }
}
