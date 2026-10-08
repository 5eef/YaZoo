<?php

namespace Tests\Unit\Services;

use App\Services\ActivityLogger;
use PHPUnit\Framework\TestCase;
use ReflectionMethod;

class ActivityLoggerRedactionTest extends TestCase
{
    public function test_sensitive_credentials_are_removed_recursively_without_erasing_business_fields(): void
    {
        $method = new ReflectionMethod(ActivityLogger::class, 'sanitizeMetadata');
        $result = $method->invoke(new ActivityLogger, [
            'status' => 'confirmed',
            'Authorization' => 'test-only-bearer',
            'nested' => ['access_token' => 'test-only-token', 'otp_code' => '123456', 'event' => 'appointment'],
        ]);
        $this->assertSame(['status' => 'confirmed', 'nested' => ['event' => 'appointment']], $result);
    }
}
