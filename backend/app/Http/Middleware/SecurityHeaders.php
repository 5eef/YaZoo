<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class SecurityHeaders
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        $headers = [
            'X-Content-Type-Options' => 'nosniff',
            'X-Frame-Options' => 'DENY',
            'X-XSS-Protection' => '0',
            'Referrer-Policy' => 'strict-origin-when-cross-origin',
            'Permissions-Policy' => 'camera=(), microphone=(), geolocation=(self)',
            'Cross-Origin-Opener-Policy' => 'same-origin',
            'Cross-Origin-Resource-Policy' => 'same-site',
            'Content-Security-Policy' => "default-src 'self'; frame-ancestors 'none'; base-uri 'self'; object-src 'none'; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'self' https: wss:; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self' data:",
        ];

        $isAzureHttpsRequest = filled(config('app.azure_instance_id'))
            && strtolower((string) $request->headers->get('X-AppService-Proto')) === 'https';

        if ($request->isSecure() || $isAzureHttpsRequest) {
            $headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains; preload';
        }

        foreach ($headers as $name => $value) {
            $response->headers->set($name, $value);
        }

        return $response;
    }
}
