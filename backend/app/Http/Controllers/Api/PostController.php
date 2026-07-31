<?php

namespace App\Http\Controllers\Api;

use App\DTOs\PaginationData;
use App\Http\Controllers\Controller;
use App\Http\Requests\Feed\StorePostRequest;
use App\Http\Resources\Feed\PostResource;
use App\Models\Community;
use App\Models\Post;
use App\Notifications\PostLikedNotification;
use App\Support\MediaStorage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Throwable;

class PostController extends Controller
{
    /**
     * Display a paginated listing of posts for the feed.
     */
    public function index(Request $request)
    {
        $pagination = PaginationData::fromRequest($request, 10, 30);
        $communityId = $request->integer('community_id');

        if ($communityId) {
            $community = Community::query()->findOrFail($communityId);

            abort_unless(
                $this->canViewCommunity($request, $community),
                403,
                "Vous n'avez pas acces a ce groupe.",
            );
        }

        $posts = Post::query()
            ->when($communityId, function ($query) use ($communityId): void {
                $query->where('community_id', $communityId);
            }, function ($query) use ($request): void {
                $query
                    ->whereNull('community_id')
                    ->where(function ($query) use ($request): void {
                        $query
                            ->where('visibility', Post::VISIBILITY_PUBLIC)
                            ->orWhere('user_id', $request->user()->id);
                    });
            })
            ->with([
                'likes:id,user_id,likeable_id,likeable_type,reaction',
                'user:id,name,phone_verified_at,avatar,city,country',
                'community:id,name,is_private',
                'comments' => fn ($query) => $query
                    ->whereNull('parent_id')
                    ->latest()
                    ->limit(3)
                    ->with([
                        'user:id,name,avatar,city,country',
                        'replies.user:id,name,avatar,city,country',
                    ]),
            ])
            ->withCount([
                'likes',
                'comments',
                'likes as liked_by_user' => fn ($query) => $query->where(
                    'user_id',
                    $request->user()->id,
                ),
            ])
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

        try {
            if ($request->hasFile('media_file')) {
                $mediaKind = MediaStorage::detectMediaKind($request->file('media_file'));
                $mediaPath = MediaStorage::storeUploadedFile(
                    $request->file('media_file'),
                    'feed/posts',
                );
            }

            $post = DB::transaction(fn (): Post => $request->user()->posts()->create([
                'community_id' => $communityId,
                'content' => $request->validated('content'),
                'image_path' => $mediaKind === 'image' ? $mediaPath : null,
                'media_path' => $mediaPath,
                'media_kind' => $mediaKind,
                'location' => $request->validated('location'),
                'tags' => $request->validated('tags', []),
                'visibility' => $request->validated('visibility', Post::VISIBILITY_PUBLIC),
            ]));
        } catch (Throwable $exception) {
            if ($mediaPath !== null) {
                MediaStorage::deleteStoredFiles([$mediaPath]);
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

        $storedPaths = [
            $post->media_path,
            $post->image_path,
        ];

        DB::transaction(fn () => $post->delete());
        MediaStorage::deleteStoredFiles($storedPaths);

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
            'likes:id,user_id,likeable_id,likeable_type,reaction',
            'user:id,name,phone_verified_at,avatar,city,country',
            'community:id,name,is_private',
            'comments' => fn ($query) => $query
                ->whereNull('parent_id')
                ->latest()
                ->limit(3)
                ->with([
                    'user:id,name,avatar,city,country',
                    'replies.user:id,name,avatar,city,country',
                ]),
        ])->loadCount([
            'likes',
            'comments',
            'likes as liked_by_user' => fn ($query) => $query->where('user_id', $userId),
        ]);
    }

    private function canViewCommunity(Request $request, Community $community): bool
    {
        if (! $community->is_private) {
            return true;
        }

        return $community->memberships()
            ->where('user_id', $request->user()->id)
            ->where('status', 'approved')
            ->exists();
    }

    private function canPostInCommunity(Request $request, Community $community): bool
    {
        return $community->memberships()
            ->where('user_id', $request->user()->id)
            ->where('status', 'approved')
            ->exists();
    }
}
