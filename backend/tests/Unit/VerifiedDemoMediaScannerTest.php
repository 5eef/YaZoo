<?php

namespace Tests\Unit;

use App\Services\Media\VerifiedDemoMediaScanner;
use App\ValueObjects\MediaScanResult;
use Tests\TestCase;

class VerifiedDemoMediaScannerTest extends TestCase
{
    private string $path;

    private array $manifest;

    protected function setUp(): void
    {
        parent::setUp();
        $this->path = tempnam(sys_get_temp_dir(), 'demo-media-test-');
        $this->manifest = [
            'mode' => 'pre_scanned_demo_files_only', 'scan_result' => 'clean',
            'scanned_at' => now()->subMinute()->toIso8601String(),
            'expires_at' => now()->addDays(6)->toIso8601String(),
            'engine' => 'ClamAV 1.5.4/123/'.now()->subDay()->format('D M d H:i:s Y'),
            'files' => [['sha256' => hash('sha256', 'approved'), 'size' => 8, 'mime_type' => 'image/png']],
        ];
        $this->save();
    }

    protected function tearDown(): void
    {
        unlink($this->path);
        parent::tearDown();
    }

    private function save(): void
    {
        file_put_contents($this->path, json_encode($this->manifest));
    }

    private function scan(string $bytes, int $owner = 17, string $mime = 'image/png'): MediaScanResult
    {
        $stream = fopen('php://temp', 'w+');
        fwrite($stream, $bytes);
        rewind($stream);
        try {
            return (new VerifiedDemoMediaScanner($this->path, 'showcase', [17]))->scan($stream, ['owner_id' => $owner, 'size' => strlen($bytes), 'mime_type' => $mime]);
        } finally {
            fclose($stream);
        }
    }

    public function test_only_exact_previously_scanned_bytes_for_the_designated_owner_are_clean(): void
    {
        $this->assertSame(MediaScanResult::CLEAN, $this->scan('approved')->status);
        $this->assertSame(MediaScanResult::SCAN_FAILED, $this->scan('approvex')->status);
        $this->assertSame(MediaScanResult::SCAN_FAILED, $this->scan('approved', 18)->status);
        $this->assertSame(MediaScanResult::SCAN_FAILED, $this->scan('approved', 17, 'application/pdf')->status);
        $this->assertSame(MediaScanResult::SCAN_FAILED, $this->scan('')->status);
    }

    public function test_production_and_an_empty_owner_allowlist_cannot_enable_this_demo_mode(): void
    {
        $this->assertFalse((new VerifiedDemoMediaScanner($this->path, 'production', [17]))->isAvailable());
        $this->assertFalse((new VerifiedDemoMediaScanner($this->path, 'showcase', []))->isAvailable());
    }

    public function test_expired_future_or_overlong_manifests_fail_closed(): void
    {
        foreach ([
            ['expires_at' => now()->subMinute()->toIso8601String()],
            ['scanned_at' => now()->addHour()->toIso8601String()],
            ['expires_at' => now()->addDays(8)->toIso8601String()],
            ['engine' => 'ClamAV 1.5.4/123/'.now()->subDays(9)->format('D M d H:i:s Y')],
        ] as $invalid) {
            $valid = $this->manifest;
            $this->manifest = [...$valid, ...$invalid];
            $this->save();
            $this->assertSame(MediaScanResult::SCAN_FAILED, $this->scan('approved')->status);
            $this->manifest = $valid;
        }
    }

    public function test_corrupt_manifest_is_never_available(): void
    {
        file_put_contents($this->path, '{broken');
        $this->assertFalse((new VerifiedDemoMediaScanner($this->path, 'showcase', [17]))->isAvailable());
    }
}
