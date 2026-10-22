<?php

namespace App\Services\Media;

use App\Contracts\MediaScanner;
use App\ValueObjects\MediaScanResult;
use RuntimeException;
use Throwable;

/** clamd must be reachable only over a trusted private network or Unix socket. */
final class ClamAvMediaScanner implements MediaScanner
{
    public function __construct(
        private readonly string $endpoint,
        private readonly int $timeoutSeconds = 20,
        private readonly int $maxBytes = 52_428_800,
    ) {}

    public function isAvailable(): bool
    {
        if (! $this->validEndpoint()) {
            return false;
        }
        $socket = @stream_socket_client($this->endpoint, $errno, $error, 2);
        if (! is_resource($socket)) {
            return false;
        }
        try {
            stream_set_timeout($socket, 2);
            $this->write($socket, "zPING\0", microtime(true) + 2);

            return stream_get_line($socket, 64, "\0") === 'PONG';
        } catch (Throwable) {
            return false;
        } finally {
            fclose($socket);
        }
    }

    public function scan($stream, array $metadata): MediaScanResult
    {
        if (! is_resource($stream) || $this->maxBytes < 1) {
            return MediaScanResult::failed('invalid_stream');
        }
        if (($metadata['size'] ?? 0) > $this->maxBytes) {
            return MediaScanResult::failed('size_limit');
        }
        if (! $this->validEndpoint()) {
            return MediaScanResult::failed('scanner_unavailable');
        }
        $timeout = max(1, min(60, $this->timeoutSeconds));
        $socket = @stream_socket_client($this->endpoint, $errno, $error, $timeout);
        if (! is_resource($socket)) {
            return MediaScanResult::failed('scanner_unavailable');
        }
        $deadline = microtime(true) + $timeout;
        try {
            stream_set_timeout($socket, $timeout);
            $this->write($socket, "zINSTREAM\0", $deadline);
            $total = 0;
            while (! feof($stream)) {
                $chunk = fread($stream, 65_536);
                if ($chunk === false || ($chunk === '' && ! feof($stream))) {
                    return MediaScanResult::failed('stream_read_failed');
                }
                $total += strlen($chunk);
                if ($total > $this->maxBytes) {
                    return MediaScanResult::failed('size_limit');
                }
                if ($chunk !== '') {
                    $this->write($socket, pack('N', strlen($chunk)).$chunk, $deadline);
                }
            }
            if ($total === 0) {
                return MediaScanResult::failed('empty_stream');
            }
            $this->write($socket, pack('N', 0), $deadline);
            $reply = '';
            while (! str_contains($reply, "\0") && strlen($reply) < 4096) {
                $this->setRemainingTimeout($socket, $deadline);
                $part = fread($socket, 1);
                if ($part === false || $part === '') {
                    return MediaScanResult::failed('scanner_response_incomplete');
                }
                $reply .= $part;
            }
            if ($reply === "stream: OK\0") {
                return MediaScanResult::clean();
            }
            if (preg_match('/^stream: [^\x00\r\n]+ FOUND\x00$/D', $reply) === 1) {
                return MediaScanResult::infected();
            }

            return MediaScanResult::failed('scanner_response_invalid');
        } catch (Throwable) {
            return MediaScanResult::failed('scanner_io_failed');
        } finally {
            fclose($socket);
        }
    }

    private function validEndpoint(): bool
    {
        return preg_match('~^(tcp://[^/]+:\d+|unix:///[^\x00]+)$~D', $this->endpoint) === 1;
    }

    private function write($socket, string $bytes, float $deadline): void
    {
        while ($bytes !== '') {
            $this->setRemainingTimeout($socket, $deadline);
            $written = fwrite($socket, $bytes);
            if ($written === false || $written === 0) {
                throw new RuntimeException('Scanner write failed.');
            }
            $bytes = substr($bytes, $written);
        }
    }

    private function setRemainingTimeout($socket, float $deadline): void
    {
        $remaining = $deadline - microtime(true);
        if ($remaining <= 0) {
            throw new RuntimeException('Scanner deadline exceeded.');
        }
        $seconds = (int) $remaining;
        stream_set_timeout($socket, $seconds, max(1, (int) (($remaining - $seconds) * 1_000_000)));
    }
}
