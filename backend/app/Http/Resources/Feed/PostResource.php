<?php

namespace App\Http\Resources\Feed;

use App\Models\Post;
use App\Support\MediaStorage;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Collection;

/**
 * @mixin Post
 */
class PostResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $resolvedMediaPath = $this->media_path ?: $this->image_path;
        $resolvedMediaKind = $this->media_kind ?: ($resolvedMediaPath ? 'image' : null);
        $viewerId = $request->user()?->id;
        $likes = $this->whenLoaded('likes');
        $likeCollection = $likes instanceof Collection ? $likes : collect();
        $viewerLike = $viewerId
            ? $likeCollection->firstWhere('user_id', $viewerId)
            : null;

        return [
            'id' => $this->id,
            'communityId' => $this->community_id,
            'content' => $this->content,
            'imageUrl' => $resolvedMediaKind === 'image'
                ? MediaStorage::resolveUrl($resolvedMediaPath)
                : null,
            'mediaUrl' => MediaStorage::resolveUrl($resolvedMediaPath),
            'mediaKind' => $resolvedMediaKind,
            'location' => $this->location,
            'tags' => $this->tags ?? [],
            'visibility' => $this->visibility ?? Post::VISIBILITY_PUBLIC,
            'moderationStatus' => $this->moderation_status ?? 'active',
            'moderationNote' => $this->when(
                ($request->user()?->is_admin ?? false) || ($request->user()?->is($this->user) ?? false),
                $this->moderation_note,
            ),
            'createdAt' => $this->created_at?->toISOString(),
            'author' => [
                'id' => $this->user?->id,
                'name' => $this->user?->name,
                'avatar' => MediaStorage::resolveUrl($this->user?->avatar),
                'city' => $this->user?->city,
                'country' => $this->user?->country,
                'isPhoneVerified' => $this->user?->hasVerifiedPhone() ?? false,
                'isFollowing' => $viewerId && $this->user_id !== $viewerId
                    ? (bool) ($this->user?->is_followed_by_viewer ?? false)
                    : false,
            ],
            'community' => $this->whenLoaded('community', fn () => [
                'id' => $this->community?->id,
                'name' => $this->community?->name,
                'isPrivate' => (bool) $this->community?->is_private,
            ]),
            'likes' => $this->likes_count ?? 0,
            'liked' => (bool) ($this->liked_by_user ?? false),
            'userReaction' => $viewerLike?->reaction,
            'reactions' => collect(Post::REACTIONS)
                ->map(fn (string $reaction): array => [
                    'reaction' => $reaction,
                    'count' => (int) ($this->{"reaction_{$reaction}_count"} ?? 0),
                ])
                ->filter(fn (array $reaction): bool => $reaction['count'] > 0)
                ->values(),
            'commentsCount' => $this->comments_count ?? 0,
            'comments' => CommentResource::collection($this->whenLoaded('comments')),
        ];
    }
}
