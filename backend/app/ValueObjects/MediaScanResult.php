<?php

namespace App\ValueObjects;

use InvalidArgumentException;

final readonly class MediaScanResult
{
    public const CLEAN = 'clean';

    public const INFECTED = 'infected';

    public const SCAN_FAILED = 'scan_failed';

    public function __construct(
        public string $status,
        public ?string $reasonCode = null,
    ) {
        if (! in_array($status, [self::CLEAN, self::INFECTED, self::SCAN_FAILED], true)) {
            throw new InvalidArgumentException('Unsupported media scan result.');
        }
    }

    public static function clean(): self
    {
        return new self(self::CLEAN);
    }

    public static function infected(string $reasonCode = 'malware_detected'): self
    {
        return new self(self::INFECTED, $reasonCode);
    }

    public static function failed(string $reasonCode = 'scanner_unavailable'): self
    {
        return new self(self::SCAN_FAILED, $reasonCode);
    }
}
