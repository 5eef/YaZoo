<?php

namespace App\Services;

use App\Models\Animal;
use App\Models\Payment;
use App\Models\PaymentTransaction;
use App\Models\Product;
use App\Models\Reservation;
use App\Models\ServiceListing;
use App\Models\User;
use App\Notifications\ReservationApprovedNotification;
use App\Notifications\ReservationCancelledNotification;
use App\Notifications\ReservationCompletedNotification;
use App\Notifications\ReservationDeliveryUpdatedNotification;
use App\Notifications\ReservationRejectedNotification;
use App\Notifications\ReservationRequestedNotification;
use App\Repositories\ReservationRepository;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

class ReservationService
{
    public function __construct(
        protected ReservationRepository $reservations,
        protected ActivityLogger $activityLogger,
    ) {}

    /**
     * @return array{buyer: mixed, seller: mixed}
     */
    public function listForUser(User $user, int $perPage): array
    {
        return [
            'buyer' => $this->reservations->buyerReservations($user, $perPage),
            'seller' => $this->reservations->sellerReservations($user, $perPage),
        ];
    }

    /**
     * @return array{buyer: mixed, seller: mixed}
     */
    public function historyForUser(User $user, int $perPage): array
    {
        return [
            'buyer' => $this->reservations->buyerHistory($user, $perPage),
            'seller' => $this->reservations->sellerHistory($user, $perPage),
        ];
    }

    public function loadInvoice(Reservation $reservation): Reservation
    {
        return $reservation->load([
            'buyer:id,name,email,phone,city,country',
            'seller:id,name,email,phone,city,country',
            'reservable.user:id,name,email,phone,avatar,city,country',
            'payments',
            'reviews.reviewer:id,name,avatar',
            'reviews.reviewee:id,name,avatar',
        ]);
    }

    /**
     * @param  array<string, mixed>  $validated
     */
    public function createAnimal(User $buyer, Animal $animal, array $validated): Reservation
    {
        $reservation = DB::transaction(function () use ($buyer, $animal, $validated): Reservation {
            $lockedAnimal = Animal::query()
                ->lockForUpdate()
                ->findOrFail($animal->id);

            abort_unless($lockedAnimal->isPubliclyVisible(), 422, "Cette annonce animal n'est pas approuvee.");
            abort_if($lockedAnimal->listing_status !== 'available', 422, "Cette annonce animal n'est plus reservable.");
            abort_if((int) $lockedAnimal->user_id === (int) $buyer->id, 403, 'Vous ne pouvez pas reserver votre propre annonce animal.');
            abort_if(
                $lockedAnimal->reservations()->whereIn('reservation_status', $this->activeStatuses())->exists(),
                422,
                'Une reservation active existe deja pour cette annonce animal.',
            );

            $reservation = Reservation::create([
                'buyer_id' => $buyer->id,
                'seller_id' => $lockedAnimal->user_id,
                'reservable_type' => Animal::class,
                'reservable_id' => $lockedAnimal->id,
                'category' => 'animal',
                'quantity' => 1,
                'scheduled_at' => $validated['scheduled_at'] ?? null,
                'scheduled_end_at' => $validated['scheduled_end_at'] ?? null,
                'delivery_method' => $validated['delivery_method'],
                'note' => $validated['note'] ?? $validated['message'] ?? null,
                'contact_phone' => $validated['contact_phone'] ?? $validated['delivery_phone'] ?? null,
                'payment_method' => $validated['payment_method'],
                'reservation_status' => 'pending',
                'payment_status' => 'pending',
                'delivery_status' => 'pending',
                'delivery_contact_name' => $validated['delivery_contact_name'] ?? null,
                'delivery_phone' => $validated['delivery_phone'] ?? null,
                'delivery_city' => $validated['delivery_city'] ?? null,
                'delivery_address' => $validated['delivery_address'] ?? null,
                'delivery_notes' => $validated['delivery_notes'] ?? null,
                'unit_price' => $lockedAnimal->price ?? 0,
                'total_price' => $lockedAnimal->price ?? 0,
                'delivery_fee' => $this->computeDeliveryFee(Animal::class, $validated['delivery_method'], 1),
                'transaction_snapshot' => $this->transactionSnapshot($lockedAnimal, 1, $validated),
            ]);

            $lockedAnimal->update([
                'listing_status' => 'reserved',
            ]);

            return $reservation;
        });

        $reservation = $this->reservations->loadForResponse($reservation);
        $reservation->seller?->notify(new ReservationRequestedNotification($reservation));
        $this->logReservationAction('reservation.created', $reservation, $buyer);

        return $reservation;
    }

    /**
     * @param  array<string, mixed>  $validated
     */
    public function createProduct(User $buyer, Product $product, array $validated): Reservation
    {
        $reservation = DB::transaction(function () use ($buyer, $product, $validated): Reservation {
            $lockedProduct = Product::query()
                ->lockForUpdate()
                ->findOrFail($product->id);

            abort_unless($lockedProduct->isPubliclyVisible(), 422, "Ce produit n'est pas approuve.");
            abort_if($lockedProduct->listing_status === 'sold' || $lockedProduct->stock <= 0, 422, "Ce produit n'est plus reservable.");
            abort_if((int) $lockedProduct->user_id === (int) $buyer->id, 403, 'Vous ne pouvez pas reserver votre propre produit.');

            $quantity = (int) ($validated['quantity'] ?? 1);
            $availableQuantity = $this->availableProductQuantity($lockedProduct);

            abort_if($quantity > $availableQuantity, 422, 'La quantite demandee depasse le stock reservable disponible.');

            $reservation = Reservation::create([
                'buyer_id' => $buyer->id,
                'seller_id' => $lockedProduct->user_id,
                'reservable_type' => Product::class,
                'reservable_id' => $lockedProduct->id,
                'category' => 'product',
                'quantity' => $quantity,
                'scheduled_at' => $validated['scheduled_at'] ?? null,
                'scheduled_end_at' => $validated['scheduled_end_at'] ?? null,
                'delivery_method' => $validated['delivery_method'],
                'note' => $validated['note'] ?? $validated['message'] ?? null,
                'contact_phone' => $validated['contact_phone'] ?? $validated['delivery_phone'] ?? null,
                'payment_method' => $validated['payment_method'],
                'reservation_status' => 'pending',
                'payment_status' => 'pending',
                'delivery_status' => 'pending',
                'delivery_contact_name' => $validated['delivery_contact_name'] ?? null,
                'delivery_phone' => $validated['delivery_phone'] ?? null,
                'delivery_city' => $validated['delivery_city'] ?? null,
                'delivery_address' => $validated['delivery_address'] ?? null,
                'delivery_notes' => $validated['delivery_notes'] ?? null,
                'unit_price' => $lockedProduct->price,
                'total_price' => (float) $lockedProduct->price * $quantity,
                'delivery_fee' => $this->computeDeliveryFee(Product::class, $validated['delivery_method'], $quantity),
                'transaction_snapshot' => $this->transactionSnapshot($lockedProduct, $quantity, $validated),
            ]);

            $this->syncProductListingStatus($lockedProduct->refresh());

            return $reservation;
        });

        $reservation = $this->reservations->loadForResponse($reservation);
        $reservation->seller?->notify(new ReservationRequestedNotification($reservation));
        $this->logReservationAction('reservation.created', $reservation, $buyer);

        return $reservation;
    }

    /**
     * @param  array<string, mixed>  $validated
     */
    public function createUnified(User $buyer, array $validated): Reservation
    {
        $category = (string) $validated['category'];
        $reservableId = (int) $validated['reservable_id'];

        return match ($category) {
            'animal' => $this->createAnimal($buyer, Animal::query()->findOrFail($reservableId), $validated),
            'product' => $this->createProduct($buyer, Product::query()->findOrFail($reservableId), $validated),
            'pet_sitting', 'training' => $this->createService($buyer, $category, $reservableId, $validated),
            default => abort(422, 'Categorie de reservation invalide.'),
        };
    }

    /**
     * @param  array<string, mixed>  $validated
     */
    public function createService(User $buyer, string $category, int $serviceId, array $validated): Reservation
    {
        $reservation = DB::transaction(function () use ($buyer, $category, $serviceId, $validated): Reservation {
            $serviceType = $category === 'pet_sitting' ? 'pet_sitting' : 'training';
            $service = ServiceListing::query()
                ->lockForUpdate()
                ->findOrFail($serviceId);

            abort_if($service->type !== $serviceType, 422, 'Le type du service ne correspond pas a la categorie demandee.');
            abort_unless($service->isPubliclyVisible(), 422, "Ce service n'est pas approuve ou actif.");
            abort_if((int) $service->user_id === (int) $buyer->id, 403, 'Vous ne pouvez pas reserver votre propre service.');

            $reservation = Reservation::create([
                'buyer_id' => $buyer->id,
                'seller_id' => $service->user_id,
                'reservable_type' => ServiceListing::class,
                'reservable_id' => $service->id,
                'category' => $category,
                'quantity' => 1,
                'scheduled_at' => $validated['scheduled_at'] ?? null,
                'scheduled_end_at' => $validated['scheduled_end_at'] ?? null,
                'delivery_method' => 'pickup',
                'note' => $validated['note'] ?? $validated['message'] ?? null,
                'contact_phone' => $validated['contact_phone'] ?? null,
                'payment_method' => $validated['payment_method'] ?? 'cash_on_pickup',
                'reservation_status' => 'pending',
                'payment_status' => 'pending',
                'delivery_status' => 'pending',
                'delivery_contact_name' => $validated['delivery_contact_name'] ?? null,
                'delivery_phone' => $validated['delivery_phone'] ?? $validated['contact_phone'] ?? null,
                'delivery_city' => $validated['delivery_city'] ?? null,
                'delivery_address' => $validated['delivery_address'] ?? null,
                'delivery_notes' => $validated['delivery_notes'] ?? null,
                'unit_price' => $service->price ?? 0,
                'total_price' => $service->price ?? 0,
                'delivery_fee' => 0,
                'transaction_snapshot' => $this->transactionSnapshot($service, 1, $validated),
            ]);

            $service->increment('reservations_count');

            return $reservation;
        });

        $reservation = $this->reservations->loadForResponse($reservation);
        $reservation->seller?->notify(new ReservationRequestedNotification($reservation));
        $this->logReservationAction('reservation.created', $reservation, $buyer);

        return $reservation;
    }

    public function approve(Reservation $reservation): Reservation
    {
        $reservation = DB::transaction(function () use ($reservation): Reservation {
            $lockedReservation = $this->reservations->lockForUpdate($reservation);

            abort_if($lockedReservation->reservation_status !== 'pending', 422, 'Seules les reservations en attente peuvent etre approuvees.');

            $lockedReservation->update([
                'reservation_status' => 'approved',
                'delivery_status' => $lockedReservation->delivery_method === 'pickup'
                    ? 'ready_for_pickup'
                    : 'preparing',
                'approved_at' => CarbonImmutable::now(),
            ]);

            return $lockedReservation;
        });

        $reservation = $this->reservations->loadForResponse($reservation);
        $reservation->buyer?->notify(new ReservationApprovedNotification($reservation));
        $this->logReservationAction('reservation.approved', $reservation, $reservation->seller);

        return $reservation;
    }

    public function updateDeliveryStatus(Reservation $reservation, string $nextStatus): Reservation
    {
        $reservation = DB::transaction(function () use ($reservation, $nextStatus): Reservation {
            $lockedReservation = $this->reservations->lockForUpdate($reservation);

            abort_if($lockedReservation->reservation_status !== 'approved', 422, 'La livraison ne peut etre mise a jour que pour une reservation approuvee.');
            abort_if(
                ! $this->canTransitionDeliveryStatus($lockedReservation, $nextStatus),
                422,
                'Transition de livraison invalide pour cette reservation.',
            );

            $lockedReservation->update([
                'delivery_status' => $nextStatus,
            ]);

            return $lockedReservation;
        });

        $reservation = $this->reservations->loadForResponse($reservation);
        $reservation->buyer?->notify(new ReservationDeliveryUpdatedNotification($reservation));

        return $reservation;
    }

    public function reject(Reservation $reservation): Reservation
    {
        $reservation = DB::transaction(function () use ($reservation): Reservation {
            $lockedReservation = $this->reservations->lockForUpdate($reservation);

            abort_if($lockedReservation->reservation_status !== 'pending', 422, 'Seules les reservations en attente peuvent etre refusees.');

            $this->cancelActivePayments($lockedReservation, 'reservation_rejected');

            $lockedReservation->update([
                'reservation_status' => 'rejected',
                'payment_status' => 'cancelled',
                'rejected_at' => CarbonImmutable::now(),
            ]);

            $this->lockReservableForUpdate($lockedReservation);
            $this->syncReservableAfterRelease($lockedReservation);

            return $lockedReservation;
        });

        $reservation = $this->reservations->loadForResponse($reservation);
        $reservation->buyer?->notify(new ReservationRejectedNotification($reservation));
        $this->logReservationAction('reservation.rejected', $reservation, $reservation->seller);

        return $reservation;
    }

    public function cancel(Reservation $reservation): Reservation
    {
        $reservation = DB::transaction(function () use ($reservation): Reservation {
            $lockedReservation = $this->reservations->lockForUpdate($reservation);

            abort_if(
                ! in_array($lockedReservation->reservation_status, ['pending', 'approved'], true),
                422,
                'Cette reservation ne peut plus etre annulee.',
            );
            abort_if(
                in_array($lockedReservation->delivery_status, ['shipped', 'delivered', 'picked_up'], true),
                422,
                'Cette reservation ne peut plus etre annulee car la livraison est deja trop avancee.',
            );

            $this->cancelActivePayments($lockedReservation, 'reservation_cancelled');

            $lockedReservation->update([
                'reservation_status' => 'cancelled',
                'payment_status' => 'cancelled',
                'cancelled_at' => CarbonImmutable::now(),
            ]);

            $this->lockReservableForUpdate($lockedReservation);
            $this->syncReservableAfterRelease($lockedReservation);

            return $lockedReservation;
        });

        $reservation = $this->reservations->loadForResponse($reservation);
        $reservation->seller?->notify(new ReservationCancelledNotification($reservation));
        $this->logReservationAction('reservation.cancelled', $reservation, $reservation->buyer);

        return $reservation;
    }

    private function cancelActivePayments(Reservation $reservation, string $reason): void
    {
        $payments = Payment::query()
            ->where('reservation_id', $reservation->id)
            ->lockForUpdate()
            ->get();

        abort_if(
            $payments->contains(fn (Payment $payment): bool => $payment->status === Payment::STATUS_PAID),
            422,
            'Cette reservation a deja ete payee et ne peut plus etre annulee.',
        );

        foreach ($payments->whereIn('status', Payment::ACTIVE_STATUSES) as $payment) {
            $payment->forceFill([
                'status' => Payment::STATUS_CANCELLED,
                'checkout_url' => null,
                'cancelled_at' => now(),
            ])->save();

            PaymentTransaction::query()->create([
                'payment_id' => $payment->id,
                'provider' => $payment->provider,
                'type' => PaymentTransaction::TYPE_MANUAL_UPDATE,
                'status' => PaymentTransaction::STATUS_SUCCEEDED,
                'request_payload' => ['reason' => $reason],
                'response_payload' => ['status' => Payment::STATUS_CANCELLED],
                'processed_at' => now(),
            ]);
        }
    }

    public function complete(Reservation $reservation): Reservation
    {
        $reservation = DB::transaction(function () use ($reservation): Reservation {
            $lockedReservation = $this->reservations->lockForUpdate($reservation);

            abort_if($lockedReservation->reservation_status !== 'approved', 422, 'Seules les reservations approuvees peuvent etre finalisees.');
            abort_if(
                ! $this->isServiceReservation($lockedReservation) && ! $this->isDeliveryAtCompletionStep($lockedReservation),
                422,
                'La livraison doit etre terminee avant de finaliser la commande.',
            );

            $hasConfirmedPayment = Payment::query()
                ->where('reservation_id', $lockedReservation->id)
                ->where('status', Payment::STATUS_PAID)
                ->lockForUpdate()
                ->exists();

            abort_unless(
                $hasConfirmedPayment,
                422,
                'Le paiement doit etre confirme avant de finaliser la reservation.',
            );

            $lockedReservation->update([
                'reservation_status' => 'completed',
                'payment_status' => 'paid',
                'invoice_number' => $lockedReservation->invoice_number ?: $this->generateInvoiceNumber($lockedReservation),
                'invoice_issued_at' => CarbonImmutable::now(),
                'completed_at' => CarbonImmutable::now(),
            ]);

            $reservable = $this->lockReservableForUpdate($lockedReservation);

            if ($reservable instanceof Animal) {
                $reservable->update([
                    'listing_status' => $reservable->is_for_adoption ? 'adopted' : 'sold',
                ]);
            }

            if ($reservable instanceof Product) {
                $reservable->update([
                    'stock' => max(0, (int) $reservable->stock - (int) $lockedReservation->quantity),
                ]);

                $this->syncProductListingStatus($reservable->refresh());
            }

            return $lockedReservation;
        });

        $reservation = $this->reservations->loadForResponse($reservation);
        $reservation->buyer?->notify(new ReservationCompletedNotification($reservation));
        $this->logReservationAction('reservation.completed', $reservation, $reservation->seller);

        return $reservation;
    }

    /**
     * @return array<int, string>
     */
    protected function activeStatuses(): array
    {
        return ['pending', 'approved'];
    }

    protected function computeDeliveryFee(string $reservableType, string $deliveryMethod, int $quantity): float
    {
        if ($deliveryMethod === 'pickup') {
            return 0.0;
        }

        if ($reservableType === Animal::class) {
            return 60.0;
        }

        return 35.0 + max(0, $quantity - 1) * 5.0;
    }

    protected function availableProductQuantity(Product $product): int
    {
        $activeQuantity = (int) $product->reservations()
            ->whereIn('reservation_status', $this->activeStatuses())
            ->sum('quantity');

        return max(0, (int) $product->stock - $activeQuantity);
    }

    protected function syncProductListingStatus(Product $product): void
    {
        $availableQuantity = $this->availableProductQuantity($product);

        $listingStatus = match (true) {
            (int) $product->stock <= 0 => 'sold',
            $availableQuantity <= 0 => 'reserved',
            default => 'available',
        };

        if ($product->listing_status !== $listingStatus) {
            $product->update([
                'listing_status' => $listingStatus,
            ]);
        }
    }

    protected function syncReservableAfterRelease(Reservation $reservation): void
    {
        $reservable = $reservation->reservable;

        if ($reservable instanceof Animal) {
            if (! $reservable->reservations()->whereIn('reservation_status', $this->activeStatuses())->exists()) {
                $reservable->update([
                    'listing_status' => 'available',
                ]);
            }
        }

        if ($reservable instanceof Product) {
            $this->syncProductListingStatus($reservable);
        }
    }

    protected function lockReservableForUpdate(Reservation $reservation): Animal|Product|ServiceListing|null
    {
        $reservable = $reservation->reservable;

        if ($reservable instanceof Animal) {
            $lockedAnimal = Animal::query()
                ->lockForUpdate()
                ->findOrFail($reservable->id);

            $reservation->setRelation('reservable', $lockedAnimal);

            return $lockedAnimal;
        }

        if ($reservable instanceof Product) {
            $lockedProduct = Product::query()
                ->lockForUpdate()
                ->findOrFail($reservable->id);

            $reservation->setRelation('reservable', $lockedProduct);

            return $lockedProduct;
        }

        if ($reservable instanceof ServiceListing) {
            $lockedService = ServiceListing::query()
                ->lockForUpdate()
                ->findOrFail($reservable->id);

            $reservation->setRelation('reservable', $lockedService);

            return $lockedService;
        }

        return null;
    }

    protected function isServiceReservation(Reservation $reservation): bool
    {
        return in_array($reservation->category, ['pet_sitting', 'training'], true)
            || $reservation->reservable_type === ServiceListing::class;
    }

    protected function canTransitionDeliveryStatus(Reservation $reservation, string $nextStatus): bool
    {
        $allowedTransitions = $reservation->delivery_method === 'pickup'
            ? [
                'pending' => ['ready_for_pickup'],
                'ready_for_pickup' => ['picked_up'],
            ]
            : [
                'pending' => ['preparing'],
                'preparing' => ['shipped'],
                'shipped' => ['delivered'],
            ];

        return in_array($nextStatus, $allowedTransitions[$reservation->delivery_status] ?? [], true);
    }

    protected function isDeliveryAtCompletionStep(Reservation $reservation): bool
    {
        return $reservation->delivery_method === 'pickup'
            ? $reservation->delivery_status === 'picked_up'
            : $reservation->delivery_status === 'delivered';
    }

    protected function generateInvoiceNumber(Reservation $reservation): string
    {
        return sprintf('YAZ-%s-%05d', now()->format('Ymd'), $reservation->id);
    }

    protected function logReservationAction(string $action, Reservation $reservation, ?User $actor): void
    {
        $this->activityLogger->log(
            $action,
            'reservation',
            $reservation,
            [
                'category' => $reservation->category ?? $this->categoryForReservable($reservation->reservable),
                'status' => $reservation->reservation_status,
                'description' => $action,
            ],
            $actor,
            $reservation->buyer,
        );
    }

    protected function categoryForReservable(?Model $reservable): string
    {
        return match (true) {
            $reservable instanceof Animal => 'animal',
            $reservable instanceof Product => 'product',
            $reservable instanceof ServiceListing => $reservable->type,
            default => 'listing',
        };
    }

    /**
     * Capture the commercial facts that must survive listing edits or deletion.
     *
     * @param  array<string, mixed>  $validated
     * @return array<string, mixed>
     */
    protected function transactionSnapshot(Model $reservable, int $quantity, array $validated): array
    {
        $reservable->loadMissing('user:id,name');

        return [
            'version' => 1,
            'listing' => [
                'type' => $reservable->getMorphClass(),
                'id' => $reservable->getKey(),
                'title' => $reservable->getAttribute('name') ?? $reservable->getAttribute('title'),
                'description' => $reservable->getAttribute('description'),
            ],
            'seller' => [
                'id' => $reservable->getAttribute('user_id'),
                'name' => $reservable->getRelation('user')?->name,
            ],
            'pricing' => [
                'unit_price' => (float) ($reservable->getAttribute('price') ?? 0),
                'quantity' => $quantity,
                'currency' => (string) config('payments.currency', 'MAD'),
            ],
            'conditions' => [
                'delivery_method' => $validated['delivery_method'] ?? 'pickup',
                'payment_method' => $validated['payment_method'] ?? 'cash_on_pickup',
                'scheduled_at' => $validated['scheduled_at'] ?? null,
                'scheduled_end_at' => $validated['scheduled_end_at'] ?? null,
                'delivery_city' => $validated['delivery_city'] ?? null,
            ],
            'captured_at' => now()->toISOString(),
        ];
    }
}
