<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class ReservationReview extends Model
{
    use HasFactory;

    public const STATUS_PUBLISHED = 'published';

    public const STATUS_PENDING_MODERATION = 'pending_moderation';

    public const STATUS_HIDDEN = 'hidden';

    public const STATUS_REPORTED = 'reported';

    public const STATUSES = [
        self::STATUS_PUBLISHED,
        self::STATUS_PENDING_MODERATION,
        self::STATUS_HIDDEN,
        self::STATUS_REPORTED,
    ];

    public const REVIEWABLE_TYPES = [
        Animal::class,
        Product::class,
        ServiceListing::class,
    ];

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'reservation_id',
        'reviewer_id',
        'reviewee_id',
        'reviewable_type',
        'reviewable_id',
        'rating',
        'comment',
        'status',
        'moderated_by',
        'moderated_at',
        'moderation_reason',
    ];

    protected function casts(): array
    {
        return [
            'moderated_at' => 'datetime',
        ];
    }

    /**
     * Get the reservation linked to the review.
     */
    public function reservation(): BelongsTo
    {
        return $this->belongsTo(Reservation::class);
    }

    public function reviewable(): MorphTo
    {
        return $this->morphTo();
    }

    /**
     * Get the author of the review.
     */
    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewer_id');
    }

    /**
     * Get the reviewed user.
     */
    public function reviewee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewee_id');
    }

    public function moderator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'moderated_by');
    }

    public function scopePublished($query)
    {
        return $query->where('status', self::STATUS_PUBLISHED);
    }

    public function scopePubliclyVisible($query)
    {
        return $query->published();
    }

    public static function supportsReviewableType(?string $type): bool
    {
        return in_array($type, self::REVIEWABLE_TYPES, true);
    }
}
