<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureFeatureEnabled
{
    public function handle(Request $request, Closure $next): Response
    {
        $segment = $request->segment(2);
        $feature = match ($segment) {
            'products' => 'product_marketplace',
            'communities' => 'communities',
            'posts', 'stories', 'comments' => 'social_feed',
            default => null,
        };
        if ($feature !== null) {
            abort_unless(config('features.'.$feature), 404);
        }

        return $next($request);
    }
}
