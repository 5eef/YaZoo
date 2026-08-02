<?php

namespace App\Support;

use App\Models\Community;
use App\Models\Post;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;

final class ContentVisibility
{
    /**
     * Restrict communities to those the viewer is allowed to discover and open.
     *
     * @param  Builder<Community>  $query
     * @return Builder<Community>
     */
    public static function communities(Builder $query, ?User $viewer): Builder
    {
        if ($viewer?->is_admin) {
            return $query;
        }

        return $query->where(function (Builder $visibility) use ($viewer): void {
            $visibility->where('is_private', false);

            if (! $viewer) {
                return;
            }

            $visibility
                ->orWhere('user_id', $viewer->id)
                ->orWhereHas('memberships', fn (Builder $membership) => $membership
                    ->where('user_id', $viewer->id)
                    ->where('status', 'approved'));
        });
    }

    public static function canViewCommunity(?User $viewer, Community $community): bool
    {
        if (! $community->exists) {
            return false;
        }

        return Community::query()
            ->visibleTo($viewer)
            ->whereKey($community->getKey())
            ->exists();
    }

    /**
     * Restrict posts by moderation status, audience and community membership.
     * Authors, global administrators and approved community administrators retain
     * read access for moderation, but only active posts remain interactable.
     *
     * @param  Builder<Post>  $query
     * @return Builder<Post>
     */
    public static function posts(Builder $query, ?User $viewer): Builder
    {
        if ($viewer?->is_admin) {
            return $query;
        }

        $query->where(function (Builder $moderation) use ($viewer): void {
            $moderation
                ->where('moderation_status', 'active')
                ->orWhereNull('moderation_status');

            if ($viewer) {
                $moderation->orWhere(fn (Builder $privileged) => self::postModerator($privileged, $viewer));
            }
        });

        $query->where(function (Builder $audience) use ($viewer): void {
            $audience->where('visibility', Post::VISIBILITY_PUBLIC);

            if (! $viewer) {
                return;
            }

            $audience
                ->orWhere(fn (Builder $privileged) => self::postModerator($privileged, $viewer))
                ->orWhere(function (Builder $followers) use ($viewer): void {
                    $followers
                        ->where('visibility', Post::VISIBILITY_FOLLOWERS)
                        ->whereHas('user.followers', fn (Builder $follower) => $follower->whereKey($viewer->id));
                });
        });

        return $query->where(function (Builder $community) use ($viewer): void {
            $community
                ->whereNull('community_id')
                ->orWhereHas('community', fn (Builder $communityQuery) => self::communities($communityQuery, $viewer));
        });
    }

    public static function canViewPost(?User $viewer, Post $post): bool
    {
        if (! $post->exists) {
            return false;
        }

        return Post::query()
            ->visibleTo($viewer)
            ->whereKey($post->getKey())
            ->exists();
    }

    public static function canInteractWithPost(User $viewer, Post $post): bool
    {
        return in_array($post->moderation_status, [null, 'active'], true)
            && self::canViewPost($viewer, $post);
    }

    /**
     * @param  Builder<Post>  $query
     */
    private static function postModerator(Builder $query, User $viewer): void
    {
        $query
            ->where('user_id', $viewer->id)
            ->orWhereHas('community', function (Builder $community) use ($viewer): void {
                $community
                    ->where('user_id', $viewer->id)
                    ->orWhereHas('memberships', fn (Builder $membership) => $membership
                        ->where('user_id', $viewer->id)
                        ->where('status', 'approved')
                        ->where('role', 'admin'));
            });
    }
}
