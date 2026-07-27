<?php

namespace Tests\Unit;

use App\Support\Sms\SmsSender;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class SmsSenderTest extends TestCase
{
    public function test_twilio_driver_sends_only_when_configuration_is_complete(): void
    {
        Http::fake();
        config([
            'services.sms.driver' => 'twilio',
            'services.sms.twilio.sid' => 'test-sid',
            'services.sms.twilio.token' => 'test-token',
            'services.sms.twilio.from' => '+212500000000',
        ]);

        $sender = new SmsSender;
        $this->assertTrue($sender->isAvailable());
        $sender->send('+212600000001', 'Code de test');

        Http::assertSent(fn (Request $request): bool => str_contains($request->url(), '/Accounts/test-sid/Messages.json')
            && $request['To'] === '+212600000001'
            && $request['Body'] === 'Code de test');
    }

    public function test_orange_driver_sends_to_configured_endpoint(): void
    {
        Http::fake();
        config([
            'services.sms.driver' => 'orange',
            'services.sms.orange.base_url' => 'https://sms.test/v1/',
            'services.sms.orange.token' => 'test-token',
            'services.sms.orange.sender' => 'YaZoo',
        ]);

        $sender = new SmsSender;
        $this->assertTrue($sender->isAvailable());
        $sender->send('+212600000002', 'Code de test');

        Http::assertSent(fn (Request $request): bool => $request->url() === 'https://sms.test/v1/messages'
            && $request->hasHeader('Authorization', 'Bearer test-token')
            && $request['recipient'] === '+212600000002');
    }

    public function test_incomplete_real_provider_is_unavailable(): void
    {
        config([
            'services.sms.driver' => 'twilio',
            'services.sms.twilio.sid' => 'test-sid',
            'services.sms.twilio.token' => null,
            'services.sms.twilio.from' => null,
        ]);

        $this->assertFalse((new SmsSender)->isAvailable());
    }
}
