<?php

namespace Tests\Integration;

use App\Models\Payment;
use App\Models\Product;
use App\Models\Reservation;
use App\Models\User;
use App\Services\Payments\PaymentService;
use App\Services\ReservationService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

class ReservationPaymentMySqlIntegrationTest extends TestCase
{
    /** @var array<int, int> */
    private array $userIds = [];

    /** @var array<int, int> */
    private array $productIds = [];

    /** @var array<int, int> */
    private array $reservationIds = [];

    /** @var array<int, int> */
    private array $paymentIds = [];

    protected function setUp(): void
    {
        parent::setUp();

        if (
            config('database.default') !== 'mysql'
            || ! filter_var(env('YAZOO_MYSQL_CONCURRENCY_TEST', false), FILTER_VALIDATE_BOOL)
        ) {
            $this->markTestSkipped('Requires the explicitly enabled DATABASE #2 MySQL/MariaDB environment.');
        }
    }

    protected function tearDown(): void
    {
        if (config('database.default') === 'mysql') {
            DB::table('activity_logs')
                ->where('subject_type', (new Reservation)->getMorphClass())
                ->whereIn('subject_id', $this->reservationIds)
                ->delete();
            DB::table('notifications')->whereIn('notifiable_id', $this->userIds)->delete();
            DB::table('payment_transactions')->whereIn('payment_id', $this->paymentIds)->delete();
            Payment::query()->whereIn('id', $this->paymentIds)->delete();
            Reservation::query()->whereIn('id', $this->reservationIds)->delete();
            Product::query()->whereIn('id', $this->productIds)->forceDelete();
            User::query()->whereIn('id', $this->userIds)->forceDelete();
        }

        parent::tearDown();
    }

    public function test_product_reservation_payment_and_completion_are_consistent_on_database_two(): void
    {
        $seller = User::factory()->create();
        $buyer = User::factory()->create();
        $this->userIds = [$seller->id, $buyer->id];

        $product = Product::factory()->create([
            'user_id' => $seller->id,
            'price' => 120.50,
            'stock' => 3,
            'listing_status' => 'available',
            'moderation_status' => Product::MODERATION_STATUS_ACTIVE,
        ]);
        $this->productIds[] = $product->id;

        $reservations = app(ReservationService::class);
        $reservation = $reservations->createProduct($buyer, $product, [
            'quantity' => 1,
            'delivery_method' => 'pickup',
            'payment_method' => 'bank_transfer',
        ]);
        $this->reservationIds[] = $reservation->id;

        $approved = $reservations->approve($reservation);
        $this->assertSame('approved', $approved->reservation_status);
        $this->assertSame('ready_for_pickup', $approved->delivery_status);

        $payments = app(PaymentService::class);
        $payment = $payments->createPendingPaymentForReservation(
            $buyer,
            $approved,
            Payment::PROVIDER_MANUAL_BANK_TRANSFER,
            'db2-integration-'.Str::uuid(),
        );
        $this->paymentIds[] = $payment->id;

        $paid = $payments->markPaid($payment, ['provider_reference' => 'DB2-'.Str::uuid()]);
        $paidAgain = $payments->markPaid($paid);

        $this->assertSame(Payment::STATUS_PAID, $paidAgain->status);
        $this->assertSame('paid', $approved->fresh()->payment_status);
        $this->assertSame('120.50', (string) $paidAgain->amount);
        $this->assertCount(1, $paidAgain->transactions);

        $ready = $reservations->updateDeliveryStatus($approved->fresh(), 'picked_up');
        $completed = $reservations->complete($ready);

        $this->assertSame('completed', $completed->reservation_status);
        $this->assertSame('paid', $completed->payment_status);
        $this->assertNotNull($completed->invoice_number);
        $this->assertSame(2, (int) $product->fresh()->stock);
        $this->assertSame('available', $product->fresh()->listing_status);
    }
}
