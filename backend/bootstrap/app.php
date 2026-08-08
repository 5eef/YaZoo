<?php

use App\Http\Controllers\HealthController;
use App\Http\Middleware\EnsureAccountCanMutate;
use App\Http\Middleware\EnsureAdminMfaVerified;
use App\Http\Middleware\EnsureCookieAuthenticatedMutationsAreCsrfProtected;
use App\Http\Middleware\EnsureUserIsAdmin;
use App\Http\Middleware\EnsureUserIsNotSuspended;
use App\Http\Middleware\ForceHttps;
use App\Http\Middleware\ForceJsonResponse;
use App\Http\Middleware\SecurityHeaders;
use App\Http\Middleware\UseSanctumTokenFromCookie;
use App\Support\OperationsSchedule;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Contracts\Auth\Middleware\AuthenticatesRequests;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request as HttpRequest;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Route;

return Application::configure(basePath: dirname(__DIR__))
    ->withCommands()
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
        then: function (): void {
            Route::get('/health', [HealthController::class, 'live']);
            Route::get('/health/live', [HealthController::class, 'live']);
            Route::get('/health/ready', [HealthController::class, 'ready']);
        },
    )
    ->withBroadcasting(__DIR__.'/../routes/channels.php', [
        'middleware' => [
            UseSanctumTokenFromCookie::class,
            'auth:sanctum',
        ],
    ])
    ->withMiddleware(function (Middleware $middleware) {
        $trustedProxies = array_values(array_filter(array_map(
            'trim',
            explode(',', (string) env('TRUSTED_PROXIES', ''))
        )));

        if (in_array('*', $trustedProxies, true)) {
            Log::warning('TRUSTED_PROXIES=* is unsafe and has been ignored. Configure explicit proxy addresses or CIDR ranges.');
            $trustedProxies = array_values(array_filter(
                $trustedProxies,
                fn (string $proxy): bool => $proxy !== '*',
            ));
        }

        if ($trustedProxies !== []) {
            $middleware->trustProxies(
                at: count($trustedProxies) === 1 ? $trustedProxies[0] : $trustedProxies,
                headers: HttpRequest::HEADER_X_FORWARDED_FOR
                    | HttpRequest::HEADER_X_FORWARDED_HOST
                    | HttpRequest::HEADER_X_FORWARDED_PORT
                    | HttpRequest::HEADER_X_FORWARDED_PROTO
                    | HttpRequest::HEADER_X_FORWARDED_PREFIX
                    | HttpRequest::HEADER_X_FORWARDED_AWS_ELB,
            );
        }

        $middleware->append(ForceHttps::class);
        $middleware->append(SecurityHeaders::class);

        $middleware->prependToPriorityList(
            AuthenticatesRequests::class,
            ForceJsonResponse::class,
        );

        $middleware->prependToPriorityList(
            AuthenticatesRequests::class,
            UseSanctumTokenFromCookie::class,
        );

        $middleware->alias([
            'admin' => EnsureUserIsAdmin::class,
            'admin_mfa' => EnsureAdminMfaVerified::class,
            'active_mutation' => EnsureAccountCanMutate::class,
            'cookie_csrf' => EnsureCookieAuthenticatedMutationsAreCsrfProtected::class,
            'not_suspended' => EnsureUserIsNotSuspended::class,
        ]);
    })
    ->withSchedule(function (Schedule $schedule): void {
        OperationsSchedule::register($schedule);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        $exceptions->context(fn (): array => [
            'broadcast_connection' => config('broadcasting.default'),
            'media_driver' => config('media.driver'),
        ]);

        $exceptions->render(function (AuthenticationException $exception, $request) {
            if ($request->is('api/*')) {
                return response()->json([
                    'message' => 'Unauthenticated.',
                ], 401);
            }
        });

        $exceptions->report(function (Throwable $exception): void {
            Log::channel((string) config('logging.monitoring_channel', 'observability'))
                ->error($exception->getMessage(), [
                    'exception' => $exception::class,
                    'file' => $exception->getFile(),
                    'line' => $exception->getLine(),
                    'trace' => $exception->getTraceAsString(),
                ]);
        });
    })->create();
