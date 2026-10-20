<?php

namespace Tests\Unit;

use App\Services\Media\ClamAvMediaScanner;
use App\ValueObjects\MediaScanResult;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

class ClamAvMediaScannerTest extends TestCase
{
    public static function replies(): array
    {
        return [
            'clean' => ["stream: OK\0", MediaScanResult::CLEAN],
            'infected' => ["stream: Test.Signature FOUND\0", MediaScanResult::INFECTED],
            'error' => ["stream: scan ERROR\0", MediaScanResult::SCAN_FAILED],
            'truncated' => ['stream: OK', MediaScanResult::SCAN_FAILED],
            'untrusted clean' => ["other: OK\0", MediaScanResult::SCAN_FAILED],
        ];
    }

    #[DataProvider('replies')]
    public function test_framing_and_strict_response_parsing(string $reply, string $expected): void
    {
        if (! function_exists('pcntl_fork')) {
            $this->markTestSkipped('Protocol fixture requires pcntl.');
        }
        $server = stream_socket_server('tcp://127.0.0.1:0');
        $endpoint = 'tcp://'.stream_socket_get_name($server, false);
        $pid = pcntl_fork();
        if ($pid === 0) {
            $client = stream_socket_accept($server, 3);
            if (! $client) {
                exit(2);
            }
            stream_set_timeout($client, 3);
            $read = static function (int $size) use ($client): string {
                $bytes = '';
                while (strlen($bytes) < $size) {
                    $part = fread($client, $size - strlen($bytes));
                    if ($part === '' || $part === false) {
                        exit(3);
                    }
                    $bytes .= $part;
                }

                return $bytes;
            };
            if ($read(10) !== "zINSTREAM\0") {
                exit(4);
            }
            $body = '';
            while (($size = unpack('N', $read(4))[1]) !== 0) {
                $body .= $read($size);
            }
            fwrite($client, $reply);
            fclose($client);
            exit($body === str_repeat('sample', 20000) ? 0 : 5);
        }
        try {
            $stream = fopen('php://temp', 'w+');
            fwrite($stream, str_repeat('sample', 20000));
            rewind($stream);
            $result = (new ClamAvMediaScanner($endpoint, 2))->scan($stream, []);
            fclose($stream);
            $this->assertSame($expected, $result->status);
        } finally {
            fclose($server);
            pcntl_waitpid($pid, $status);
        }
        $this->assertSame(0, pcntl_wexitstatus($status));
    }

    public function test_unavailable_and_size_limit_never_return_clean(): void
    {
        $stream = fopen('php://temp', 'w+');
        fwrite($stream, 'sample');
        rewind($stream);
        $scanner = new ClamAvMediaScanner('unix:///nonexistent/yazoo-clamd.sock');
        $this->assertSame('scanner_unavailable', $scanner->scan($stream, [])->reasonCode);
        $this->assertSame('size_limit', (new ClamAvMediaScanner('invalid', 1, 2))->scan($stream, ['size' => 3])->reasonCode);
        fclose($stream);
    }
}
