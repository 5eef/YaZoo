<?php

namespace App\Services\Media;

use App\Contracts\MediaScanner;
use App\ValueObjects\MediaScanResult;

final class UnavailableMediaScanner implements MediaScanner
{
    public function isAvailable(): bool
    {
        return false;
    }

    public function scan($stream, array $metadata): MediaScanResult
    {
        return MediaScanResult::failed();
    }
}
