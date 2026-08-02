<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PaymentTransaction extends Model
{
    public const TYPE_INITIATE = 'initiate';

    public const TYPE_CALLBACK = 'callback';

    public const TYPE_POSTAUTH = 'postauth';

    public const TYPE_REFUND = 'refund';

    public const TYPE_STATUS_CHECK = 'status_check';

    public const TYPE_MANUAL_UPDATE = 'manual_update';

    public const TYPES = [
        self::TYPE_INITIATE,
        self::TYPE_CALLBACK,
        self::TYPE_POSTAUTH,
        self::TYPE_REFUND,
        self::TYPE_STATUS_CHECK,
        self::TYPE_MANUAL_UPDATE,
    ];

    public const STATUS_PENDING = 'pending';

    public const STATUS_SUCCEEDED = 'succeeded';

    public const STATUS_FAILED = 'failed';

    public const STATUS_REJECTED = 'rejected';

    /**
     * @var list<string>
     */
    protected $fillable = [
        'payment_id',
        'event_key',
        'provider',
        'type',
        'status',
        'provider_reference',
        'request_payload',
        'response_payload',
        'signature_valid',
        'ip_address',
        'user_agent',
        'processed_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'request_payload' => 'array',
            'response_payload' => 'array',
            'signature_valid' => 'boolean',
            'processed_at' => 'datetime',
        ];
    }

    public function payment(): BelongsTo
    {
        return $this->belongsTo(Payment::class);
    }

    /**
     * @param  array<string, mixed>|null  $payload
     * @return array<string, mixed>|null
     */
    public static function sanitizePayload(?array $payload): ?array
    {
        if ($payload === null) {
            return null;
        }

        $blockedKeys = [
            'access_token',
            'authorization',
            'card',
            'card_number',
            'cardnumber',
            'client_secret',
            'pan',
            'cvv',
            'cvc',
            'expiry',
            'expiration',
            'exp_month',
            'exp_year',
            'hash',
            'password',
            'secret',
            'signature',
            'store_key',
            'token',
        ];

        $sanitized = [];

        foreach ($payload as $key => $value) {
            $normalizedKey = strtolower(str_replace(['-', ' '], '_', (string) $key));

            if (in_array($normalizedKey, $blockedKeys, true) || str_contains($normalizedKey, 'card')) {
                $sanitized[$key] = '[redacted]';

                continue;
            }

            $sanitized[$key] = is_array($value) ? self::sanitizePayload($value) : $value;
        }

        return $sanitized;
    }
}
