<?php

namespace App\Http\Resources\Reservation;

use App\Models\Animal;
use App\Models\Product;
use App\Models\Reservation;
use App\Models\ServiceListing;
use App\Support\MarketplaceMedia;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Reservation
 */
class ReservationResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $viewerId = $request->user()?->id ?? 0;
        $isBuyer = $request->user()?->is($this->buyer) ?? false;
        $isSeller = $request->user()?->is($this->seller) ?? false;
        $isAdmin = (bool) ($request->user()?->is_admin ?? false);

        return [
            'id' => $this->id,
            'kind' => $this->listingKind(),
            'category' => $this->category ?? $this->listingKind(),
            'status' => $this->reservation_status,
            'reservationStatus' => $this->reservation_status,
            'paymentStatus' => $this->payment_status,
            'paymentMethod' => $this->payment_method,
            'payment' => $this->paymentSummary(),
            'deliveryMethod' => $this->delivery_method,
            'deliveryStatus' => $this->delivery_status,
            'quantity' => $this->quantity,
            'note' => $this->note,
            'message' => $this->note,
            'contactPhone' => $this->contact_phone,
            'scheduledAt' => $this->scheduled_at?->toISOString(),
            'scheduledEndAt' => $this->scheduled_end_at?->toISOString(),
            'unitPrice' => $this->unit_price !== null ? (float) $this->unit_price : null,
            'totalPrice' => $this->total_price !== null ? (float) $this->total_price : null,
            'deliveryFee' => $this->delivery_fee !== null ? (float) $this->delivery_fee : null,
            'grandTotal' => $this->grandTotal(),
            'invoiceNumber' => $this->invoice_number,
            'createdAt' => $this->created_at?->toISOString(),
            'acceptedAt' => $this->approved_at?->toISOString(),
            'approvedAt' => $this->approved_at?->toISOString(),
            'rejectedAt' => $this->rejected_at?->toISOString(),
            'completedAt' => $this->completed_at?->toISOString(),
            'cancelledAt' => $this->cancelled_at?->toISOString(),
            'invoiceIssuedAt' => $this->invoice_issued_at?->toISOString(),
            'buyer' => [
                'id' => $this->buyer?->id,
                'name' => $this->buyer?->name,
                'email' => $this->buyer?->publicEmail(),
                'phone' => $this->buyer?->phone,
                'avatar' => $this->buyer?->avatar,
            ],
            'seller' => [
                'id' => $this->seller?->id,
                'name' => $this->seller?->name,
                'email' => $this->seller?->publicEmail(),
                'phone' => $this->seller?->phone,
                'avatar' => $this->seller?->avatar,
            ],
            'provider' => [
                'id' => $this->seller?->id,
                'name' => $this->seller?->name,
                'email' => $this->seller?->publicEmail(),
                'phone' => $this->seller?->phone,
                'avatar' => $this->seller?->avatar,
            ],
            'listing' => [
                'id' => $this->reservable?->id,
                'title' => $this->listingTitle(),
                'imageUrl' => $this->listingImageUrl(),
                'location' => $this->reservable?->location ?? $this->reservable?->city,
                'listingStatus' => $this->reservable?->listing_status ?? $this->reservable?->status,
                'routePath' => $this->listingRoutePath(),
            ],
            'reservable' => [
                'id' => $this->reservable?->id,
                'type' => $this->reservable_type,
                'title' => $this->listingTitle(),
                'price' => $this->unit_price !== null ? (float) $this->unit_price : null,
                'routePath' => $this->listingRoutePath(),
            ],
            'delivery' => [
                'contactName' => $this->delivery_contact_name,
                'phone' => $this->delivery_phone,
                'city' => $this->delivery_city,
                'address' => $this->delivery_address,
                'notes' => $this->delivery_notes,
            ],
            'reviews' => [
                'hasPendingReview' => $this->hasPendingReviewFor($viewerId),
                'myReview' => $this->reviewBy($viewerId),
                'counterpartReview' => $this->counterpartReviewFor($viewerId),
            ],
            'isBuyer' => $isBuyer,
            'isSeller' => $isSeller,
            'canApprove' => ($isSeller || $isAdmin) && $this->reservation_status === 'pending',
            'canReject' => ($isSeller || $isAdmin) && $this->reservation_status === 'pending',
            'canCancel' => ($isBuyer || $isAdmin) && $this->canBuyerCancel(),
            'canComplete' => ($isSeller || $isAdmin) && $this->canSellerComplete(),
            'canMarkPreparing' => $isSeller && $this->delivery_method === 'delivery' && $this->reservation_status === 'approved' && $this->delivery_status === 'pending',
            'canMarkReadyForPickup' => $isSeller && $this->delivery_method === 'pickup' && $this->reservation_status === 'approved' && in_array($this->delivery_status, ['pending', 'preparing'], true),
            'canMarkShipped' => $isSeller && $this->delivery_method === 'delivery' && in_array($this->delivery_status, ['preparing'], true),
            'canMarkDelivered' => $isSeller && $this->delivery_method === 'delivery' && $this->delivery_status === 'shipped',
            'canMarkPickedUp' => $isSeller && $this->delivery_method === 'pickup' && $this->delivery_status === 'ready_for_pickup',
            'canViewInvoice' => $this->invoice_number !== null,
        ];
    }

    /**
     * Resolve the grand total including delivery.
     */
    protected function grandTotal(): ?float
    {
        if ($this->total_price === null) {
            return null;
        }

        return (float) $this->total_price + (float) ($this->delivery_fee ?? 0);
    }

    /**
     * @return array<string, mixed>|null
     */
    protected function paymentSummary(): ?array
    {
        $payment = $this->relationLoaded('payments')
            ? $this->payments->sortByDesc('created_at')->first()
            : null;

        if (! $payment) {
            return null;
        }

        return [
            'id' => $payment->id,
            'provider' => $payment->provider,
            'status' => $payment->status,
            'amount' => (float) $payment->amount,
            'currency' => $payment->currency,
            'checkoutUrl' => $payment->checkout_url,
            'paidAt' => $payment->paid_at?->toISOString(),
        ];
    }

    /**
     * Determine whether the buyer can still cancel the reservation.
     */
    protected function canBuyerCancel(): bool
    {
        if (! in_array($this->reservation_status, ['pending', 'approved'], true)) {
            return false;
        }

        return ! in_array($this->delivery_status, ['shipped', 'delivered', 'picked_up'], true);
    }

    /**
     * Determine whether the seller can complete the reservation.
     */
    protected function canSellerComplete(): bool
    {
        if ($this->reservation_status !== 'approved') {
            return false;
        }

        $hasConfirmedPayment = $this->relationLoaded('payments')
            ? $this->payments->contains(fn ($payment): bool => $payment->status === 'paid')
            : $this->payments()->where('status', 'paid')->exists();

        if (! $hasConfirmedPayment) {
            return false;
        }

        if ($this->reservable instanceof ServiceListing || in_array($this->category, ['pet_sitting', 'training'], true)) {
            return true;
        }

        if ($this->delivery_method === 'pickup') {
            return $this->delivery_status === 'picked_up';
        }

        return $this->delivery_status === 'delivered';
    }

    /**
     * Determine whether the viewer still has to submit a review.
     */
    protected function hasPendingReviewFor(int $viewerId): bool
    {
        if ($viewerId <= 0 || $this->reservation_status !== 'completed') {
            return false;
        }

        if (! in_array($viewerId, [$this->buyer_id, $this->seller_id], true)) {
            return false;
        }

        return $this->reviews->firstWhere('reviewer_id', $viewerId) === null;
    }

    /**
     * Resolve the current viewer review.
     *
     * @return array<string, mixed>|null
     */
    protected function reviewBy(int $viewerId): ?array
    {
        $review = $this->reviews->firstWhere('reviewer_id', $viewerId);

        return $review ? ReservationReviewResource::make($review)->resolve() : null;
    }

    /**
     * Resolve the counterpart review for the current viewer.
     *
     * @return array<string, mixed>|null
     */
    protected function counterpartReviewFor(int $viewerId): ?array
    {
        $review = $this->reviews->first(function ($review) use ($viewerId): bool {
            return (int) $review->reviewer_id !== $viewerId
                && ($review->status ?? 'published') === 'published';
        });

        return $review ? ReservationReviewResource::make($review)->resolve() : null;
    }

    /**
     * Resolve the listing kind.
     */
    protected function listingKind(): string
    {
        return match ($this->reservable_type) {
            Animal::class => 'animal',
            Product::class => 'product',
            ServiceListing::class => $this->category ?: 'service',
            default => 'listing',
        };
    }

    /**
     * Resolve the listing title.
     */
    protected function listingTitle(): string
    {
        if ($this->reservable instanceof Animal || $this->reservable instanceof Product) {
            return $this->reservable->name;
        }

        if ($this->reservable instanceof ServiceListing) {
            return $this->reservable->title;
        }

        return 'Annonce';
    }

    /**
     * Resolve the listing image URL.
     */
    protected function listingImageUrl(): ?string
    {
        if ($this->reservable instanceof Animal) {
            return MarketplaceMedia::resolveUrl($this->reservable->photo_url);
        }

        if ($this->reservable instanceof Product) {
            return MarketplaceMedia::resolveUrl($this->reservable->image_url);
        }

        if ($this->reservable instanceof ServiceListing) {
            return $this->reservable->media[0] ?? null;
        }

        return null;
    }

    /**
     * Resolve the listing route path.
     */
    protected function listingRoutePath(): ?string
    {
        if ($this->reservable instanceof Animal) {
            return '/marketplace/animals/'.$this->reservable->id;
        }

        if ($this->reservable instanceof Product) {
            return '/marketplace/products/'.$this->reservable->id;
        }

        if ($this->reservable instanceof ServiceListing) {
            return '/marketplace/services/'.$this->reservable->id;
        }

        return null;
    }
}
