<?php

namespace App\Contracts;

use App\ValueObjects\MediaScanResult;

interface MediaScanner
{
    public function isAvailable(): bool;

    /**
     * @param  resource  $stream
     * @param  array{mime_type: string|null, size: int|null, original_name: string|null}  $metadata
     */
    public function scan($stream, array $metadata): MediaScanResult;
}
