<?php

namespace App\Policies;

use App\Models\Post;
use App\Models\User;
use App\Support\ContentVisibility;

class PostPolicy
{
    /**
     * Determine whether the user can create a post.
     */
    public function create(User $user): bool
    {
        return $user->exists;
    }

    /**
     * Determine whether the user can interact with a post.
     */
    public function interact(User $user, Post $post): bool
    {
        return $user->exists && ContentVisibility::canInteractWithPost($user, $post);
    }

    public function view(User $user, Post $post): bool
    {
        return ContentVisibility::canViewPost($user, $post);
    }

    /**
     * Determine whether the user can comment on a post.
     */
    public function comment(User $user, Post $post): bool
    {
        return $this->interact($user, $post);
    }

    /**
     * Determine whether the user can update a post.
     */
    public function update(User $user, Post $post): bool
    {
        return $user->is($post->user) || (bool) $user->is_admin;
    }

    /**
     * Determine whether the user can delete a post.
     */
    public function delete(User $user, Post $post): bool
    {
        return $user->is($post->user) || (bool) $user->is_admin;
    }
}
