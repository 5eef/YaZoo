<?php

namespace App\Models;

use App\Models\Concerns\HasMediaAssets;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Product extends Model
{
    use HasFactory, HasMediaAssets, SoftDeletes;

    public const MODERATION_STATUS_PENDING_REVIEW = 'pending_review';

    public const MODERATION_STATUS_ACTIVE = 'active';

    public const CATEGORIES = [
        'food',
        'toy',
        'accessory',
        'hygiene',
        'health',
        'habitat',
        'other',
    ];

    public const LISTING_STATUSES = [
        'available',
        'reserved',
        'sold',
    ];

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'category',
        'description',
        'price',
        'image_url',
        'gallery_urls',
        'location',
        'contact_visibility',
        'contact_phone',
        'contact_email',
        'whatsapp_enabled',
        'stock',
        'listing_status',
        'condition_status',
        'moderation_status',
        'moderation_note',
        'moderated_by',
        'moderated_at',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'gallery_urls' => 'array',
            'price' => 'decimal:2',
            'stock' => 'integer',
            'whatsapp_enabled' => 'boolean',
            'moderated_at' => 'datetime',
        ];
    }

    /**
     * Get the author of the product listing.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the reservations for this product listing.
     */
    public function reservations(): MorphMany
    {
        return $this->morphMany(Reservation::class, 'reservable');
    }

    public function reviews(): MorphMany
    {
        return $this->morphMany(ReservationReview::class, 'reviewable');
    }

    public function favorites(): MorphMany
    {
        return $this->morphMany(Favorite::class, 'favoritable');
    }

    public function isPubliclyVisible(): bool
    {
        return $this->moderation_status === self::MODERATION_STATUS_ACTIVE;
    }
}
