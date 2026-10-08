<?php

namespace App\Support;

use InvalidArgumentException;

final class ByteRange
{
    /** @return array{int, int} */
    public static function parse(string $header, int $size): array
    {
        if ($size < 1 || ! preg_match('/^bytes=(\d*)-(\d*)$/D', trim($header), $parts) || ($parts[1] === '' && $parts[2] === '')) {
            throw new InvalidArgumentException('Invalid byte range.');
        }
        if ($parts[1] === '') {
            $suffix = (int) $parts[2];
            if ($suffix < 1) {
                throw new InvalidArgumentException('Invalid byte range.');
            }

            return [max(0, $size - $suffix), $size - 1];
        }
        $start = (int) $parts[1];
        $end = $parts[2] === '' ? $size - 1 : min((int) $parts[2], $size - 1);
        if ($start >= $size || $end < $start) {
            throw new InvalidArgumentException('Invalid byte range.');
        }

        return [$start, $end];
    }
}
