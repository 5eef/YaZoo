<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RejectDisabledShowcaseUploads
{
    public function handle(Request $request, Closure $next): Response
    {
        if (
            config('operations.deployment_profile') === 'showcase'
            && ! (bool) config('operations.showcase_uploads_enabled')
            && $request->allFiles() !== []
        ) {
            return new JsonResponse([
                'error' => 'showcase.uploads_disabled',
                'message' => 'Demo mode: persistent user uploads are disabled on ephemeral storage.',
            ], 409);
        }

        return $next($request);
    }
}
