<?php

namespace App\Services\Media;

use App\Contracts\MediaScanner;
use App\ValueObjects\MediaScanResult;
use Throwable;

/** Verifies a prior antivirus result for exact, release-pinned demo bytes only. */
final class VerifiedDemoMediaScanner implements MediaScanner
{
    public function __construct(
        private readonly string $manifestPath,
        private readonly string $profile,
        private readonly array $allowedUserIds,
    ) {}

    public function isAvailable(): bool
    {
        return $this->manifest() !== null;
    }

    public function scan($stream, array $metadata): MediaScanResult
    {
        $manifest = $this->manifest();
        if ($manifest === null || ! is_resource($stream)) {
            return MediaScanResult::failed('demo_manifest_unavailable');
        }
        if (! in_array((int) ($metadata['owner_id'] ?? 0), $this->allowedUserIds, true)) {
            return MediaScanResult::failed('demo_owner_not_authorized');
        }
        $hash = hash_init('sha256');
        $size = 0;
        while (! feof($stream)) {
            $chunk = fread($stream, 65_536);
            if ($chunk === false || ($chunk === '' && ! feof($stream))) {
                return MediaScanResult::failed('stream_read_failed');
            }
            $size += strlen($chunk);
            if ($size > 32 * 1024 * 1024) {
                return MediaScanResult::failed('size_limit');
            }
            hash_update($hash, $chunk);
        }
        if ($size === 0 || $size !== ($metadata['size'] ?? null)) {
            return MediaScanResult::failed('size_mismatch');
        }
        $digest = hash_final($hash);
        foreach ($manifest['files'] as $file) {
            if (is_string($file['sha256'] ?? null)
                && hash_equals($file['sha256'], $digest)
                && ($file['size'] ?? null) === $size
                && ($file['mime_type'] ?? null) === ($metadata['mime_type'] ?? null)) {
                return MediaScanResult::clean();
            }
        }

        return MediaScanResult::failed('file_not_in_scanned_demo_pack');
    }

    private function manifest(): ?array
    {
        if ($this->profile !== 'showcase' || $this->allowedUserIds === []) {
            return null;
        }
        try {
            $raw = @file_get_contents($this->manifestPath);
            if (! is_string($raw)) {
                return null;
            }
            $data = json_decode($raw, true, flags: JSON_THROW_ON_ERROR);
            if (($data['mode'] ?? null) !== 'pre_scanned_demo_files_only'
                || ($data['scan_result'] ?? null) !== 'clean'
                || ! is_array($data['files'] ?? null) || $data['files'] === []
                || ! is_string($data['engine'] ?? null)
                || preg_match('~^ClamAV [0-9.]+/[0-9]+/(.+)$~D', $data['engine'], $engine) !== 1) {
                return null;
            }
            $scanned = strtotime($data['scanned_at'] ?? '');
            $expires = strtotime($data['expires_at'] ?? '');
            $signatures = strtotime($engine[1]);
            $now = now()->getTimestamp();
            if ($scanned === false || $expires === false || $signatures === false
                || $scanned > $now + 300 || $expires <= $now || $expires <= $scanned
                || $expires - $scanned > 7 * 86400
                || $signatures > $scanned + 300 || $signatures < $scanned - 7 * 86400) {
                return null;
            }

            return $data;
        } catch (Throwable) {
            return null;
        }
    }
}
