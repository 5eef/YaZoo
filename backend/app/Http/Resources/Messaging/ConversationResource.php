<?php

namespace App\Http\Resources\Messaging;

use App\Models\Conversation;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Conversation
 */
class ConversationResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $participant = $this->otherParticipantFor($request->user()?->id ?? 0);

        return [
            'id' => $this->id,
            'participant' => [
                'id' => $participant?->id,
                'name' => $participant?->name,
                'username' => $participant?->name ? str($participant->name)->lower()->replace(' ', '')->toString() : null,
                'isPhoneVerified' => $participant?->hasVerifiedPhone() ?? false,
                'avatar' => $participant?->avatar,
                'city' => $participant?->city,
                'country' => $participant?->country,
                'profile_url' => $participant ? "/profile/{$participant->id}" : null,
                'is_following' => (bool) ($participant?->is_followed_by_viewer ?? false),
            ],
            'latestMessage' => $this->whenLoaded('latestMessage', function (): ?array {
                return $this->latestMessage
                    ? MessageResource::make($this->latestMessage)->resolve()
                    : null;
            }),
            'latest_message' => $this->whenLoaded('latestMessage', function (): ?array {
                return $this->latestMessage
                    ? MessageResource::make($this->latestMessage)->resolve()
                    : null;
            }),
            'messages' => MessageResource::collection($this->whenLoaded('messages')),
            'unreadCount' => $this->unread_messages_count ?? 0,
            'unread_count' => $this->unread_messages_count ?? 0,
            'createdAt' => $this->created_at?->toISOString(),
            'updatedAt' => $this->updated_at?->toISOString(),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
