<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Payment extends Model
{
    use HasFactory;

    public const PROVIDER_CASH_ON_PICKUP = 'cash_on_pickup';

    public const PROVIDER_MANUAL_BANK_TRANSFER = 'manual_bank_transfer';

    public const PROVIDER_CMI = 'cmi';

    public const PROVIDER_PAYZONE = 'payzone';

    public const PROVIDER_STRIPE = 'stripe';

    public const PROVIDERS = [
        self::PROVIDER_CASH_ON_PICKUP,
        self::PROVIDER_MANUAL_BANK_TRANSFER,
        self::PROVIDER_CMI,
        self::PROVIDER_PAYZONE,
        self::PROVIDER_STRIPE,
    ];

    public const STATUS_PENDING = 'pending';

    public const STATUS_AWAITING_VERIFICATION = 'awaiting_verification';

    public const STATUS_AUTHORIZED = 'authorized';

    public const STATUS_PAID = 'paid';

    public const STATUS_FAILED = 'failed';

    public const STATUS_REFUNDED = 'refunded';

    public const STATUS_CANCELLED = 'cancelled';

    public const STATUSES = [
        self::STATUS_PENDING,
        self::STATUS_AWAITING_VERIFICATION,
        self::STATUS_AUTHORIZED,
        self::STATUS_PAID,
        self::STATUS_FAILED,
        self::STATUS_REFUNDED,
        self::STATUS_CANCELLED,
    ];

    public const ACTIVE_STATUSES = [
        self::STATUS_PENDING,
        self::STATUS_AWAITING_VERIFICATION,
        self::STATUS_AUTHORIZED,
    ];

    public const ALLOWED_TRANSITIONS = [
        self::STATUS_PENDING => [self::STATUS_AWAITING_VERIFICATION, self::STATUS_AUTHORIZED, self::STATUS_PAID, self::STATUS_FAILED, self::STATUS_CANCELLED],
        self::STATUS_AWAITING_VERIFICATION => [self::STATUS_AUTHORIZED, self::STATUS_PAID, self::STATUS_FAILED, self::STATUS_CANCELLED],
        self::STATUS_AUTHORIZED => [self::STATUS_PAID, self::STATUS_FAILED, self::STATUS_CANCELLED],
        self::STATUS_PAID => [self::STATUS_REFUNDED],
        self::STATUS_FAILED => [],
        self::STATUS_REFUNDED => [],
        self::STATUS_CANCELLED => [],
    ];

    /**
     * @var list<string>
     */
    protected $fillable = [
        'reservation_id',
        'buyer_id',
        'seller_id',
        'provider',
        'status',
        'amount',
        'currency',
        'commission_amount',
        'net_amount',
        'provider_reference',
        'internal_reference',
        'idempotency_key',
        'checkout_url',
        'paid_at',
        'failed_at',
        'refunded_at',
        'cancelled_at',
        'metadata',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'commission_amount' => 'decimal:2',
            'net_amount' => 'decimal:2',
            'paid_at' => 'datetime',
            'failed_at' => 'datetime',
            'refunded_at' => 'datetime',
            'cancelled_at' => 'datetime',
            'metadata' => 'array',
        ];
    }

    public function reservation(): BelongsTo
    {
        return $this->belongsTo(Reservation::class);
    }

    public function buyer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'buyer_id');
    }

    public function seller(): BelongsTo
    {
        return $this->belongsTo(User::class, 'seller_id');
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(PaymentTransaction::class);
    }

    public function isActive(): bool
    {
        return in_array($this->status, self::ACTIVE_STATUSES, true);
    }

    public function isPaid(): bool
    {
        return $this->status === self::STATUS_PAID;
    }

    public function canTransitionTo(string $status): bool
    {
        return $status === $this->status
            || in_array($status, self::ALLOWED_TRANSITIONS[$this->status] ?? [], true);
    }

    public static function normalizeProvider(string $provider): string
    {
        return $provider === 'bank_transfer'
            ? self::PROVIDER_MANUAL_BANK_TRANSFER
            : $provider;
    }
}
