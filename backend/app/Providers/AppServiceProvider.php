<?php

namespace App\Providers;

use App\Events\UserNotificationCreated;
use App\Notifications\NewMessageNotification;
use App\Support\PhoneNumber;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Notifications\Events\NotificationSent;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        if ($this->app->isProduction() || (bool) config('app.force_https')) {
            URL::forceScheme('https');
        }

        Model::preventLazyLoading(! $this->app->isProduction());

        RateLimiter::for('api', function (Request $request) {
            return Limit::perMinute(120)->by($request->user()?->id ?: $request->ip());
        });

        RateLimiter::for('otp-request', function (Request $request) {
            $phone = PhoneNumber::normalize($request->input('phone'));
            $phoneKey = hash_hmac(
                'sha256',
                ($phone ?? 'invalid').':'.(string) $request->input('intent'),
                (string) config('app.key'),
            );

            return [
                Limit::perMinute(5)->by('otp-ip:'.$request->ip()),
                Limit::perMinute(3)->by('otp-phone:'.$phoneKey),
            ];
        });

        RateLimiter::for('feed-write', function (Request $request) {
            return Limit::perMinute(30)->by($request->user()?->id ?: $request->ip());
        });

        RateLimiter::for('marketplace-write', function (Request $request) {
            return Limit::perMinute(30)->by($request->user()?->id ?: $request->ip());
        });

        RateLimiter::for('professional-verification-submit', function (Request $request) {
            return [
                Limit::perHour(5)->by('professional-verification-user:'.($request->user()?->id ?: 'guest')),
                Limit::perHour(15)->by('professional-verification-ip:'.$request->ip()),
            ];
        });

        RateLimiter::for('messages-write', function (Request $request) {
            return Limit::perMinute(40)->by($request->user()?->id ?: $request->ip());
        });

        RateLimiter::for('stories-write', function (Request $request) {
            return Limit::perMinute(20)->by($request->user()?->id ?: $request->ip());
        });

        RateLimiter::for('reservations-write', function (Request $request) {
            return Limit::perMinute(20)->by($request->user()?->id ?: $request->ip());
        });

        RateLimiter::for('appointments-write', function (Request $request) {
            return Limit::perMinute(12)->by($request->user()?->id ?: $request->ip());
        });

        Event::listen(NotificationSent::class, function (NotificationSent $event): void {
            if (
                $event->channel !== 'database'
                || ! $event->response
                || ! method_exists($event->notifiable, 'unreadNotifications')
            ) {
                return;
            }

            $notification = $event->response->fresh();

            if (! $notification) {
                return;
            }

            event(
                (new UserNotificationCreated(
                    $notification,
                    (int) $event->notifiable->getKey(),
                    (int) $event->notifiable
                        ->unreadNotifications()
                        ->where('type', '!=', NewMessageNotification::class)
                        ->count(),
                ))->dontBroadcastToCurrentUser(),
            );
        });
    }
}
