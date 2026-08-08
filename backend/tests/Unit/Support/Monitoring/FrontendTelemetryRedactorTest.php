<?php

namespace Tests\Unit\Support\Monitoring;

use App\Support\Monitoring\FrontendTelemetryRedactor;
use PHPUnit\Framework\TestCase;

class FrontendTelemetryRedactorTest extends TestCase
{
    public function test_sensitive_key_variants_and_deep_values_are_masked(): void
    {
        $redactor = new FrontendTelemetryRedactor;
        $payload = $redactor->payload([
            'accessToken' => 'value-one',
            'REFRESH-TOKEN' => 'value-two',
            'client_secret' => 'value-three',
            'payment' => [
                'store.key' => 'value-four',
                'card-number' => '4111111111111111',
                'nested' => ['SessionId' => 'value-five'],
            ],
            'tokenizationMode' => 'diagnostic',
            'secretary' => 'ordinary-word',
        ]);

        $this->assertSame('[masked]', $payload['accessToken']);
        $this->assertSame('[masked]', $payload['REFRESH-TOKEN']);
        $this->assertSame('[masked]', $payload['client_secret']);
        $this->assertSame('[masked]', $payload['payment']['store.key']);
        $this->assertSame('[masked]', $payload['payment']['card-number']);
        $this->assertSame('[masked]', $payload['payment']['nested']['SessionId']);
        $this->assertSame('diagnostic', $payload['tokenizationMode']);
        $this->assertSame('ordinary-word', $payload['secretary']);
    }

    public function test_message_stack_and_user_agent_values_are_redacted_and_bounded(): void
    {
        $redactor = new FrontendTelemetryRedactor;
        $input = 'authorization=Basic-dummy-value Bearer dummy.token.value email=user@example.test password=hidden-value';
        $redacted = $redactor->text($input, 5000);

        $this->assertStringNotContainsString('Basic-dummy-value', $redacted);
        $this->assertStringNotContainsString('dummy.token.value', $redacted);
        $this->assertStringNotContainsString('user@example.test', $redacted);
        $this->assertStringNotContainsString('hidden-value', $redacted);
        $this->assertStringContainsString('[masked]', $redacted);
        $this->assertSame(12, mb_strlen((string) $redactor->text(str_repeat('x', 100), 12)));
    }

    public function test_url_drops_credentials_query_and_fragment(): void
    {
        $redactor = new FrontendTelemetryRedactor;

        $this->assertSame(
            'https://yazoo.test:8443/feed/item',
            $redactor->url('https://user:password@yazoo.test:8443/feed/item?accessToken=hidden#private'),
        );
        $this->assertNull($redactor->url('/relative?token=hidden'));
    }
}
