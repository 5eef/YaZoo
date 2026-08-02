<?php

namespace App\Models\Concerns;

use App\Models\MediaAsset;
use Illuminate\Database\Eloquent\Relations\MorphMany;

trait HasMediaAssets
{
    public function mediaAssets(): MorphMany
    {
        return $this->morphMany(MediaAsset::class, 'attachable')->orderBy('position');
    }
}
