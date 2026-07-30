<?php

namespace App\Policies;

use App\Models\User;
use App\Models\VeterinarianAppointment;

class VeterinarianAppointmentPolicy
{
    public function view(User $user, VeterinarianAppointment $appointment): bool
    {
        return $user->is_admin
            || $user->id === $appointment->client_id
            || $user->id === $appointment->veterinarian->user_id;
    }

    public function update(User $user, VeterinarianAppointment $appointment): bool
    {
        return $this->view($user, $appointment);
    }

    public function review(User $user, VeterinarianAppointment $appointment): bool
    {
        return $user->id === $appointment->client_id
            && $appointment->status === 'completed'
            && ! $appointment->review()->exists();
    }
}
