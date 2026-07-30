<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VeterinarianAppointmentReview extends Model
{
    protected $fillable = ['veterinarian_appointment_id', 'client_id', 'rating', 'comment'];

    public function appointment(): BelongsTo
    {
        return $this->belongsTo(VeterinarianAppointment::class, 'veterinarian_appointment_id');
    }
}
