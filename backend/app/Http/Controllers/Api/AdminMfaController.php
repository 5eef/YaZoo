<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\AdminMfaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AdminMfaController extends Controller
{
    public function __construct(private readonly AdminMfaService $mfa) {}

    public function status(Request $request): JsonResponse
    {
        return response()->json([
            'enabled' => $request->user()->admin_mfa_confirmed_at !== null,
            'enforced' => (bool) config('auth.admin_mfa.enforced'),
            'recovery_codes_remaining' => count($request->user()->admin_mfa_recovery_codes ?? []),
        ]);
    }

    public function enroll(Request $request): JsonResponse
    {
        $validated = $request->validate(['password' => ['required', 'string']]);
        $this->validatePassword($request, $validated['password']);

        return response()->json($this->mfa->enroll($request->user()));
    }

    public function confirm(Request $request): JsonResponse
    {
        $validated = $request->validate(['code' => ['required', 'string', 'max:32']]);
        $this->mfa->confirm($request->user(), $validated['code']);

        return response()->json(['message' => __('messages.auth.admin_mfa_enabled')]);
    }

    public function challenge(Request $request): JsonResponse
    {
        $validated = $request->validate(['code' => ['required', 'string', 'max:32']]);
        $this->mfa->challenge($request->user(), $validated['code'], $this->tokenId($request));

        return response()->json(['message' => __('messages.auth.admin_mfa_verified')]);
    }

    public function regenerateRecoveryCodes(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'password' => ['required', 'string'],
            'code' => ['required', 'string', 'max:32'],
        ]);
        $this->validatePassword($request, $validated['password']);

        return response()->json([
            'recovery_codes' => $this->mfa->regenerateRecoveryCodes($request->user(), $validated['code']),
        ]);
    }

    public function disable(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'password' => ['required', 'string'],
            'code' => ['required', 'string', 'max:32'],
        ]);
        $this->validatePassword($request, $validated['password']);
        $this->mfa->disable($request->user(), $validated['code'], $this->tokenId($request));

        return response()->json(['message' => __('messages.auth.admin_mfa_disabled')]);
    }

    private function validatePassword(Request $request, string $password): void
    {
        abort_unless(Hash::check($password, (string) $request->user()->password), 422, __('messages.auth.invalid_password'));
    }

    private function tokenId(Request $request): ?int
    {
        $id = $request->user()->currentAccessToken()?->getKey();

        return is_numeric($id) ? (int) $id : null;
    }
}
