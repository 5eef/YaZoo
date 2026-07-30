<?php

namespace App\Services\Admin;

use App\Models\ActivityLog;
use App\Models\Animal;
use App\Models\DataDeletionRequest;
use App\Models\Product;
use App\Models\ProfessionalVerification;
use App\Models\Report;
use App\Models\Reservation;
use App\Models\ReservationReview;
use App\Models\ServiceListing;
use App\Models\User;
use App\Models\Veterinarian;
use App\Models\VeterinarianAppointment;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;

class BusinessKpiService
{
    /** @return array<string, int|float|string|null> */
    public function get(int $days): array
    {
        return Cache::remember("admin:business-kpis:v2:{$days}", now()->addMinutes(5), function () use ($days): array {
            $since = now()->subDays($days);
            $listings = $this->listingMetrics($since);
            $durations = $this->moderationDurations($since);

            return [
                'period_days' => $days,
                'users_registered' => User::query()->where('created_at', '>=', $since)->count(),
                'active_users_7_days' => $this->activeUsers(now()->subDays(7)),
                'active_users_30_days' => $this->activeUsers(now()->subDays(30)),
                'professionals_submitted' => ProfessionalVerification::query()->where('created_at', '>=', $since)->count(),
                'professionals_approved' => ProfessionalVerification::query()->where('created_at', '>=', $since)->where('status', 'approved')->count(),
                'professionals_rejected' => ProfessionalVerification::query()->where('created_at', '>=', $since)->where('status', 'rejected')->count(),
                'professionals_expired' => ProfessionalVerification::query()
                    ->where('created_at', '>=', $since)
                    ->where(fn ($query) => $query->where('status', 'expired')->orWhere('document_expires_at', '<', now()->toDateString()))
                    ->count(),
                ...$listings,
                'moderation_average_hours' => $durations === [] ? null : round(array_sum($durations) / count($durations), 2),
                'moderation_median_hours' => $this->median($durations),
                'reservations_created' => Reservation::query()->where('created_at', '>=', $since)->count(),
                'reservations_approved' => Reservation::query()->where('created_at', '>=', $since)->where('reservation_status', 'approved')->count(),
                'reservations_completed' => Reservation::query()->where('created_at', '>=', $since)->where('reservation_status', 'completed')->count(),
                'reservations_cancelled' => Reservation::query()->where('created_at', '>=', $since)->where('reservation_status', 'cancelled')->count(),
                'completed_reservation_gmv_mad' => (float) Reservation::query()
                    ->where('created_at', '>=', $since)
                    ->where('reservation_status', 'completed')
                    ->sum('total_price'),
                'active_sellers' => Reservation::query()->where('created_at', '>=', $since)->distinct()->count('seller_id'),
                'active_buyers' => Reservation::query()->where('created_at', '>=', $since)->distinct()->count('buyer_id'),
                'average_published_review' => ($average = ReservationReview::query()
                    ->where('created_at', '>=', $since)
                    ->where('status', ReservationReview::STATUS_PUBLISHED)
                    ->avg('rating')) === null ? null : round((float) $average, 2),
                'pending_reports' => Report::query()->where('status', 'pending')->count(),
                'pending_deletion_requests' => DataDeletionRequest::query()->where('status', 'pending')->count(),
                ...$this->appointmentMetrics($since),
                'revenue_yazoo' => 'not_measured',
            ];
        });
    }

    private function activeUsers(Carbon $since): int
    {
        return ActivityLog::query()
            ->where('created_at', '>=', $since)
            ->whereNotNull('actor_id')
            ->distinct()
            ->count('actor_id');
    }

    /** @return array<string, int> */
    private function listingMetrics(Carbon $since): array
    {
        $submitted = $approved = $rejected = $pending = 0;
        foreach ([
            [Animal::class, 'legal_status', 'approved'],
            [Product::class, 'moderation_status', 'active'],
            [ServiceListing::class, 'moderation_status', 'active'],
            [Veterinarian::class, 'moderation_status', 'active'],
        ] as [$model, $column, $approvedValue]) {
            /** @var Model $model */
            $base = $model::query()->where('created_at', '>=', $since);
            $submitted += (clone $base)->count();
            $approved += (clone $base)->where($column, $approvedValue)->count();
            $rejected += (clone $base)->where($column, 'rejected')->count();
            $pending += (clone $base)->where($column, 'pending_review')->count();
        }

        return [
            'listings_submitted' => $submitted,
            'listings_approved' => $approved,
            'listings_rejected' => $rejected,
            'listings_pending' => $pending,
        ];
    }

    /** @return list<float> */
    private function moderationDurations(Carbon $since): array
    {
        $hours = [];
        foreach ([
            [Animal::class, 'legal_status'],
            [Product::class, 'moderation_status'],
            [ServiceListing::class, 'moderation_status'],
            [Veterinarian::class, 'moderation_status'],
        ] as [$model]) {
            foreach ($model::query()->where('created_at', '>=', $since)->whereNotNull('moderated_at')->get(['created_at', 'moderated_at']) as $item) {
                $hours[] = round($item->created_at->diffInSeconds($item->moderated_at) / 3600, 4);
            }
        }

        sort($hours);

        return $hours;
    }

    private function median(array $values): ?float
    {
        $count = count($values);
        if ($count === 0) {
            return null;
        }
        $middle = intdiv($count, 2);

        return round($count % 2 === 1 ? $values[$middle] : ($values[$middle - 1] + $values[$middle]) / 2, 2);
    }

    /** @return array<string, int> */
    private function appointmentMetrics(Carbon $since): array
    {
        $base = VeterinarianAppointment::query()->where('created_at', '>=', $since);

        return [
            'appointments_created' => (clone $base)->count(),
            'appointments_pending' => (clone $base)->where('status', 'pending')->count(),
            'appointments_confirmed' => (clone $base)->where('status', 'confirmed')->count(),
            'appointments_completed' => (clone $base)->where('status', 'completed')->count(),
            'appointments_cancelled' => (clone $base)->where('status', 'cancelled')->count(),
        ];
    }
}
