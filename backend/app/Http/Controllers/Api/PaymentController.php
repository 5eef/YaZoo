<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Payment\StoreReservationPaymentRequest;
use App\Http\Resources\PaymentResource;
use App\Models\Payment;
use App\Models\Reservation;
use App\Services\AdminMfaService;
use App\Services\Payments\PaymentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PaymentController extends Controller
{
    public function __construct(
        protected PaymentService $payments,
    ) {}

    public function config(): JsonResponse
    {
        return response()->json([
            'currency' => config('payments.currency', 'MAD'),
            'defaultProvider' => config('payments.default_provider', 'manual_bank_transfer'),
            'providers' => [
                'cash_on_pickup' => ['enabled' => true, 'manual' => true],
                'manual_bank_transfer' => ['enabled' => true, 'manual' => true],
                'cmi' => [
                    'enabled' => (bool) config('payments.providers.cmi.enabled', false) && $this->cmiConfigIsComplete(),
                    'mode' => config('payments.providers.cmi.mode', 'sandbox'),
                    'status' => (bool) config('payments.providers.cmi.enabled', false) && $this->cmiConfigIsComplete()
                        ? 'active'
                        : 'preparation',
                    'requirements' => [
                        'contractApproved' => (bool) config('payments.providers.cmi.contract_approved', false),
                        'sandboxValidated' => (bool) config('payments.providers.cmi.sandbox_validated', false),
                        'homologationApproved' => (bool) config('payments.providers.cmi.homologation_approved', false),
                    ],
                ],
            ],
        ]);
    }

    public function store(StoreReservationPaymentRequest $request, Reservation $reservation): JsonResponse
    {
        $this->authorizeReservationParticipant($request, $reservation, buyerOnly: true);

        $payment = $this->payments->createPendingPaymentForReservation(
            $request->user(),
            $reservation,
            (string) $request->validated('provider'),
            $request->validated('idempotency_key') ?: null,
        );
        $initiation = $this->payments->initiatePayment($payment);

        return response()->json([
            'data' => PaymentResource::make($payment->fresh())->resolve($request),
            'initiation' => [
                'provider' => $initiation->provider,
                'status' => $initiation->status,
                'checkoutUrl' => $initiation->checkoutUrl,
                'requiresRedirect' => $initiation->requiresRedirect,
                'message' => $initiation->message,
            ],
        ], 201);
    }

    public function index(Request $request, Reservation $reservation): JsonResponse
    {
        $this->authorizeReservationParticipant($request, $reservation);

        return response()->json([
            'data' => PaymentResource::collection(
                $reservation->payments()->latest()->get(),
            )->resolve($request),
        ]);
    }

    public function show(Request $request, Payment $payment): PaymentResource
    {
        $payment->load('reservation');
        abort_unless(
            $request->user()?->is_admin
                || $request->user()?->id === $payment->buyer_id
                || $request->user()?->id === $payment->seller_id,
            403,
        );

        return PaymentResource::make($payment);
    }

    public function confirmManual(Request $request, Payment $payment): JsonResponse
    {
        $actor = $request->user();
        if ($actor?->is_admin) {
            if ($actor->admin_mfa_confirmed_at === null && (bool) config('auth.admin_mfa.enforced')) {
                abort(423, __('messages.auth.admin_mfa_required'));
            }
            if ($actor->admin_mfa_confirmed_at !== null) {
                $tokenId = $actor->currentAccessToken()?->getKey();
                $tokenId = is_numeric($tokenId) ? (int) $tokenId : null;
                abort_unless(
                    app(AdminMfaService::class)->hasRecentChallenge($actor, $tokenId),
                    423,
                    __('messages.auth.admin_mfa_required'),
                );
            }
        }

        $validated = $request->validate([
            'note' => ['nullable', 'string', 'max:2000'],
            'provider_reference' => ['nullable', 'string', 'max:190'],
        ]);

        $confirmed = $this->payments->confirmManualPayment($payment, $request->user(), [
            ...$validated,
            'request' => $request,
        ]);

        return response()->json([
            'data' => PaymentResource::make($confirmed)->resolve($request),
        ]);
    }

    public function cmiCallback(Request $request): JsonResponse
    {
        $result = $this->payments->handleProviderCallback(
            Payment::PROVIDER_CMI,
            $request->all(),
            $request,
        );

        return response()->json([
            'status' => $result->status,
            'message' => $result->message,
        ]);
    }

    protected function authorizeReservationParticipant(Request $request, Reservation $reservation, bool $buyerOnly = false): void
    {
        $user = $request->user();

        abort_unless($user, 401);
        abort_unless(
            $user->is_admin
                || $user->id === $reservation->buyer_id
                || (! $buyerOnly && $user->id === $reservation->seller_id),
            403,
        );

        if ($buyerOnly && ! $user->is_admin) {
            abort_unless($user->id === $reservation->buyer_id, 403);
        }
    }

    protected function cmiConfigIsComplete(): bool
    {
        foreach (['gateway_url', 'client_id', 'store_key', 'ok_url', 'fail_url', 'callback_url'] as $key) {
            if (trim((string) config("payments.providers.cmi.{$key}", '')) === '') {
                return false;
            }
        }

        return true;
    }
}
