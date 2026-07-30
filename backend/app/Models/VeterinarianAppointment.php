<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class VeterinarianAppointment extends Model
{
    public const ACTIVE_STATUSES = ['pending', 'confirmed'];

    public const STATUSES = ['pending', 'confirmed', 'rejected', 'cancelled', 'completed'];

    protected $fillable = [
        'veterinarian_id', 'availability_slot_id', 'client_id', 'animal_type', 'reason',
        'starts_at', 'ends_at', 'status', 'status_note', 'status_changed_by', 'status_changed_at',
    ];

    protected function casts(): array
    {
        return ['starts_at' => 'datetime', 'ends_at' => 'datetime', 'status_changed_at' => 'datetime'];
    }

    public function veterinarian(): BelongsTo
    {
        return $this->belongsTo(Veterinarian::class);
    }

    public function slot(): BelongsTo
    {
        return $this->belongsTo(VeterinarianAvailabilitySlot::class, 'availability_slot_id');
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(User::class, 'client_id');
    }

    public function review(): HasOne
    {
        return $this->hasOne(VeterinarianAppointmentReview::class);
    }
}
