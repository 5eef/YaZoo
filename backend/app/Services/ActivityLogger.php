<?php

namespace App\Services;

use App\Models\ActivityLog;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class ActivityLogger
{
    /**
     * @param  array<string, mixed>  $metadata
     */
    public function log(
        string $action,
        string $category,
        ?Model $subject = null,
        array $metadata = [],
        ?User $actor = null,
        ?User $user = null,
        ?Request $request = null,
    ): ActivityLog {
        return ActivityLog::query()->create([
            'user_id' => $user?->id ?? $actor?->id,
            'actor_id' => $actor?->id,
            'subject_type' => $subject?->getMorphClass(),
            'subject_id' => $subject?->getKey(),
            'action' => $action,
            'category' => $category,
            'description' => $metadata['description'] ?? null,
            'metadata' => $this->sanitizeMetadata($metadata),
            'ip_address' => $request?->ip(),
            'user_agent' => $request?->userAgent(),
            'created_at' => now(),
        ]);
    }

    /**
     * @param  array<string, mixed>  $metadata
     * @return array<string, mixed>
     */
    protected function sanitizeMetadata(array $metadata): array
    {
        foreach ($metadata as $key => $value) {
            if (in_array(strtolower((string) $key), ['password', 'password_confirmation', 'token', 'access_token', 'refresh_token', 'authorization', 'cookie', 'secret', 'otp_code', 'client_secret', 'store_key', 'mongodb_uri'], true)) {
                unset($metadata[$key]);
            } elseif (is_array($value)) {
                $metadata[$key] = $this->sanitizeMetadata($value);
            }
        }

        return $metadata;
    }
}
