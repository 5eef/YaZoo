<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Feed\StoreCommentRequest;
use App\Http\Resources\Feed\CommentResource;
use App\Models\Comment;
use App\Models\Post;
use App\Notifications\PostCommentedNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CommentController extends Controller
{
    /**
     * Store a newly created comment on a post.
     */
    public function store(StoreCommentRequest $request, Post $post): JsonResponse
    {
        $this->authorize('comment', $post);

        $parentId = $request->validated('parent_id');

        if ($parentId) {
            Comment::query()
                ->where('post_id', $post->id)
                ->whereKey($parentId)
                ->firstOrFail();
        }

        $comment = $post->comments()->create([
            'user_id' => $request->user()->id,
            'parent_id' => $parentId,
            'body' => $request->validated('body'),
            'reaction' => $request->validated('reaction'),
        ]);

        $post->loadMissing('user');

        if ($post->user && ! $request->user()->is($post->user)) {
            $post->user->notify(
                new PostCommentedNotification($post, $comment, $request->user()),
            );
        }

        $this->loadCommentState($comment);

        return CommentResource::make($comment)
            ->response()
            ->setStatusCode(201);
    }

    /**
     * Update the emoji reaction attached to a comment.
     */
    public function react(Request $request, Comment $comment): JsonResponse
    {
        $comment->loadMissing('post');
        $this->authorize('interact', $comment->post);

        abort_unless(
            $request->user()->is($comment->user) || (bool) $request->user()->is_admin,
            403,
        );

        $validated = $request->validate([
            'reaction' => ['nullable', 'string', 'max:24'],
        ]);

        $comment->update([
            'reaction' => $validated['reaction'] ?? null,
        ]);

        $this->loadCommentState($comment);

        return CommentResource::make($comment)->response();
    }

    private function loadCommentState(Comment $comment): void
    {
        $comment->load([
            'user:id,name,avatar,city,country',
            'replies' => fn ($query) => $query
                ->oldest()
                ->limit(3)
                ->with('user:id,name,avatar,city,country'),
        ])->loadCount('replies');
    }
}
