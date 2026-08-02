<?php

namespace App\Services\Payments;

use App\DTOs\Payments\PaymentCallbackResult;
use App\DTOs\Payments\PaymentInitiationResult;
use App\Models\Payment;
use App\Models\PaymentTransaction;
use App\Models\Reservation;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class PaymentService
{
    public function __construct(
        protected PaymentManager $paymentManager,
    ) {}

    public function createPendingPaymentForReservation(
        User $buyer,
        Reservation $reservation,
        string $provider,
        ?string $idempotencyKey = null,
    ): Payment {
        $provider = Payment::normalizeProvider($provider);
        $this->validateProvider($provider);

        return DB::transaction(function () use ($buyer, $reservation, $provider, $idempotencyKey): Payment {
            $lockedReservation = Reservation::query()
                ->lockForUpdate()
                ->with('payments')
                ->findOrFail($reservation->id);

            $this->assertBuyerCanPayReservation($buyer, $lockedReservation);

            if ($idempotencyKey) {
                $existing = Payment::query()
                    ->where('idempotency_key', $idempotencyKey)
                    ->first();

                if ($existing) {
                    abort_unless(
                        (int) $existing->reservation_id === (int) $lockedReservation->id
                            && (int) $existing->buyer_id === (int) $buyer->id
                            && $existing->provider === $provider,
                        409,
                        'Cle idempotence deja utilisee pour un autre paiement.',
                    );

                    return $existing->load(['reservation', 'buyer', 'seller', 'transactions']);
                }
            }

            abort_if(
                $this->activePaymentExists($lockedReservation, $provider),
                422,
                'Un paiement actif existe deja pour cette reservation et ce provider.',
            );

            $amount = $this->reservationGrandTotal($lockedReservation);
            $commission = $this->computeCommission($amount);

            return Payment::create([
                'reservation_id' => $lockedReservation->id,
                'buyer_id' => $buyer->id,
                'seller_id' => $lockedReservation->seller_id,
                'provider' => $provider,
                'status' => Payment::STATUS_PENDING,
                'amount' => $amount,
                'currency' => (string) config('payments.currency', 'MAD'),
                'commission_amount' => $commission,
                'net_amount' => max(0, $amount - $commission),
                'internal_reference' => $this->generateInternalReference(),
                'idempotency_key' => $idempotencyKey,
                'metadata' => [
                    'reservation_status' => $lockedReservation->reservation_status,
                    'legacy_payment_method' => $lockedReservation->payment_method,
                ],
            ])->load(['reservation', 'buyer', 'seller', 'transactions']);
        });
    }

    public function initiatePayment(Payment $payment): PaymentInitiationResult
    {
        $payment = $payment->fresh(['reservation', 'buyer', 'seller']);
        $gateway = $this->paymentManager->gateway($payment->provider);
        $result = $gateway->initiate($payment);

        $payment->forceFill([
            'checkout_url' => $result->checkoutUrl,
            'metadata' => array_merge($payment->metadata ?? [], [
                'last_initiation_status' => $result->status,
                'requires_redirect' => $result->requiresRedirect,
            ]),
        ])->save();

        $this->recordTransaction(
            $payment,
            PaymentTransaction::TYPE_INITIATE,
            PaymentTransaction::STATUS_SUCCEEDED,
            null,
            null,
            $result->payload,
            null,
            null,
        );

        if ($this->isManualProvider($payment->provider)) {
            $this->markAwaitingVerification($payment, [
                'initiation_status' => $result->status,
                'message' => $result->message,
            ]);
        }

        return $result;
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    public function handleProviderCallback(string $provider, array $payload, Request $request): PaymentCallbackResult
    {
        $provider = Payment::normalizeProvider($provider);
        $this->validateProvider($provider, requireInitiationReady: false);

        $gateway = $this->paymentManager->gateway($provider);
        $result = $gateway->handleCallback($payload);
        $payment = $this->paymentForCallback($result);

        $eventKey = $this->callbackEventKey($result);

        if ($payment && $result->signatureValid === false) {
            $this->recordTransaction(
                $payment,
                PaymentTransaction::TYPE_CALLBACK,
                $result->success ? PaymentTransaction::STATUS_SUCCEEDED : ($result->signatureValid === false ? PaymentTransaction::STATUS_REJECTED : PaymentTransaction::STATUS_FAILED),
                $result->providerReference,
                $result->payload,
                ['status' => $result->status, 'message' => $result->message],
                $result->signatureValid,
                $request,
                $eventKey,
            );
        }

        if ($result->signatureValid === false) {
            throw ValidationException::withMessages([
                'signature' => ['Signature paiement invalide.'],
            ]);
        }

        abort_if(! $payment, 404, 'Paiement introuvable pour ce callback.');

        return DB::transaction(function () use ($payment, $result, $request, $eventKey): PaymentCallbackResult {
            $lockedPayment = Payment::query()->lockForUpdate()->findOrFail($payment->id);
            $existingEvent = PaymentTransaction::query()->where('event_key', $eventKey)->exists();

            if ($existingEvent) {
                return $this->callbackResultForState($result, $lockedPayment->status, 'Callback fournisseur duplique ignore.');
            }

            $targetStatus = in_array($result->status, [Payment::STATUS_PAID, Payment::STATUS_FAILED], true)
                ? $result->status
                : null;
            $applied = $targetStatus === null || $lockedPayment->canTransitionTo($targetStatus);

            if ($targetStatus === Payment::STATUS_PAID && $applied) {
                $lockedPayment = $this->markPaid($lockedPayment, [
                    'provider_reference' => $result->providerReference,
                    'skip_transaction' => true,
                ]);
            } elseif ($targetStatus === Payment::STATUS_FAILED && $applied) {
                $lockedPayment = $this->markFailed($lockedPayment, [
                    'provider_reference' => $result->providerReference,
                    'skip_transaction' => true,
                ]);
            }

            $this->recordTransaction(
                $lockedPayment,
                PaymentTransaction::TYPE_CALLBACK,
                $applied ? PaymentTransaction::STATUS_SUCCEEDED : PaymentTransaction::STATUS_REJECTED,
                $result->providerReference,
                $result->payload,
                [
                    'provider_status' => $result->status,
                    'applied_status' => $lockedPayment->fresh()->status,
                    'ignored' => ! $applied,
                ],
                true,
                $request,
                $eventKey,
            );

            $message = $applied
                ? $result->message
                : 'Callback fournisseur hors ordre ignore; etat terminal conserve.';

            return $this->callbackResultForState($result, $lockedPayment->fresh()->status, $message);
        });
    }

    /**
     * @param  array<string, mixed>  $context
     */
    public function markPaid(Payment $payment, array $context = []): Payment
    {
        return DB::transaction(function () use ($payment, $context): Payment {
            $lockedReservation = Reservation::query()
                ->lockForUpdate()
                ->findOrFail($payment->reservation_id);
            $lockedPayment = Payment::query()
                ->lockForUpdate()
                ->findOrFail($payment->id);

            if ($lockedPayment->status === Payment::STATUS_PAID) {
                return $lockedPayment->fresh(['reservation', 'buyer', 'seller', 'transactions']);
            }

            abort_unless($lockedPayment->canTransitionTo(Payment::STATUS_PAID), 422, 'Transition de paiement interdite.');

            $this->assertReservationCanBecomePaid($lockedReservation);

            if ($lockedPayment->status !== Payment::STATUS_PAID) {
                $lockedPayment->forceFill([
                    'status' => Payment::STATUS_PAID,
                    'provider_reference' => $context['provider_reference'] ?? $lockedPayment->provider_reference,
                    'paid_at' => $lockedPayment->paid_at ?: now(),
                    'failed_at' => null,
                    'cancelled_at' => null,
                ])->save();
            }

            if ($lockedReservation->payment_status !== 'paid') {
                $lockedReservation->forceFill([
                    'payment_status' => 'paid',
                ])->save();
            }

            if (! ($context['skip_transaction'] ?? false)) {
                $this->recordTransaction(
                    $lockedPayment,
                    PaymentTransaction::TYPE_MANUAL_UPDATE,
                    PaymentTransaction::STATUS_SUCCEEDED,
                    $lockedPayment->provider_reference,
                    $context,
                    ['status' => Payment::STATUS_PAID],
                    null,
                    null,
                );
            }

            return $lockedPayment->fresh(['reservation', 'buyer', 'seller', 'transactions']);
        });
    }

    /**
     * @param  array<string, mixed>  $context
     */
    public function confirmManualPayment(Payment $payment, User $actor, array $context = []): Payment
    {
        return DB::transaction(function () use ($payment, $actor, $context): Payment {
            $lockedReservation = Reservation::query()
                ->lockForUpdate()
                ->findOrFail($payment->reservation_id);
            $lockedPayment = Payment::query()
                ->lockForUpdate()
                ->findOrFail($payment->id);

            $this->assertReservationCanBecomePaid($lockedReservation);
            abort_unless($this->isManualProvider($lockedPayment->provider), 422, 'Ce paiement ne supporte pas la confirmation manuelle.');
            $this->authorizeManualConfirmation($lockedPayment, $actor, $context);

            if ($lockedPayment->status === Payment::STATUS_PAID) {
                return $lockedPayment->fresh(['reservation', 'buyer', 'seller', 'transactions']);
            }

            abort_unless(
                in_array($lockedPayment->status, [Payment::STATUS_PENDING, Payment::STATUS_AWAITING_VERIFICATION], true),
                422,
                'Ce paiement ne peut plus etre confirme.',
            );

            $lockedPayment->forceFill([
                'status' => Payment::STATUS_PAID,
                'provider_reference' => $context['provider_reference'] ?? $lockedPayment->provider_reference,
                'paid_at' => $lockedPayment->paid_at ?: now(),
                'failed_at' => null,
                'cancelled_at' => null,
                'metadata' => array_merge($lockedPayment->metadata ?? [], [
                    'manual_confirmed_by' => $actor->id,
                    'manual_confirmed_at' => now()->toISOString(),
                    'manual_confirmation_note' => $context['note'] ?? null,
                ]),
            ])->save();

            if ($lockedReservation->payment_status !== 'paid') {
                $lockedReservation->forceFill([
                    'payment_status' => 'paid',
                ])->save();
            }

            $this->recordTransaction(
                $lockedPayment,
                PaymentTransaction::TYPE_MANUAL_UPDATE,
                PaymentTransaction::STATUS_SUCCEEDED,
                $lockedPayment->provider_reference,
                [
                    'operator_id' => $actor->id,
                    'note' => $context['note'] ?? null,
                    'confirmed_at' => now()->toISOString(),
                ],
                ['status' => Payment::STATUS_PAID],
                null,
                $context['request'] ?? null,
            );

            return $lockedPayment->fresh(['reservation', 'buyer', 'seller', 'transactions']);
        });
    }

    private function assertReservationCanBecomePaid(Reservation $reservation): void
    {
        if (in_array($reservation->reservation_status, ['cancelled', 'rejected'], true)) {
            throw ValidationException::withMessages([
                'reservation' => ['Une reservation annulee ou refusee ne peut pas devenir payee.'],
            ]);
        }
    }

    /**
     * @param  array<string, mixed>  $context
     */
    public function markFailed(Payment $payment, array $context = []): Payment
    {
        return $this->markTerminal($payment, Payment::STATUS_FAILED, 'failed_at', $context);
    }

    /**
     * @param  array<string, mixed>  $context
     */
    public function cancelPayment(Payment $payment, array $context = []): Payment
    {
        return $this->markTerminal($payment, Payment::STATUS_CANCELLED, 'cancelled_at', $context);
    }

    public function computeCommission(float $amount): float
    {
        $rate = max(0, (float) config('payments.commission_rate', 0));

        return round($amount * $rate / 100, 2);
    }

    /**
     * @param  array<string, mixed>  $context
     */
    protected function markTerminal(Payment $payment, string $status, string $timestampColumn, array $context): Payment
    {
        return DB::transaction(function () use ($payment, $status, $timestampColumn, $context): Payment {
            $lockedPayment = Payment::query()
                ->lockForUpdate()
                ->with('reservation')
                ->findOrFail($payment->id);

            if ($lockedPayment->status === $status) {
                return $lockedPayment->fresh(['reservation', 'buyer', 'seller', 'transactions']);
            }

            abort_unless($lockedPayment->canTransitionTo($status), 422, 'Transition de paiement interdite.');

            $lockedPayment->forceFill([
                'status' => $status,
                'provider_reference' => $context['provider_reference'] ?? $lockedPayment->provider_reference,
                $timestampColumn => $lockedPayment->{$timestampColumn} ?: now(),
            ])->save();

            if ($status === Payment::STATUS_CANCELLED && $lockedPayment->reservation && $lockedPayment->reservation->payment_status !== 'paid') {
                $lockedPayment->reservation->forceFill(['payment_status' => 'cancelled'])->save();
            }

            if (! ($context['skip_transaction'] ?? false)) {
                $this->recordTransaction(
                    $lockedPayment,
                    PaymentTransaction::TYPE_MANUAL_UPDATE,
                    PaymentTransaction::STATUS_SUCCEEDED,
                    $lockedPayment->provider_reference,
                    $context,
                    ['status' => $status],
                    null,
                    null,
                );
            }

            return $lockedPayment->fresh(['reservation', 'buyer', 'seller', 'transactions']);
        });
    }

    /**
     * @param  array<string, mixed>  $context
     */
    protected function markAwaitingVerification(Payment $payment, array $context): Payment
    {
        return DB::transaction(function () use ($payment, $context): Payment {
            $lockedPayment = Payment::query()
                ->lockForUpdate()
                ->with('reservation')
                ->findOrFail($payment->id);

            if ($lockedPayment->status === Payment::STATUS_PENDING) {
                $lockedPayment->forceFill([
                    'status' => Payment::STATUS_AWAITING_VERIFICATION,
                    'metadata' => array_merge($lockedPayment->metadata ?? [], [
                        'awaiting_verification_at' => now()->toISOString(),
                        'awaiting_verification_context' => $context,
                    ]),
                ])->save();
            }

            if ($lockedPayment->reservation && $lockedPayment->reservation->payment_status === 'pending') {
                $lockedPayment->reservation->forceFill([
                    'payment_status' => 'awaiting_verification',
                ])->save();
            }

            return $lockedPayment;
        });
    }

    protected function assertBuyerCanPayReservation(User $buyer, Reservation $reservation): void
    {
        abort_unless((int) $reservation->buyer_id === (int) $buyer->id, 403, 'Seul l acheteur peut initier le paiement.');
        abort_if((int) $reservation->seller_id === (int) $buyer->id, 403, 'Vous ne pouvez pas payer votre propre annonce.');
        abort_if(in_array($reservation->reservation_status, ['cancelled', 'rejected'], true), 422, 'Cette reservation ne peut pas etre payee.');
        abort_if((string) config('payments.currency', 'MAD') !== 'MAD', 422, 'La devise paiement doit rester MAD.');
    }

    protected function activePaymentExists(Reservation $reservation, string $provider): bool
    {
        $ttl = max(1, (int) config('payments.active_payment_ttl_minutes', 30));

        return Payment::query()
            ->where('reservation_id', $reservation->id)
            ->where('provider', $provider)
            ->whereIn('status', Payment::ACTIVE_STATUSES)
            ->where('created_at', '>=', now()->subMinutes($ttl))
            ->exists();
    }

    protected function reservationGrandTotal(Reservation $reservation): float
    {
        $amount = (float) ($reservation->total_price ?? 0) + (float) ($reservation->delivery_fee ?? 0);

        abort_if($amount < 0, 422, 'Montant de reservation invalide.');

        return round($amount, 2);
    }

    protected function validateProvider(string $provider, bool $requireInitiationReady = true): void
    {
        abort_unless(in_array($provider, Payment::PROVIDERS, true), 422, 'Provider paiement invalide.');
        abort_unless((bool) config("payments.providers.{$provider}.enabled", false), 422, 'Provider paiement desactive.');

        if ($requireInitiationReady && $provider === Payment::PROVIDER_CMI) {
            app(CmiGateway::class)->assertConfigurationComplete();
        }
    }

    protected function isManualProvider(string $provider): bool
    {
        return in_array($provider, [Payment::PROVIDER_MANUAL_BANK_TRANSFER, Payment::PROVIDER_CASH_ON_PICKUP], true);
    }

    /**
     * @param  array<string, mixed>  $context
     */
    protected function authorizeManualConfirmation(Payment $payment, User $actor, array $context): void
    {
        if ($payment->provider === Payment::PROVIDER_MANUAL_BANK_TRANSFER) {
            abort_unless((bool) $actor->is_admin, 403, 'Seul un administrateur peut confirmer un virement bancaire.');
            abort_unless(filled($context['note'] ?? null), 422, 'Une note de verification est obligatoire.');

            return;
        }

        abort_unless(
            (bool) $actor->is_admin || (int) $actor->id === (int) $payment->seller_id,
            403,
            'Seul le vendeur ou un administrateur peut confirmer le paiement a la recuperation.',
        );
    }

    protected function generateInternalReference(): string
    {
        do {
            $reference = 'PAY-'.now()->format('Ymd').'-'.Str::upper(Str::random(12));
        } while (Payment::query()->where('internal_reference', $reference)->exists());

        return $reference;
    }

    protected function paymentForCallback(PaymentCallbackResult $result): ?Payment
    {
        if (! $result->internalReference) {
            return null;
        }

        return Payment::query()
            ->where('internal_reference', $result->internalReference)
            ->where('provider', $result->provider)
            ->first();
    }

    /**
     * @param  array<string, mixed>|null  $requestPayload
     * @param  array<string, mixed>|null  $responsePayload
     */
    protected function recordTransaction(
        Payment $payment,
        string $type,
        string $status,
        ?string $providerReference,
        ?array $requestPayload,
        ?array $responsePayload,
        ?bool $signatureValid,
        ?Request $request,
        ?string $eventKey = null,
    ): PaymentTransaction {
        $attributes = [
            'payment_id' => $payment->id,
            'event_key' => $eventKey,
            'provider' => $payment->provider,
            'type' => $type,
            'status' => $status,
            'provider_reference' => $providerReference,
            'request_payload' => PaymentTransaction::sanitizePayload($requestPayload),
            'response_payload' => PaymentTransaction::sanitizePayload($responsePayload),
            'signature_valid' => $signatureValid,
            'ip_address' => $request?->ip(),
            'user_agent' => $request?->userAgent(),
            'processed_at' => now(),
        ];

        return $eventKey
            ? PaymentTransaction::query()->firstOrCreate(['event_key' => $eventKey], $attributes)
            : PaymentTransaction::query()->create($attributes);
    }

    protected function callbackEventKey(PaymentCallbackResult $result): string
    {
        return hash('sha256', implode('|', [
            $result->provider,
            (string) $result->internalReference,
            (string) $result->providerReference,
            $result->status,
        ]));
    }

    protected function callbackResultForState(
        PaymentCallbackResult $result,
        string $status,
        ?string $message,
    ): PaymentCallbackResult {
        return new PaymentCallbackResult(
            provider: $result->provider,
            success: $status === Payment::STATUS_PAID,
            status: $status,
            internalReference: $result->internalReference,
            providerReference: $result->providerReference,
            message: $message,
            payload: $result->payload,
            signatureValid: $result->signatureValid,
        );
    }
}
