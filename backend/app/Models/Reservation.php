<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class Reservation extends Model
{
    use HasFactory;

    public const PAYMENT_METHODS = [
        'cash_on_pickup',
        'bank_transfer',
    ];

    public const DELIVERY_METHODS = [
        'pickup',
        'delivery',
    ];

    public const RESERVATION_STATUSES = [
        'pending',
        'approved',
        'rejected',
        'cancelled',
        'completed',
    ];

    public const PAYMENT_STATUSES = [
        'pending',
        'awaiting_verification',
        'paid',
        'cancelled',
    ];

    public const DELIVERY_STATUSES = [
        'pending',
        'preparing',
        'ready_for_pickup',
        'shipped',
        'delivered',
        'picked_up',
    ];

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'buyer_id',
        'seller_id',
        'reservable_type',
        'reservable_id',
        'category',
        'quantity',
        'scheduled_at',
        'scheduled_end_at',
        'delivery_method',
        'note',
        'contact_phone',
        'provider_note',
        'admin_note',
        'payment_method',
        'reservation_status',
        'payment_status',
        'delivery_status',
        'delivery_contact_name',
        'delivery_phone',
        'delivery_city',
        'delivery_address',
        'delivery_notes',
        'unit_price',
        'total_price',
        'delivery_fee',
        'invoice_number',
        'invoice_issued_at',
        'approved_at',
        'rejected_at',
        'completed_at',
        'cancelled_at',
        'transaction_snapshot',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'quantity' => 'integer',
            'scheduled_at' => 'datetime',
            'scheduled_end_at' => 'datetime',
            'unit_price' => 'decimal:2',
            'total_price' => 'decimal:2',
            'delivery_fee' => 'decimal:2',
            'invoice_issued_at' => 'datetime',
            'approved_at' => 'datetime',
            'rejected_at' => 'datetime',
            'completed_at' => 'datetime',
            'cancelled_at' => 'datetime',
            'transaction_snapshot' => 'array',
        ];
    }

    protected static function booted(): void
    {
        static::updating(function (Reservation $reservation): void {
            if (
                $reservation->isDirty('transaction_snapshot')
                && $reservation->getOriginal('transaction_snapshot') !== null
            ) {
                throw new \LogicException('Reservation transaction snapshots are immutable.');
            }
        });
    }

    /**
     * Get the buyer who created the reservation.
     */
    public function buyer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'buyer_id');
    }

    /**
     * Get the seller who owns the reserved listing.
     */
    public function seller(): BelongsTo
    {
        return $this->belongsTo(User::class, 'seller_id');
    }

    /**
     * Get the reservable model.
     */
    public function reservable(): MorphTo
    {
        return $this->morphTo()->withTrashed();
    }

    /**
     * Get the reviews linked to the reservation.
     */
    public function reviews(): HasMany
    {
        return $this->hasMany(ReservationReview::class);
    }

    /**
     * Get payments linked to the reservation.
     */
    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }
}
