<?php

namespace App\Services\Payments;

use App\DTOs\Payments\PaymentCallbackResult;
use App\DTOs\Payments\PaymentInitiationResult;
use App\DTOs\Payments\PaymentResult;
use App\Models\Payment;
use App\Models\PaymentTransaction;
use App\Services\Payments\Contracts\PaymentGateway;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class CmiGateway implements PaymentGateway
{
    public function supports(string $provider): bool
    {
        return $provider === Payment::PROVIDER_CMI;
    }

    public function initiate(Payment $payment): PaymentInitiationResult
    {
        if (! (bool) config('payments.providers.cmi.enabled', false)) {
            throw ValidationException::withMessages([
                'provider' => ['Le paiement CMI est desactive.'],
            ]);
        }

        $this->assertConfigurationComplete();

        $payload = $this->buildHostedCheckoutPayload($payment);

        return new PaymentInitiationResult(
            provider: Payment::PROVIDER_CMI,
            status: Payment::STATUS_PENDING,
            checkoutUrl: (string) config('payments.providers.cmi.gateway_url'),
            message: 'Redirection vers la page de paiement CMI preparee.',
            payload: $payload,
            requiresRedirect: true,
        );
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    public function handleCallback(array $payload): PaymentCallbackResult
    {
        $signatureValid = $this->verifySignature($payload);
        $sanitized = $this->sanitizePayload($payload);
        $internalReference = $this->stringValue($sanitized['internal_reference'] ?? $sanitized['oid'] ?? null);
        $providerReference = $this->stringValue($sanitized['provider_reference'] ?? $sanitized['transId'] ?? $sanitized['transaction_id'] ?? null);

        if (! $signatureValid) {
            return new PaymentCallbackResult(
                provider: Payment::PROVIDER_CMI,
                success: false,
                status: 'rejected',
                internalReference: $internalReference,
                providerReference: $providerReference,
                message: 'Signature CMI invalide.',
                payload: $sanitized,
                signatureValid: false,
            );
        }

        $status = $this->resolveCallbackStatus($sanitized);

        return new PaymentCallbackResult(
            provider: Payment::PROVIDER_CMI,
            success: $status === Payment::STATUS_PAID,
            status: $status,
            internalReference: $internalReference,
            providerReference: $providerReference,
            message: $status === Payment::STATUS_PAID ? 'Callback CMI valide.' : 'Callback CMI valide non paye.',
            payload: $sanitized,
            signatureValid: true,
        );
    }

    public function refund(Payment $payment, ?float $amount = null): PaymentResult
    {
        return new PaymentResult(
            provider: Payment::PROVIDER_CMI,
            success: false,
            status: Payment::STATUS_PENDING,
            message: 'Remboursement CMI non implemente sans kit officiel.',
        );
    }

    /**
     * Payload preparatoire. A remplacer/valider avec le kit officiel CMI avant production.
     *
     * @return array<string, mixed>
     */
    public function buildHostedCheckoutPayload(Payment $payment): array
    {
        $payload = [
            'clientid' => (string) config('payments.providers.cmi.client_id'),
            'amount' => number_format((float) $payment->amount, 2, '.', ''),
            'currency' => $payment->currency,
            'oid' => $payment->internal_reference,
            'internal_reference' => $payment->internal_reference,
            'okUrl' => (string) config('payments.providers.cmi.ok_url'),
            'failUrl' => (string) config('payments.providers.cmi.fail_url'),
            'callbackUrl' => (string) config('payments.providers.cmi.callback_url'),
            'rnd' => Str::random(24),
            'mode' => (string) config('payments.providers.cmi.mode', 'sandbox'),
        ];

        $payload['signature'] = $this->generateSignature($payload);

        return $payload;
    }

    /**
     * Signature preparatoire par HMAC SHA-256, non equivalente a une certification CMI.
     *
     * @param  array<string, mixed>  $payload
     */
    public function generateSignature(array $payload): string
    {
        $storeKey = (string) config('payments.providers.cmi.store_key', '');

        if ($storeKey === '') {
            return '';
        }

        return hash_hmac('sha256', $this->canonicalPayload($payload), $storeKey);
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    public function verifySignature(array $payload): bool
    {
        $received = $this->stringValue($payload['signature'] ?? $payload['hash'] ?? null);

        if ($received === null || $received === '') {
            return false;
        }

        $expected = $this->generateSignature($payload);

        return $expected !== '' && hash_equals($expected, $received);
    }

    public function assertConfigurationComplete(): void
    {
        $required = [
            'gateway_url',
            'client_id',
            'store_key',
            'ok_url',
            'fail_url',
            'callback_url',
        ];

        $missing = collect($required)
            ->filter(fn (string $key): bool => trim((string) config("payments.providers.cmi.{$key}", '')) === '')
            ->values()
            ->all();

        if ($missing !== []) {
            throw ValidationException::withMessages([
                'provider' => ['Configuration CMI incomplete: '.implode(', ', $missing).'.'],
            ]);
        }
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     */
    public function sanitizePayload(array $payload): array
    {
        return PaymentTransaction::sanitizePayload($payload) ?? [];
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    protected function canonicalPayload(array $payload): string
    {
        $filtered = [];

        foreach ($this->sanitizePayload($payload) as $key => $value) {
            $normalizedKey = strtolower((string) $key);

            if (in_array($normalizedKey, ['signature', 'hash'], true)) {
                continue;
            }

            if (is_array($value)) {
                $value = json_encode($value, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
            }

            $filtered[(string) $key] = (string) $value;
        }

        ksort($filtered);

        return collect($filtered)
            ->map(fn (string $value, string $key): string => $key.'='.$value)
            ->implode('|');
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    protected function resolveCallbackStatus(array $payload): string
    {
        $status = strtolower((string) ($payload['payment_status'] ?? $payload['status'] ?? $payload['Response'] ?? ''));
        $code = (string) ($payload['ProcReturnCode'] ?? $payload['proc_return_code'] ?? '');

        if (in_array($status, ['paid', 'approved', 'success', 'authorized'], true) || $code === '00') {
            return Payment::STATUS_PAID;
        }

        if (in_array($status, ['failed', 'declined', 'error'], true)) {
            return Payment::STATUS_FAILED;
        }

        return Payment::STATUS_PENDING;
    }

    protected function stringValue(mixed $value): ?string
    {
        if ($value === null) {
            return null;
        }

        $string = trim((string) $value);

        return $string === '' ? null : $string;
    }
}
