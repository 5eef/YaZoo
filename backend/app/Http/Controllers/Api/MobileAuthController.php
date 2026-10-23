<?php

namespace App\Http\Controllers\Api;

use App\DTOs\Auth\AuthResult;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use Illuminate\Http\JsonResponse;
use Laravel\Sanctum\PersonalAccessToken;

class MobileAuthController extends AuthController
{
    public function login(LoginRequest $request): JsonResponse
    {
        $request->validate(['device_name' => ['required', 'string', 'max:120']]);

        return parent::login($request);
    }

    public function register(RegisterRequest $request): JsonResponse
    {
        $request->validate(['device_name' => ['required', 'string', 'max:120']]);

        return parent::register($request);
    }

    protected function authResponse(AuthResult $result, string $message, int $statusCode = 200): JsonResponse
    {
        $expiresAt = now()->addMinutes(max(1, (int) config('sanctum.expiration', 10080)));
        PersonalAccessToken::findToken($result->plainTextToken)?->forceFill(['expires_at' => $expiresAt])->save();

        return response()->json([
            'message' => $message,
            'user' => $this->auth->userPayload($result->user),
            'token' => $result->plainTextToken,
            'token_type' => 'Bearer',
            'expires_at' => $expiresAt->toISOString(),
        ], $statusCode)->header('Cache-Control', 'no-store');
    }
}
