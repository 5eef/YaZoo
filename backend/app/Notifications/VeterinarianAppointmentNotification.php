<?php

namespace App\Notifications;

use App\Models\VeterinarianAppointment;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;

class VeterinarianAppointmentNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        private readonly VeterinarianAppointment $appointment,
        private readonly string $event,
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toDatabase(object $notifiable): array
    {
        return [
            'kind' => 'veterinarian_appointment',
            'title' => 'Rendez-vous veterinaire',
            'body' => "Mise a jour du rendez-vous : {$this->event}.",
            'action_url' => '/veterinarian-appointments',
            'meta' => [
                'appointment_id' => $this->appointment->id,
                'status' => $this->appointment->status,
                'starts_at' => $this->appointment->starts_at?->toISOString(),
            ],
        ];
    }
}
