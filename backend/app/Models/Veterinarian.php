<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Veterinarian extends Model
{
    use HasFactory, SoftDeletes;

    public const MODERATION_STATUS_PENDING_REVIEW = 'pending_review';

    public const MODERATION_STATUS_ACTIVE = 'active';

    protected $fillable = [
        'user_id',
        'name',
        'clinic_name',
        'description',
        'city',
        'address',
        'phone',
        'whatsapp',
        'email',
        'specialties',
        'working_hours',
        'image_path',
        'latitude',
        'longitude',
        'location_url',
        'is_active',
        'moderation_status',
        'moderation_note',
        'moderated_by',
        'moderated_at',
    ];

    protected function casts(): array
    {
        return [
            'specialties' => 'array',
            'working_hours' => 'array',
            'latitude' => 'decimal:7',
            'longitude' => 'decimal:7',
            'is_active' => 'boolean',
            'moderated_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
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
        return (bool) $this->is_active
            && $this->moderation_status === self::MODERATION_STATUS_ACTIVE;
    }
}
