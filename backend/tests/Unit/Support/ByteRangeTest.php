<?php

namespace Tests\Unit\Support;

use App\Support\ByteRange;
use InvalidArgumentException;
use PHPUnit\Framework\TestCase;

class ByteRangeTest extends TestCase
{
    public function test_range_boundaries_support_playback_and_reject_invalid_or_multiple_ranges(): void
    {
        $this->assertSame([0, 3], ByteRange::parse('bytes=0-3', 10));
        $this->assertSame([5, 9], ByteRange::parse('bytes=5-', 10));
        $this->assertSame([7, 9], ByteRange::parse('bytes=-3', 10));
        $this->assertSame([0, 9], ByteRange::parse('bytes=-99999999999999999999999', 10));
        $this->assertSame([0, 9], ByteRange::parse('bytes=0-99999999999999999999999', 10));
        foreach (['bytes=-0', 'bytes=-', 'bytes=10-', 'bytes=4-2', 'bytes=0-1,3-4', 'items=0-1', 'bytes=bad', 'bytes=99999999999999999999999-'] as $range) {
            try {
                ByteRange::parse($range, 10);
                $this->fail('Invalid range was accepted.');
            } catch (InvalidArgumentException) {
                $this->addToAssertionCount(1);
            }
        }
    }
}
