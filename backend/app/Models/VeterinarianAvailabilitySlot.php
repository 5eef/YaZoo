<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class VeterinarianAvailabilitySlot extends Model
{
    protected $fillable = ['veterinarian_id', 'starts_at', 'ends_at', 'is_available'];

    protected function casts(): array
    {
        return ['starts_at' => 'datetime', 'ends_at' => 'datetime', 'is_available' => 'boolean'];
    }

    public function veterinarian(): BelongsTo
    {
        return $this->belongsTo(Veterinarian::class);
    }

    public function appointments(): HasMany
    {
        return $this->hasMany(VeterinarianAppointment::class, 'availability_slot_id');
    }
}
