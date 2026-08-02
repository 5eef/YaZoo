<?php

namespace App\Models;

use App\Support\ContentVisibility;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Community extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'description',
        'image_url',
        'is_private',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'is_private' => 'boolean',
        ];
    }

    /**
     * Get the creator of the community.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get all memberships for the community.
     */
    public function memberships(): HasMany
    {
        return $this->hasMany(CommunityMember::class);
    }

    /**
     * Get approved memberships for the community.
     */
    public function approvedMemberships(): HasMany
    {
        return $this->memberships()->where('status', 'approved');
    }

    /**
     * Get pending memberships for the community.
     */
    public function pendingMemberships(): HasMany
    {
        return $this->memberships()->where('status', 'pending');
    }

    /**
     * @param  Builder<Community>  $query
     * @return Builder<Community>
     */
    public function scopeVisibleTo(Builder $query, ?User $viewer): Builder
    {
        return ContentVisibility::communities($query, $viewer);
    }

    public function isVisibleTo(?User $viewer): bool
    {
        return ContentVisibility::canViewCommunity($viewer, $this);
    }
}
