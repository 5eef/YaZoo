<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;
use Throwable;

class CountPilotConversions
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);
        if (! config('features.pilot_metrics') || $response->getStatusCode() >= 300) {
            return $response;
        }
        $route = $request->method().' '.($request->route()?->uri() ?? '');
        $event = match ($route) {
            'GET api/veterinarians', 'GET api/services', 'GET api/marketplace/public/{section}' => 'professional_discovery',
            'GET api/veterinarians/{veterinarian}', 'GET api/services/{service}', 'GET api/marketplace/public/{section}/{listing}' => 'professional_profile_view',
            'POST api/veterinarians/{veterinarian}/appointments' => 'appointment_requested',
            'POST api/reservations' => 'reservation_requested',
            'POST api/auth/register', 'POST api/auth/mobile/register' => 'account_registered',
            'POST api/professional-verifications' => 'professional_application',
            'POST api/conversations/direct', 'POST api/conversations' => $response->getStatusCode() === 201 ? 'conversation_started' : null,
            'POST api/veterinarian-appointments/{appointment}/review' => 'appointment_review_published',
            'PATCH api/veterinarian-appointments/{appointment}/status' => in_array($request->input('status'), ['confirmed', 'rejected', 'completed', 'cancelled'], true) ? 'appointment_'.$request->input('status') : null,
            default => null,
        };
        // Public marketplace counters include only the care wedge.
        if (str_contains($route, '{section}') && ! in_array($request->route('section'), ['veterinarians', 'services'], true)) {
            $event = null;
        }
        if ($event !== null) {
            try {
                DB::transaction(function () use ($event): void {
                    $key = ['day' => now()->toDateString(), 'event' => $event];
                    DB::table('pilot_daily_counters')->insertOrIgnore([...$key, 'count' => 0]);
                    DB::table('pilot_daily_counters')->where($key)->increment('count');
                }, 3);
            } catch (Throwable) {
                // No request data, identifier, IP, token or exception payload.
                Log::warning('pilot.metrics_write_failed');
            }
        }

        return $response;
    }
}
