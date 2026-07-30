<?php

namespace App\Http\Resources;

use App\Models\VeterinarianAppointment;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class VeterinarianAppointmentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'veterinarianId' => $this->veterinarian_id,
            'veterinarianName' => $this->veterinarian?->name,
            'client' => $this->when(
                $request->user()?->is_admin || $request->user()?->id === $this->veterinarian?->user_id,
                fn (): array => ['id' => $this->client?->id, 'name' => $this->client?->name],
            ),
            'animalType' => $this->animal_type,
            'reason' => $this->reason,
            'startsAt' => $this->starts_at?->toISOString(),
            'endsAt' => $this->ends_at?->toISOString(),
            'status' => $this->status,
            'statusNote' => $this->status_note,
            'canManage' => (bool) ($request->user()?->is_admin || $request->user()?->id === $this->veterinarian?->user_id),
            'canCancel' => in_array($this->status, VeterinarianAppointment::ACTIVE_STATUSES, true),
            'canReview' => $this->status === 'completed'
                && $request->user()?->id === $this->client_id
                && $this->review === null,
            'review' => $this->whenLoaded('review', fn () => $this->review ? [
                'rating' => $this->review->rating,
                'comment' => $this->review->comment,
            ] : null),
        ];
    }
}
