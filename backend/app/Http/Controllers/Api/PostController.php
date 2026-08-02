<?php

namespace App\Http\Controllers\Api;

use App\DTOs\PaginationData;
use App\Http\Controllers\Controller;
use App\Http\Requests\Feed\StorePostRequest;
use App\Http\Resources\Feed\PostResource;
use App\Models\Community;
use App\Models\Post;
use App\Notifications\PostLikedNotification;
use App\Services\MediaAssetService;
use App\Support\MediaStorage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Throwable;

class PostController extends Controller
{
    public function __construct(
        private readonly MediaAssetService $mediaAssets,
    ) {}

    /**
     * Display a paginated listing of posts for the feed.
     */
    public function index(Request $request)
    {
        $pagination = PaginationData::fromRequest($request, 10, 30);
        $communityId = $request->integer('community_id');

        if ($communityId) {
            $community = Community::query()->findOrFail($communityId);
            $this->authorize('view', $community);
        }

        $posts = Post::query()
            ->visibleTo($request->user())
            ->when(
                $communityId,
                fn ($query) => $query->where('community_id', $communityId),
                fn ($query) => $query->whereNull('community_id'),
            )
            ->with([
                'likes' => fn ($query) => $query
                    ->where('user_id', $request->user()->id)
                    ->select('id', 'user_id', 'likeable_id', 'likeable_type', 'reaction'),
                'user' => fn ($query) => $query
                    ->select('id', 'name', 'phone_verified_at', 'avatar', 'city', 'country')
                    ->withExists([
                        'followers as is_followed_by_viewer' => fn ($followers) => $followers
                            ->where('follower_user_id', $request->user()->id),
                    ]),
                'community:id,name,is_private',
                'comments' => fn ($query) => $query
                    ->whereNull('parent_id')
                    ->latest()
                    ->limit(3)
                    ->withCount('replies')
                    ->with([
                        'user:id,name,avatar,city,country',
                        'replies' => fn ($replies) => $replies
                            ->oldest()
                            ->limit(3)
                            ->with('user:id,name,avatar,city,country'),
                    ]),
            ])
            ->withCount($this->feedCounts($request->user()->id))
            ->latest()
            ->paginate($pagination->perPage);

        return PostResource::collection($posts);
    }

    /**
     * Store a newly created post.
     */
    public function store(StorePostRequest $request): JsonResponse
    {
        $this->authorize('create', Post::class);

        $communityId = $request->validated('community_id');

        if ($communityId) {
            $community = Community::query()->findOrFail($communityId);

            abort_unless(
                $this->canPostInCommunity($request, $community),
                403,
                'Vous devez etre membre approuve du groupe pour publier.',
            );
        }

        $mediaPath = null;
        $mediaKind = null;
        $mediaAsset = null;

        try {
            if ($request->hasFile('media_file')) {
                $mediaKind = MediaStorage::detectMediaKind($request->file('media_file'));
                $mediaAsset = $this->mediaAssets->registerUpload(
                    $request->user(),
                    $request->file('media_file'),
                    'feed/posts',
                    $mediaKind,
                );
                $mediaPath = $mediaAsset->path;
            }

            $post = DB::transaction(function () use ($request, $communityId, $mediaAsset, $mediaKind, $mediaPath): Post {
                $post = $request->user()->posts()->create([
                    'community_id' => $communityId,
                    'content' => $request->validated('content'),
                    'image_path' => $mediaKind === 'image' ? $mediaPath : null,
                    'media_path' => $mediaPath,
                    'media_kind' => $mediaKind,
                    'location' => $request->validated('location'),
                    'tags' => $request->validated('tags', []),
                    'visibility' => $request->validated('visibility', Post::VISIBILITY_PUBLIC),
                ]);

                if ($mediaAsset) {
                    $this->mediaAssets->attach($mediaAsset, $post, 'media_path');
                }

                return $post;
            });
        } catch (Throwable $exception) {
            if ($mediaAsset) {
                $this->mediaAssets->discardUnattached($mediaAsset, $request->user());
            }

            throw $exception;
        }

        $this->loadFeedRelations($post, $request->user()->id);

        return PostResource::make($post)
            ->response()
            ->setStatusCode(201);
    }

    /**
     * Update text, tags or visibility for the current user's post.
     */
    public function update(Request $request, Post $post): JsonResponse
    {
        $this->authorize('update', $post);

        $validated = $request->validate([
            'content' => ['sometimes', 'nullable', 'string', 'max:5000'],
            'location' => ['sometimes', 'nullable', 'string', 'max:255'],
            'tags' => ['sometimes', 'nullable', 'array', 'max:10'],
            'tags.*' => ['string', 'max:50'],
            'visibility' => ['sometimes', 'string', Rule::in(Post::VISIBILITIES)],
        ]);

        if (array_key_exists('content', $validated)) {
            $validated['content'] = trim((string) $validated['content']);
        }

        if (array_key_exists('location', $validated)) {
            $validated['location'] = trim((string) $validated['location']);
        }

        $post->update($validated);
        $this->loadFeedRelations($post->refresh(), $request->user()->id);

        return PostResource::make($post)->response();
    }

    /**
     * Delete the current user's post.
     */
    public function destroy(Request $request, Post $post): JsonResponse
    {
        $this->authorize('delete', $post);

        $post->loadMissing('user');
        $owner = $post->user;

        DB::transaction(fn () => $post->delete());
        $this->mediaAssets->deleteAttached($post, $owner);

        return response()->json([
            'message' => __('messages.posts.deleted'),
        ]);
    }

    /**
     * Toggle the current user's like on a post.
     */
    public function toggleLike(Request $request, Post $post): JsonResponse
    {
        $this->authorize('interact', $post);

        $existingLike = $post->likes()
            ->where('user_id', $request->user()->id)
            ->first();

        $reaction = $request->validate([
            'reaction' => ['nullable', 'string', 'max:24'],
        ])['reaction'] ?? 'like';

        if ($existingLike && $existingLike->reaction === $reaction) {
            $existingLike->delete();
        } elseif ($existingLike) {
            $existingLike->update([
                'reaction' => $reaction,
            ]);
        } else {
            $post->likes()->create([
                'reaction' => $reaction,
                'user_id' => $request->user()->id,
            ]);

            $post->loadMissing('user');

            if ($post->user && ! $request->user()->is($post->user)) {
                $post->user->notify(new PostLikedNotification($post, $request->user()));
            }
        }

        $post->refresh();
        $this->loadFeedRelations($post, $request->user()->id);

        return PostResource::make($post)->response();
    }

    /**
     * Load the relationships and counters needed by the frontend feed.
     */
    protected function loadFeedRelations(Post $post, int $userId): void
    {
        $post->load([
            'likes' => fn ($query) => $query
                ->where('user_id', $userId)
                ->select('id', 'user_id', 'likeable_id', 'likeable_type', 'reaction'),
            'user' => fn ($query) => $query
                ->select('id', 'name', 'phone_verified_at', 'avatar', 'city', 'country')
                ->withExists([
                    'followers as is_followed_by_viewer' => fn ($followers) => $followers
                        ->where('follower_user_id', $userId),
                ]),
            'community:id,name,is_private',
            'comments' => fn ($query) => $query
                ->whereNull('parent_id')
                ->latest()
                ->limit(3)
                ->withCount('replies')
                ->with([
                    'user:id,name,avatar,city,country',
                    'replies' => fn ($replies) => $replies
                        ->oldest()
                        ->limit(3)
                        ->with('user:id,name,avatar,city,country'),
                ]),
        ])->loadCount($this->feedCounts($userId));
    }

    /**
     * @return array<string|int, mixed>
     */
    private function feedCounts(int $userId): array
    {
        $counts = [
            'likes',
            'comments',
            'likes as liked_by_user' => fn ($query) => $query->where('user_id', $userId),
        ];

        foreach (Post::REACTIONS as $reaction) {
            $counts["likes as reaction_{$reaction}_count"] = fn ($query) => $query
                ->where('reaction', $reaction);
        }

        return $counts;
    }

    private function canPostInCommunity(Request $request, Community $community): bool
    {
        return $community->memberships()
            ->where('user_id', $request->user()->id)
            ->where('status', 'approved')
            ->exists();
    }
}
