<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphMany;

class Animal extends Model
{
    use HasFactory;

    public const CATEGORIES = [
        'dog',
        'cat',
        'bird',
        'fish',
        'rabbit',
        'reptile',
        'other',
    ];

    public const LISTING_STATUSES = [
        'available',
        'reserved',
        'adopted',
        'sold',
    ];

    public const SELLER_TYPES = [
        'individual',
        'professional',
        'association',
    ];

    public const LEGAL_STATUSES = [
        'draft',
        'pending_review',
        'approved',
        'rejected',
        'suspended',
    ];

    public const LEGAL_STATUS_PENDING_REVIEW = 'pending_review';

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'category',
        'type',
        'breed',
        'age',
        'sex',
        'location',
        'photo_url',
        'gallery_urls',
        'price',
        'is_for_adoption',
        'listing_status',
        'description',
        'contact_visibility',
        'contact_phone',
        'contact_email',
        'whatsapp_enabled',
        'accepts_animal_rules',
        'seller_type',
        'origin',
        'identification_number',
        'health_certificate_path',
        'vaccination_book_path',
        'onssa_authorization_number',
        'legal_status',
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
            'age' => 'integer',
            'gallery_urls' => 'array',
            'price' => 'decimal:2',
            'is_for_adoption' => 'boolean',
            'accepts_animal_rules' => 'boolean',
            'whatsapp_enabled' => 'boolean',
            'moderated_at' => 'datetime',
        ];
    }

    /**
     * Get the author of the animal listing.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the reservations for this animal listing.
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
        return $this->legal_status === 'approved';
    }
}
