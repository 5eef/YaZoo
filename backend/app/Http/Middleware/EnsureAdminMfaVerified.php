<?php

namespace App\Http\Middleware;

use App\Services\AdminMfaService;
use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureAdminMfaVerified
{
    public function __construct(private readonly AdminMfaService $mfa) {}

    public function handle(Request $request, Closure $next): Response
    {
        $admin = $request->user();
        abort_unless($admin?->is_admin, 403);

        if ($admin->admin_mfa_confirmed_at === null) {
            if ((bool) config('auth.admin_mfa.enforced')) {
                return $this->required('enrollment_required');
            }

            return $next($request);
        }

        $tokenId = $admin->currentAccessToken()?->getKey();
        $tokenId = is_numeric($tokenId) ? (int) $tokenId : null;
        if (! $this->mfa->hasRecentChallenge($admin, $tokenId)) {
            return $this->required('challenge_required');
        }

        return $next($request);
    }

    private function required(string $reason): JsonResponse
    {
        return response()->json([
            'message' => __('messages.auth.admin_mfa_required'),
            'reason' => $reason,
        ], 423);
    }
}
