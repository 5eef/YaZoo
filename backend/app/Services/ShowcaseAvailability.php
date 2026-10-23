<?php

namespace App\Services;

use App\Models\Veterinarian;
use App\Models\VeterinarianAppointment;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class ShowcaseAvailability
{
    public const EMAILS = ['veterinaire.agadir@yazoo.test', 'veterinaire.oujda@yazoo.test', 'veterinaire.tanger@yazoo.test'];

    public function refresh(): int
    {
        if (! config('operations.showcase_bootstrap_enabled') || config('operations.deployment_profile') !== 'showcase') {
            throw new RuntimeException('Showcase availability is disabled.');
        }

        return DB::transaction(function (): int {
            // Same parent-row mutex as professional slot creation. No cache TTL
            // can expire during generation and permit a second writer.
            $vets = Veterinarian::query()->whereHas('user', fn ($query) => $query
                ->whereIn('email', self::EMAILS)->where('is_admin', false))
                ->with('user')->orderBy('id')->lockForUpdate()->get();
            if ($vets->count() !== 3 || $vets->contains(fn ($vet) => ! str_contains($vet->name, 'DEMO') || ! str_contains($vet->description, 'fictif'))) {
                throw new RuntimeException('Authorized fictitious AFWAJ profiles are required.');
            }
            $created = 0;
            foreach ($vets as $vet) {
                if (! $vet->isPubliclyVisible()) {
                    continue;
                }
                for ($day = 1; $day <= 14; $day++) {
                    $date = now('Africa/Casablanca')->startOfDay()->addDays($day);
                    if ($date->isSunday()) {
                        continue;
                    }
                    foreach ([9, 10, 11] as $hour) {
                        $start = $date->copy()->setTime($hour, 0)->setTimezone(config('app.timezone'));
                        $end = $start->copy()->addMinutes(30);
                        $overlap = $vet->availabilitySlots()->where('starts_at', '<', $end)->where('ends_at', '>', $start)->exists();
                        $booked = $vet->appointments()->whereIn('status', VeterinarianAppointment::ACTIVE_STATUSES)
                            ->where('starts_at', '<', $end)->where('ends_at', '>', $start)->exists();
                        if (! $overlap && ! $booked) {
                            $vet->availabilitySlots()->create(['starts_at' => $start, 'ends_at' => $end, 'is_available' => true]);
                            $created++;
                        }
                    }
                }
            }

            return $created;
        }, 3);
    }
}
