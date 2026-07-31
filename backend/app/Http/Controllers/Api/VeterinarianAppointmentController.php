<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Veterinarian\StoreAppointmentRequest;
use App\Http\Requests\Veterinarian\StoreAvailabilitySlotRequest;
use App\Http\Requests\Veterinarian\UpdateAppointmentStatusRequest;
use App\Http\Resources\VeterinarianAppointmentResource;
use App\Models\Veterinarian;
use App\Models\VeterinarianAppointment;
use App\Models\VeterinarianAvailabilitySlot;
use App\Notifications\VeterinarianAppointmentNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class VeterinarianAppointmentController extends Controller
{
    public function availability(Request $request, Veterinarian $veterinarian): JsonResponse
    {
        abort_unless($veterinarian->isPubliclyVisible() || $request->user()->id === $veterinarian->user_id || $request->user()->is_admin, 404);

        $slots = $veterinarian->availabilitySlots()
            ->where('is_available', true)
            ->where('starts_at', '>', now())
            ->whereDoesntHave('appointments', fn ($query) => $query->whereIn('status', VeterinarianAppointment::ACTIVE_STATUSES))
            ->orderBy('starts_at')
            ->limit(100)
            ->get()
            ->map(fn (VeterinarianAvailabilitySlot $slot): array => [
                'id' => $slot->id,
                'startsAt' => $slot->starts_at->toISOString(),
                'endsAt' => $slot->ends_at->toISOString(),
            ]);

        return response()->json(['data' => $slots]);
    }

    public function storeAvailability(StoreAvailabilitySlotRequest $request, Veterinarian $veterinarian): JsonResponse
    {
        abort_unless($request->user()->id === $veterinarian->user_id || $request->user()->is_admin, 403);
        $data = $request->validated();
        $startsAt = Carbon::parse($data['starts_at']);
        $endsAt = Carbon::parse($data['ends_at']);

        $slot = DB::transaction(function () use ($veterinarian, $startsAt, $endsAt): VeterinarianAvailabilitySlot {
            // The veterinarian row is the mutex: concurrent slot creations for
            // the same calendar are serialized before the overlap check.
            $lockedVeterinarian = Veterinarian::query()
                ->whereKey($veterinarian->id)
                ->lockForUpdate()
                ->firstOrFail();

            $overlaps = $lockedVeterinarian->availabilitySlots()
                ->where('starts_at', '<', $endsAt)
                ->where('ends_at', '>', $startsAt)
                ->exists();

            if ($overlaps) {
                throw ValidationException::withMessages(['starts_at' => __('messages.appointments.slot_overlap')]);
            }

            return $lockedVeterinarian->availabilitySlots()->create([
                'starts_at' => $startsAt,
                'ends_at' => $endsAt,
            ]);
        }, 3);

        return response()->json(['data' => [
            'id' => $slot->id,
            'startsAt' => $slot->starts_at->toISOString(),
            'endsAt' => $slot->ends_at->toISOString(),
        ]], 201);
    }

    public function destroyAvailability(Request $request, VeterinarianAvailabilitySlot $slot): JsonResponse
    {
        abort_unless($request->user()->id === $slot->veterinarian->user_id || $request->user()->is_admin, 403);
        abort_if($slot->appointments()->whereIn('status', VeterinarianAppointment::ACTIVE_STATUSES)->exists(), 422);
        $slot->delete();

        return response()->json(status: 204);
    }

    public function index(Request $request)
    {
        $query = VeterinarianAppointment::query()
            ->with(['veterinarian:id,user_id,name,clinic_name', 'client:id,name', 'review'])
            ->where(function ($inner) use ($request): void {
                $inner->where('client_id', $request->user()->id)
                    ->orWhereHas('veterinarian', fn ($vet) => $vet->where('user_id', $request->user()->id));
                if ($request->user()->is_admin) {
                    $inner->orWhereNotNull('id');
                }
            })
            ->when($request->filled('status'), fn ($inner) => $inner->where('status', $request->string('status')))
            ->orderByDesc('starts_at');

        return VeterinarianAppointmentResource::collection($query->paginate(20));
    }

    public function store(StoreAppointmentRequest $request, Veterinarian $veterinarian): VeterinarianAppointmentResource
    {
        abort_unless($veterinarian->isPubliclyVisible(), 404);
        abort_if($veterinarian->user_id === $request->user()->id, 422);
        $data = $request->validated();

        $appointment = DB::transaction(function () use ($data, $request, $veterinarian): VeterinarianAppointment {
            $slot = VeterinarianAvailabilitySlot::query()
                ->whereKey($data['availability_slot_id'])
                ->where('veterinarian_id', $veterinarian->id)
                ->where('is_available', true)
                ->lockForUpdate()
                ->firstOrFail();

            if ($slot->starts_at->isPast()) {
                throw ValidationException::withMessages(['availability_slot_id' => __('messages.appointments.slot_unavailable')]);
            }

            $conflict = VeterinarianAppointment::query()
                ->whereIn('status', VeterinarianAppointment::ACTIVE_STATUSES)
                ->where('starts_at', '<', $slot->ends_at)
                ->where('ends_at', '>', $slot->starts_at)
                ->where(fn ($query) => $query
                    ->where('veterinarian_id', $veterinarian->id)
                    ->orWhere('client_id', $request->user()->id))
                ->lockForUpdate()
                ->exists();
            if ($conflict) {
                throw ValidationException::withMessages(['availability_slot_id' => __('messages.appointments.slot_unavailable')]);
            }

            return VeterinarianAppointment::query()->create([
                'veterinarian_id' => $veterinarian->id,
                'availability_slot_id' => $slot->id,
                'client_id' => $request->user()->id,
                'animal_type' => $data['animal_type'],
                'reason' => $data['reason'],
                'starts_at' => $slot->starts_at,
                'ends_at' => $slot->ends_at,
                'status' => 'pending',
            ]);
        });

        $veterinarian->user->notify(new VeterinarianAppointmentNotification($appointment, 'requested'));

        return VeterinarianAppointmentResource::make($appointment->load(['veterinarian', 'client', 'review']));
    }

    public function updateStatus(UpdateAppointmentStatusRequest $request, VeterinarianAppointment $appointment): VeterinarianAppointmentResource
    {
        $appointment->load('veterinarian');
        $this->authorize('update', $appointment);
        $next = $request->validated('status');
        $isVet = $request->user()->is_admin || $request->user()->id === $appointment->veterinarian->user_id;
        $allowed = match ($next) {
            'confirmed', 'rejected' => $isVet && $appointment->status === 'pending',
            'completed' => $isVet && $appointment->status === 'confirmed' && $appointment->ends_at->isPast(),
            'cancelled' => in_array($appointment->status, VeterinarianAppointment::ACTIVE_STATUSES, true)
                && ($isVet || $request->user()->id === $appointment->client_id),
            default => false,
        };
        abort_unless($allowed, 422);

        $appointment->update([
            'status' => $next,
            'status_note' => $request->validated('note'),
            'status_changed_by' => $request->user()->id,
            'status_changed_at' => now(),
        ]);

        $recipient = $isVet ? $appointment->client : $appointment->veterinarian->user;
        $recipient->notify(new VeterinarianAppointmentNotification($appointment, $next));

        return VeterinarianAppointmentResource::make($appointment->load(['veterinarian', 'client', 'review']));
    }

    public function review(Request $request, VeterinarianAppointment $appointment): JsonResponse
    {
        $this->authorize('review', $appointment);
        $data = $request->validate([
            'rating' => ['required', 'integer', 'between:1,5'],
            'comment' => ['nullable', 'string', 'max:1000'],
        ]);
        $review = $appointment->review()->create([...$data, 'client_id' => $request->user()->id]);

        return response()->json(['data' => $review], 201);
    }
}
