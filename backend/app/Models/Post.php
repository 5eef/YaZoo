<?php

namespace App\Models;

use App\Models\Concerns\HasMediaAssets;
use App\Support\ContentVisibility;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;

class Post extends Model
{
    use HasFactory, HasMediaAssets;

    public const VISIBILITY_PUBLIC = 'public';

    public const VISIBILITY_FOLLOWERS = 'followers';

    public const VISIBILITY_PRIVATE = 'private';

    public const VISIBILITIES = [
        self::VISIBILITY_PUBLIC,
        self::VISIBILITY_FOLLOWERS,
        self::VISIBILITY_PRIVATE,
    ];

    public const REACTIONS = ['like', 'love', 'happy', 'wow'];

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'content',
        'community_id',
        'image_path',
        'media_path',
        'media_kind',
        'location',
        'tags',
        'visibility',
        'moderation_status',
        'moderation_note',
        'moderated_by',
        'moderated_at',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'tags' => 'array',
            'moderated_at' => 'datetime',
        ];
    }

    /**
     * Get the author of the post.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the community this post belongs to, when posted inside a group.
     */
    public function community(): BelongsTo
    {
        return $this->belongsTo(Community::class);
    }

    /**
     * Get the comments for the post.
     */
    public function comments(): HasMany
    {
        return $this->hasMany(Comment::class)->oldest();
    }

    /**
     * Get the likes for the post.
     */
    public function likes(): MorphMany
    {
        return $this->morphMany(Like::class, 'likeable');
    }

    /**
     * @param  Builder<Post>  $query
     * @return Builder<Post>
     */
    public function scopeVisibleTo(Builder $query, ?User $viewer): Builder
    {
        return ContentVisibility::posts($query, $viewer);
    }

    public function isVisibleTo(?User $viewer): bool
    {
        return ContentVisibility::canViewPost($viewer, $this);
    }
}
