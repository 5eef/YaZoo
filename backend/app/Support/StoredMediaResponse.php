<?php

namespace App\Support;

use Illuminate\Support\Facades\Storage;
use InvalidArgumentException;
use RuntimeException;
use Symfony\Component\HttpFoundation\HeaderUtils;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Throwable;

final class StoredMediaResponse
{
    public static function make(string $diskName, string $path, string $mime, string $filename, bool $private = true, bool $download = false): StreamedResponse
    {
        try {
            $disk = Storage::disk($diskName);
            $exists = $disk->exists($path);
            $size = $exists ? $disk->size($path) : 0;
        } catch (Throwable) {
            throw new RuntimeException('Media storage metadata unavailable.');
        }
        abort_unless($exists, 404);

        $range = null;
        $status = 200;
        $headers = [];
        $head = request()->isMethod('HEAD');
        // We do not emit validators, so an If-Range request falls back to the full body.
        if (! $head && request()->hasHeader('Range') && ! request()->hasHeader('If-Range')) {
            try {
                $range = ByteRange::parse((string) request()->header('Range'), $size);
            } catch (InvalidArgumentException) {
                abort(416, '', ['Content-Range' => 'bytes */'.$size]);
            }
            $status = 206;
            $headers['Content-Range'] = 'bytes '.$range[0].'-'.$range[1].'/'.$size;
        }
        $length = $range === null ? $size : $range[1] - $range[0] + 1;
        $stream = $head ? null : MediaStorage::openDiskStream($diskName, $path, $range);
        $filename = basename(str_replace('\\', '/', $filename));
        $fallback = preg_replace('/[^A-Za-z0-9._-]/', '_', $filename) ?: 'media';

        return response()->stream(function () use ($stream, $head, $length): void {
            if ($head) {
                return;
            }
            $output = fopen('php://output', 'wb');
            try {
                stream_copy_to_stream($stream, $output, $length);
            } finally {
                fclose($stream);
                fclose($output);
            }
        }, $status, [
            ...$headers,
            'Content-Type' => $mime,
            'Content-Length' => (string) $length,
            'Accept-Ranges' => 'bytes',
            'Cache-Control' => $private ? 'private, no-store' : 'public, max-age=300',
            'X-Content-Type-Options' => 'nosniff',
            'Content-Disposition' => HeaderUtils::makeDisposition($download ? 'attachment' : 'inline', $filename, $fallback),
        ]);
    }
}
