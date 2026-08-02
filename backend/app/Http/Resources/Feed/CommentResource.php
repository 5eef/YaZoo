<?php

namespace App\Http\Resources\Feed;

use App\Models\Comment;
use App\Support\MediaStorage;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Comment
 */
class CommentResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'body' => $this->body,
            'parentId' => $this->parent_id,
            'reaction' => $this->reaction,
            'createdAt' => $this->created_at?->toISOString(),
            'author' => [
                'id' => $this->user?->id,
                'name' => $this->user?->name,
                'avatar' => MediaStorage::resolveUrl($this->user?->avatar),
                'city' => $this->user?->city,
                'country' => $this->user?->country,
            ],
            'replies' => CommentResource::collection($this->whenLoaded('replies')),
            'repliesCount' => (int) ($this->replies_count ?? 0),
        ];
    }
}
