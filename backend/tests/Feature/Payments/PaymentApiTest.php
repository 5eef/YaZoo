<?php

namespace Tests\Feature\Payments;

use App\Models\Payment;
use App\Models\PaymentTransaction;
use App\Models\Product;
use App\Models\Reservation;
use App\Models\User;
use App\Services\Payments\CmiGateway;
use App\Services\Payments\PaymentService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PaymentApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_buyer_can_create_manual_bank_transfer_awaiting_verification_payment(): void
    {
        $reservation = $this->reservation();
        Sanctum::actingAs($reservation->buyer, ['*']);

        $this->postJson("/api/reservations/{$reservation->id}/payments", [
            'provider' => Payment::PROVIDER_MANUAL_BANK_TRANSFER,
        ])
            ->assertCreated()
            ->assertJsonPath('data.status', Payment::STATUS_AWAITING_VERIFICATION)
            ->assertJsonPath('data.provider', Payment::PROVIDER_MANUAL_BANK_TRANSFER)
            ->assertJsonPath('data.amount', 315)
            ->assertJsonPath('initiation.requiresRedirect', false);

        $this->assertDatabaseHas('payments', [
            'reservation_id' => $reservation->id,
            'buyer_id' => $reservation->buyer_id,
            'provider' => Payment::PROVIDER_MANUAL_BANK_TRANSFER,
            'status' => Payment::STATUS_AWAITING_VERIFICATION,
            'currency' => 'MAD',
        ]);
        $this->assertSame('awaiting_verification', $reservation->refresh()->payment_status);
    }

    public function test_legacy_bank_transfer_reservation_remains_readable_and_finalizable(): void
    {
        Notification::fake();

        $reservation = $this->reservation([
            'delivery_status' => 'delivered',
        ]);

        Sanctum::actingAs($reservation->buyer, ['*']);

        $this->getJson("/api/reservations/{$reservation->id}")
            ->assertOk()
            ->assertJsonPath('data.paymentMethod', 'bank_transfer')
            ->assertJsonPath('data.paymentStatus', 'pending');

        Sanctum::actingAs($reservation->seller, ['*']);

        $this->postJson("/api/reservations/{$reservation->id}/complete")
            ->assertOk()
            ->assertJsonPath('data.reservationStatus', 'completed')
            ->assertJsonPath('data.paymentMethod', 'bank_transfer')
            ->assertJsonPath('data.paymentStatus', 'pending')
            ->assertJsonPath('data.invoiceNumber', fn ($value) => is_string($value) && str_starts_with($value, 'YAZ-'));
    }

    public function test_legacy_bank_transfer_provider_is_normalized_for_new_payments(): void
    {
        $reservation = $this->reservation();
        Sanctum::actingAs($reservation->buyer, ['*']);

        $this->postJson("/api/reservations/{$reservation->id}/payments", [
            'provider' => 'bank_transfer',
        ])
            ->assertCreated()
            ->assertJsonPath('data.provider', Payment::PROVIDER_MANUAL_BANK_TRANSFER);

        $this->assertDatabaseHas('payments', [
            'reservation_id' => $reservation->id,
            'provider' => Payment::PROVIDER_MANUAL_BANK_TRANSFER,
        ]);
    }

    public function test_payment_creation_is_idempotent_when_key_is_reused(): void
    {
        $reservation = $this->reservation();
        Sanctum::actingAs($reservation->buyer, ['*']);

        $payload = ['provider' => Payment::PROVIDER_MANUAL_BANK_TRANSFER];

        $first = $this->withHeader('Idempotency-Key', 'idem-payment-1')
            ->postJson("/api/reservations/{$reservation->id}/payments", $payload)
            ->assertCreated();

        $second = $this->withHeader('Idempotency-Key', 'idem-payment-1')
            ->postJson("/api/reservations/{$reservation->id}/payments", $payload)
            ->assertCreated();

        $this->assertSame($first->json('data.id'), $second->json('data.id'));
        $this->assertDatabaseCount('payments', 1);
    }

    public function test_only_buyer_can_initiate_payment(): void
    {
        $reservation = $this->reservation();
        Sanctum::actingAs($reservation->seller, ['*']);

        $this->postJson("/api/reservations/{$reservation->id}/payments", [
            'provider' => Payment::PROVIDER_MANUAL_BANK_TRANSFER,
        ])->assertForbidden();
    }

    public function test_user_cannot_pay_own_listing_reservation(): void
    {
        $owner = User::factory()->create();
        $reservation = $this->reservation([
            'buyer_id' => $owner->id,
            'seller_id' => $owner->id,
        ]);
        Sanctum::actingAs($owner, ['*']);

        $this->postJson("/api/reservations/{$reservation->id}/payments", [
            'provider' => Payment::PROVIDER_MANUAL_BANK_TRANSFER,
        ])->assertForbidden();
    }

    public function test_cannot_create_two_identical_active_payments(): void
    {
        $reservation = $this->reservation();
        Sanctum::actingAs($reservation->buyer, ['*']);

        $this->postJson("/api/reservations/{$reservation->id}/payments", [
            'provider' => Payment::PROVIDER_MANUAL_BANK_TRANSFER,
        ])->assertCreated();

        $this->postJson("/api/reservations/{$reservation->id}/payments", [
            'provider' => Payment::PROVIDER_MANUAL_BANK_TRANSFER,
        ])->assertUnprocessable();
    }

    public function test_manual_bank_transfer_remains_manual(): void
    {
        $reservation = $this->reservation();
        Sanctum::actingAs($reservation->buyer, ['*']);

        $this->postJson("/api/reservations/{$reservation->id}/payments", [
            'provider' => Payment::PROVIDER_MANUAL_BANK_TRANSFER,
        ])->assertCreated();

        $payment = Payment::query()->firstOrFail();

        $this->assertSame(Payment::STATUS_AWAITING_VERIFICATION, $payment->status);
        $this->assertSame('awaiting_verification', $reservation->refresh()->payment_status);
        $this->assertDatabaseHas('payment_transactions', [
            'payment_id' => $payment->id,
            'type' => PaymentTransaction::TYPE_INITIATE,
            'status' => PaymentTransaction::STATUS_SUCCEEDED,
        ]);
    }

    public function test_cash_on_pickup_remains_manual(): void
    {
        $reservation = $this->reservation();
        Sanctum::actingAs($reservation->buyer, ['*']);

        $this->postJson("/api/reservations/{$reservation->id}/payments", [
            'provider' => Payment::PROVIDER_CASH_ON_PICKUP,
        ])
            ->assertCreated()
            ->assertJsonPath('data.status', Payment::STATUS_AWAITING_VERIFICATION);

        $this->assertSame('awaiting_verification', $reservation->refresh()->payment_status);
    }

    public function test_admin_can_confirm_manual_bank_transfer_payment_once(): void
    {
        $reservation = $this->reservation();
        Sanctum::actingAs($reservation->buyer, ['*']);

        $this->postJson("/api/reservations/{$reservation->id}/payments", [
            'provider' => Payment::PROVIDER_MANUAL_BANK_TRANSFER,
        ])->assertCreated();

        $payment = Payment::query()->firstOrFail();
        $admin = User::factory()->admin()->create();
        Sanctum::actingAs($admin, ['*']);

        $this->patchJson("/api/payments/{$payment->id}/manual-confirm", [
            'note' => 'Recu bancaire verifie.',
            'provider_reference' => 'BANK-REF-1',
        ])
            ->assertOk()
            ->assertJsonPath('data.status', Payment::STATUS_PAID)
            ->assertJsonPath('data.providerReference', 'BANK-REF-1');

        $this->assertSame('paid', $reservation->refresh()->payment_status);
        $this->assertDatabaseHas('payment_transactions', [
            'payment_id' => $payment->id,
            'type' => PaymentTransaction::TYPE_MANUAL_UPDATE,
            'status' => PaymentTransaction::STATUS_SUCCEEDED,
        ]);

        $this->patchJson("/api/payments/{$payment->id}/manual-confirm", [
            'note' => 'Deuxieme appel idempotent.',
        ])->assertOk();

        $this->assertDatabaseCount('payment_transactions', 2);
    }

    public function test_buyer_cannot_confirm_own_manual_payment_as_paid(): void
    {
        $reservation = $this->reservation();
        Sanctum::actingAs($reservation->buyer, ['*']);

        $this->postJson("/api/reservations/{$reservation->id}/payments", [
            'provider' => Payment::PROVIDER_MANUAL_BANK_TRANSFER,
        ])->assertCreated();

        $payment = Payment::query()->firstOrFail();

        $this->patchJson("/api/payments/{$payment->id}/manual-confirm", [
            'note' => 'Tentative acheteur',
        ])->assertForbidden();

        $this->assertSame(Payment::STATUS_AWAITING_VERIFICATION, $payment->refresh()->status);
        $this->assertSame('awaiting_verification', $reservation->refresh()->payment_status);
    }

    public function test_seller_can_confirm_cash_on_pickup_payment(): void
    {
        $reservation = $this->reservation(['payment_method' => 'cash_on_pickup']);
        Sanctum::actingAs($reservation->buyer, ['*']);

        $this->postJson("/api/reservations/{$reservation->id}/payments", [
            'provider' => Payment::PROVIDER_CASH_ON_PICKUP,
        ])->assertCreated();

        $payment = Payment::query()->firstOrFail();
        Sanctum::actingAs($reservation->seller, ['*']);

        $this->patchJson("/api/payments/{$payment->id}/manual-confirm", [
            'note' => 'Cash recu a la recuperation.',
        ])
            ->assertOk()
            ->assertJsonPath('data.status', Payment::STATUS_PAID);

        $this->assertSame('paid', $reservation->refresh()->payment_status);
    }

    public function test_manual_bank_transfer_confirmation_requires_admin_note(): void
    {
        $reservation = $this->reservation();
        Sanctum::actingAs($reservation->buyer, ['*']);

        $this->postJson("/api/reservations/{$reservation->id}/payments", [
            'provider' => Payment::PROVIDER_MANUAL_BANK_TRANSFER,
        ])->assertCreated();

        $payment = Payment::query()->firstOrFail();
        Sanctum::actingAs(User::factory()->admin()->create(), ['*']);

        $this->patchJson("/api/payments/{$payment->id}/manual-confirm")
            ->assertUnprocessable();
    }

    public function test_cmi_disabled_refuses_initiation(): void
    {
        config(['payments.providers.cmi.enabled' => false]);

        $reservation = $this->reservation();
        Sanctum::actingAs($reservation->buyer, ['*']);

        $this->postJson("/api/reservations/{$reservation->id}/payments", [
            'provider' => Payment::PROVIDER_CMI,
        ])->assertUnprocessable();

        $this->assertSame('pending', $reservation->refresh()->payment_status);
    }

    public function test_cmi_callback_is_refused_when_provider_is_disabled(): void
    {
        config([
            'payments.providers.cmi.enabled' => false,
            'payments.providers.cmi.store_key' => 'test-store-key',
        ]);

        $payment = $this->paymentForCallback();
        $payload = [
            'internal_reference' => $payment->internal_reference,
            'status' => 'paid',
        ];
        $payload['signature'] = app(CmiGateway::class)->generateSignature($payload);

        $this->postJson('/api/payments/cmi/callback', $payload)
            ->assertUnprocessable();

        $this->assertSame(Payment::STATUS_PENDING, $payment->refresh()->status);
        $this->assertSame('pending', $payment->reservation->refresh()->payment_status);
        $this->assertDatabaseMissing('payment_transactions', [
            'payment_id' => $payment->id,
            'type' => PaymentTransaction::TYPE_CALLBACK,
        ]);
    }

    public function test_cmi_initiation_requires_complete_configuration(): void
    {
        config([
            'payments.providers.cmi.enabled' => true,
            'payments.providers.cmi.gateway_url' => '',
            'payments.providers.cmi.client_id' => '',
            'payments.providers.cmi.store_key' => '',
            'payments.providers.cmi.ok_url' => '',
            'payments.providers.cmi.fail_url' => '',
            'payments.providers.cmi.callback_url' => '',
        ]);

        $reservation = $this->reservation();
        Sanctum::actingAs($reservation->buyer, ['*']);

        $this->postJson("/api/reservations/{$reservation->id}/payments", [
            'provider' => Payment::PROVIDER_CMI,
        ])->assertUnprocessable();

        $this->assertDatabaseMissing('payments', [
            'reservation_id' => $reservation->id,
            'provider' => Payment::PROVIDER_CMI,
        ]);
        $this->assertSame('pending', $reservation->refresh()->payment_status);
    }

    public function test_payment_config_hides_cmi_when_configuration_is_incomplete(): void
    {
        config([
            'payments.providers.cmi.enabled' => true,
            'payments.providers.cmi.gateway_url' => '',
            'payments.providers.cmi.client_id' => 'client',
            'payments.providers.cmi.store_key' => 'key',
            'payments.providers.cmi.ok_url' => 'https://example.test/ok',
            'payments.providers.cmi.fail_url' => 'https://example.test/fail',
            'payments.providers.cmi.callback_url' => 'https://example.test/callback',
        ]);

        $this->getJson('/api/payments/config')
            ->assertOk()
            ->assertJsonPath('providers.cmi.enabled', false);
    }

    public function test_cmi_callback_with_invalid_signature_is_refused(): void
    {
        config([
            'payments.providers.cmi.enabled' => true,
            'payments.providers.cmi.store_key' => 'test-store-key',
        ]);

        $payment = $this->paymentForCallback();

        $this->postJson('/api/payments/cmi/callback', [
            'internal_reference' => $payment->internal_reference,
            'status' => 'paid',
            'signature' => 'invalid',
        ])->assertUnprocessable();

        $this->assertSame(Payment::STATUS_PENDING, $payment->refresh()->status);
        $this->assertSame('pending', $payment->reservation->refresh()->payment_status);
        $this->assertDatabaseHas('payment_transactions', [
            'payment_id' => $payment->id,
            'type' => PaymentTransaction::TYPE_CALLBACK,
            'status' => PaymentTransaction::STATUS_REJECTED,
            'signature_valid' => false,
        ]);
    }

    public function test_frontend_success_return_does_not_mark_payment_paid(): void
    {
        $payment = $this->paymentForCallback();

        $this->get('/payment/return/success')
            ->assertOk()
            ->assertJsonPath('status', 'return_success');

        $this->assertSame(Payment::STATUS_PENDING, $payment->refresh()->status);
        $this->assertSame('pending', $payment->reservation->refresh()->payment_status);
    }

    public function test_frontend_failure_return_does_not_mark_payment_failed_or_paid(): void
    {
        $payment = $this->paymentForCallback();

        $this->get('/payment/return/failure')
            ->assertOk()
            ->assertJsonPath('status', 'return_failure');

        $this->assertSame(Payment::STATUS_PENDING, $payment->refresh()->status);
        $this->assertSame('pending', $payment->reservation->refresh()->payment_status);
    }

    public function test_payment_amount_uses_total_price_plus_delivery_fee_once(): void
    {
        $reservation = $this->reservation([
            'unit_price' => 600,
            'total_price' => 600,
            'delivery_fee' => 40,
        ]);
        Sanctum::actingAs($reservation->buyer, ['*']);

        $this->postJson("/api/reservations/{$reservation->id}/payments", [
            'provider' => Payment::PROVIDER_MANUAL_BANK_TRANSFER,
        ])
            ->assertCreated()
            ->assertJsonPath('data.amount', 640);

        $this->assertDatabaseHas('payments', [
            'reservation_id' => $reservation->id,
            'amount' => 640,
            'net_amount' => 640,
        ]);
    }

    public function test_valid_cmi_callback_can_mark_payment_and_reservation_paid(): void
    {
        config([
            'payments.providers.cmi.enabled' => true,
            'payments.providers.cmi.store_key' => 'test-store-key',
        ]);

        $payment = $this->paymentForCallback();
        $payload = [
            'internal_reference' => $payment->internal_reference,
            'provider_reference' => 'CMI-TEST-123',
            'status' => 'paid',
        ];
        $payload['signature'] = app(CmiGateway::class)->generateSignature($payload);

        $this->postJson('/api/payments/cmi/callback', $payload)
            ->assertOk()
            ->assertJsonPath('status', Payment::STATUS_PAID);

        $payment->refresh();
        $this->assertSame(Payment::STATUS_PAID, $payment->status);
        $this->assertSame('CMI-TEST-123', $payment->provider_reference);
        $this->assertSame('paid', $payment->reservation->refresh()->payment_status);
        $this->assertNotNull($payment->paid_at);
    }

    public function test_reservation_payment_status_becomes_paid_only_after_valid_callback(): void
    {
        config([
            'payments.providers.cmi.enabled' => true,
            'payments.providers.cmi.store_key' => 'test-store-key',
        ]);

        $payment = $this->paymentForCallback();

        $this->get('/payment/return/success')->assertOk();
        $this->assertSame('pending', $payment->reservation->refresh()->payment_status);

        $payload = [
            'internal_reference' => $payment->internal_reference,
            'status' => 'paid',
        ];
        $payload['signature'] = app(CmiGateway::class)->generateSignature($payload);

        $this->postJson('/api/payments/cmi/callback', $payload)->assertOk();

        $this->assertSame('paid', $payment->reservation->refresh()->payment_status);
    }

    public function test_callback_payload_masks_sensitive_keys_before_storage(): void
    {
        config([
            'payments.providers.cmi.enabled' => true,
            'payments.providers.cmi.store_key' => 'test-store-key',
        ]);

        $payment = $this->paymentForCallback();
        $payload = [
            'internal_reference' => $payment->internal_reference,
            'status' => 'paid',
            'card' => '4111111111111111',
            'pan' => '4111111111111111',
            'card_number' => '4111111111111111',
            'cvv' => '123',
            'cvc' => '123',
            'expiry' => '12/30',
            'exp_month' => '12',
            'exp_year' => '2030',
            'token' => 'tok_secret',
            'access_token' => 'access_secret',
            'secret' => 'secret_value',
            'password' => 'password_value',
            'store_key' => 'store_secret',
            'client_secret' => 'client_secret_value',
            'authorization' => 'Bearer token',
            'nested' => [
                'hash' => 'nested_hash',
                'signature' => 'nested_signature',
            ],
        ];
        $payload['signature'] = app(CmiGateway::class)->generateSignature($payload);
        $payload['hash'] = 'hash_value';

        $this->postJson('/api/payments/cmi/callback', $payload)->assertOk();

        $transaction = PaymentTransaction::query()
            ->where('payment_id', $payment->id)
            ->where('type', PaymentTransaction::TYPE_CALLBACK)
            ->latest()
            ->firstOrFail();

        foreach ([
            'card',
            'pan',
            'card_number',
            'cvv',
            'cvc',
            'expiry',
            'exp_month',
            'exp_year',
            'token',
            'access_token',
            'secret',
            'password',
            'store_key',
            'client_secret',
            'authorization',
            'signature',
            'hash',
        ] as $key) {
            $this->assertSame('[redacted]', $transaction->request_payload[$key]);
        }

        $this->assertSame('[redacted]', $transaction->request_payload['nested']['hash']);
        $this->assertSame('[redacted]', $transaction->request_payload['nested']['signature']);
    }

    public function test_cancelling_reservation_atomically_cancels_active_payments(): void
    {
        Notification::fake();
        $reservation = $this->reservation();
        Sanctum::actingAs($reservation->buyer, ['*']);

        $this->postJson("/api/reservations/{$reservation->id}/payments", [
            'provider' => Payment::PROVIDER_MANUAL_BANK_TRANSFER,
        ])->assertCreated();

        $payment = Payment::query()->firstOrFail();

        $this->patchJson("/api/reservations/{$reservation->id}/cancel")
            ->assertOk();

        $this->assertSame('cancelled', $reservation->refresh()->reservation_status);
        $this->assertSame(Payment::STATUS_CANCELLED, $payment->refresh()->status);
        $this->assertNull($payment->checkout_url);
        $this->assertDatabaseHas('payment_transactions', [
            'payment_id' => $payment->id,
            'type' => PaymentTransaction::TYPE_MANUAL_UPDATE,
            'status' => PaymentTransaction::STATUS_SUCCEEDED,
        ]);
    }

    public function test_cancelled_reservation_cannot_be_marked_paid_by_late_callback(): void
    {
        $reservation = $this->reservation([
            'reservation_status' => 'cancelled',
            'payment_status' => 'cancelled',
            'cancelled_at' => now(),
        ]);
        $payment = $this->paymentForReservation($reservation);

        try {
            app(PaymentService::class)->markPaid($payment);
            $this->fail('A cancelled reservation must never become paid.');
        } catch (\Illuminate\Validation\ValidationException) {
            $this->assertSame(Payment::STATUS_PENDING, $payment->refresh()->status);
            $this->assertSame('cancelled', $reservation->refresh()->payment_status);
        }
    }

    /**
     * @param  array<string, mixed>  $overrides
     */
    private function reservation(array $overrides = []): Reservation
    {
        $seller = User::factory()->create();
        $buyer = User::factory()->create();
        $product = Product::factory()->create([
            'user_id' => $seller->id,
            'price' => 300,
            'stock' => 4,
            'listing_status' => 'available',
        ]);

        return Reservation::create(array_merge([
            'buyer_id' => $buyer->id,
            'seller_id' => $seller->id,
            'reservable_type' => Product::class,
            'reservable_id' => $product->id,
            'category' => 'product',
            'quantity' => 1,
            'delivery_method' => 'delivery',
            'payment_method' => 'bank_transfer',
            'reservation_status' => 'approved',
            'payment_status' => 'pending',
            'delivery_status' => 'preparing',
            'unit_price' => 300,
            'total_price' => 300,
            'delivery_fee' => 15,
        ], $overrides))->load(['buyer', 'seller']);
    }

    private function paymentForCallback(): Payment
    {
        $reservation = $this->reservation();

        return $this->paymentForReservation($reservation);
    }

    private function paymentForReservation(Reservation $reservation): Payment
    {
        return Payment::create([
            'reservation_id' => $reservation->id,
            'buyer_id' => $reservation->buyer_id,
            'seller_id' => $reservation->seller_id,
            'provider' => Payment::PROVIDER_CMI,
            'status' => Payment::STATUS_PENDING,
            'amount' => 315,
            'currency' => 'MAD',
            'commission_amount' => 0,
            'net_amount' => 315,
            'internal_reference' => 'PAY-TEST-'.strtoupper(fake()->bothify('????####')),
        ])->load('reservation');
    }
}
