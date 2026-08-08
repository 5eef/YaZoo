<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class MediaAsset extends Model
{
    use HasFactory, HasUuids;

    public const STATE_ACTIVE = 'active';

    public const STATE_PENDING = 'pending';

    public const STATE_SCANNING = 'scanning';

    public const STATE_CLEAN = 'clean';

    public const STATE_INFECTED = 'infected';

    public const STATE_SCAN_FAILED = 'scan_failed';

    public const VISIBILITY_PUBLIC = 'public';

    public const VISIBILITY_PRIVATE = 'private';

    protected $fillable = [
        'disk',
        'path',
        'path_hash',
        'kind',
        'state',
        'visibility',
        'role',
        'mime_type',
        'size',
        'original_name',
        'position',
    ];

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function attachable(): MorphTo
    {
        return $this->morphTo();
    }
}
