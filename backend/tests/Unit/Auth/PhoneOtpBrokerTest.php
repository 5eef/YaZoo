<?php

namespace Tests\Unit\Auth;

use App\Support\Auth\PhoneOtpBroker;
use App\Support\Sms\SmsSender;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use ReflectionClass;
use Symfony\Component\HttpKernel\Exception\ServiceUnavailableHttpException;
use Tests\TestCase;

class PhoneOtpBrokerTest extends TestCase
{
    public function test_cache_key_uses_keyed_hmac_without_exposing_phone(): void
    {
        $broker = new PhoneOtpBroker(new SmsSender);
        $method = (new ReflectionClass($broker))->getMethod('cacheKey');
        $phone = '+212600000010';
        $intent = 'login';

        $key = $method->invoke($broker, $phone, $intent);
        $expectedHash = hash_hmac('sha256', $phone, (string) config('app.key'));

        $this->assertSame("auth:otp:{$intent}:{$expectedHash}", $key);
        $this->assertStringNotContainsString($phone, $key);
        $this->assertSame($key, $method->invoke($broker, $phone, $intent));
        $this->assertNotSame($key, $method->invoke($broker, $phone, 'register'));
    }

    public function test_non_production_log_never_contains_full_phone_or_otp_code(): void
    {
        config()->set('services.sms.driver', 'log');
        config()->set('services.sms.otp_resend_cooldown_seconds', 0);
        $phone = '+212600000010';
        $logged = '';

        Log::shouldReceive('info')
            ->once()
            ->withArgs(function (string $message, array $context) use (&$logged): bool {
                $logged = $message.json_encode($context, JSON_THROW_ON_ERROR);

                return true;
            });

        $payload = (new PhoneOtpBroker(new SmsSender))->send($phone, 'login');

        $this->assertNotNull($payload['debug_code']);
        $this->assertStringNotContainsString($phone, $logged);
        $this->assertStringNotContainsString((string) $payload['debug_code'], $logged);
    }

    public function test_otp_is_locked_after_configured_number_of_failed_attempts(): void
    {
        Cache::flush();
        config()->set('services.sms.driver', 'log');
        config()->set('services.sms.otp_resend_cooldown_seconds', 0);
        config()->set('services.sms.otp_max_attempts', 2);
        $broker = new PhoneOtpBroker(new SmsSender);
        $payload = $broker->send('+212600000011', 'login');

        foreach (range(1, 2) as $attempt) {
            try {
                $broker->consume('+212600000011', 'login', '000000');
                $this->fail("Attempt {$attempt} should have failed.");
            } catch (ValidationException) {
                $this->assertTrue(true);
            }
        }

        $this->expectException(ValidationException::class);
        $broker->consume('+212600000011', 'login', (string) $payload['debug_code']);
    }

    public function test_production_sms_fails_closed_without_a_real_provider(): void
    {
        $previousEnvironment = app()->environment();
        config()->set('services.sms.driver', 'disabled');

        try {
            app()->detectEnvironment(fn (): string => 'production');
            $this->expectException(ServiceUnavailableHttpException::class);
            (new SmsSender)->send('+212600000012', 'secret code');
        } finally {
            app()->detectEnvironment(fn (): string => $previousEnvironment);
        }
    }

    public function test_disabled_sms_fails_closed_outside_production_too(): void
    {
        config()->set('services.sms.driver', 'disabled');

        $sender = new SmsSender;

        $this->assertFalse($sender->isAvailable());
        $this->expectException(ServiceUnavailableHttpException::class);
        $sender->send('+212600000013', 'secret code');
    }
}
