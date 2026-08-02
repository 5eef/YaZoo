<?php

namespace App\Http\Resources;

use App\Models\User;
use App\Support\MediaStorage;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin User
 */
class UserResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $canViewPrivateDetails = $request->user()?->is($this->resource)
            || (bool) $request->user()?->is_admin;

        return [
            'id' => $this->id,
            'name' => $this->name,
            'username' => $this->name ? str($this->name)->lower()->replace(' ', '')->toString() : null,
            'email' => $canViewPrivateDetails ? $this->publicEmail() : null,
            'phone' => $canViewPrivateDetails ? $this->phone : null,
            'country' => $this->country,
            'city' => $this->city,
            'bio' => $this->bio,
            'avatar' => MediaStorage::resolveUrl($this->avatar),
            'coverPhoto' => MediaStorage::resolveUrl($this->cover_photo),
            'isAdmin' => (bool) $this->is_admin,
            'isSuspended' => (bool) $this->is_suspended,
            'isBanned' => $this->banned_at !== null,
            'suspendedAt' => $this->suspended_at?->toISOString(),
            'bannedAt' => $this->banned_at?->toISOString(),
            'suspendedReason' => $canViewPrivateDetails ? $this->suspended_reason : null,
            'bannedReason' => $canViewPrivateDetails ? $this->banned_reason : null,
            'isPhoneVerified' => $this->hasVerifiedPhone(),
            'isFollowing' => (bool) ($this->is_followed_by_viewer ?? false),
            'followersCount' => $this->followers_count ?? 0,
            'followingCount' => $this->following_count ?? 0,
            'profileUrl' => "/profile/{$this->id}",
            'preferredLocale' => $this->preferred_locale ?? 'fr',
            'createdAt' => $this->created_at?->toISOString(),
            'updatedAt' => $this->updated_at?->toISOString(),
        ];
    }
}
