<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Log;
use Tests\TestCase;

class MonitoringApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_frontend_monitoring_masks_sensitive_payload_values(): void
    {
        config(['logging.frontend_channel' => 'frontend']);

        Log::shouldReceive('channel')
            ->once()
            ->with('frontend')
            ->andReturnSelf();

        Log::shouldReceive('error')
            ->once()
            ->with(
                'Frontend boom',
                \Mockery::on(function (array $context): bool {
                    return $context['url'] === 'https://yazoo.test/feed'
                        && $context['context']['token'] === '[masked]'
                        && $context['context']['nested']['password'] === '[masked]'
                        && $context['context']['apiKey'] === '[masked]'
                        && $context['user']['client_secret'] === '[masked]'
                        && $context['user']['name'] === '[masked]'
                        && $context['user']['email'] === '[masked]';
                })
            );

        $this->postJson('/api/monitoring/frontend-error', [
            'message' => 'Frontend boom',
            'source' => 'frontend',
            'url' => 'https://yazoo.test/feed?token=secret-value',
            'context' => [
                'token' => 'secret-value',
                'nested' => [
                    'password' => 'hidden',
                ],
                'apiKey' => 'hidden',
            ],
            'user' => [
                'id' => 7,
                'name' => 'Private User',
                'email' => 'private@example.com',
                'client_secret' => 'hidden',
            ],
        ])->assertAccepted();
    }

    public function test_frontend_monitoring_redacts_all_logged_text_fields(): void
    {
        config(['logging.frontend_channel' => 'frontend']);

        Log::shouldReceive('channel')->once()->with('frontend')->andReturnSelf();
        Log::shouldReceive('error')
            ->once()
            ->with(
                \Mockery::on(fn (string $message): bool => ! str_contains($message, 'message-secret')
                    && ! str_contains($message, 'person@example.test')),
                \Mockery::on(function (array $context): bool {
                    $serialized = json_encode($context, JSON_THROW_ON_ERROR);

                    foreach ([
                        'stack-secret',
                        'source-secret',
                        'agent-secret',
                        'url-secret',
                        'nested-secret',
                        'person@example.test',
                    ] as $forbidden) {
                        if (str_contains($serialized, $forbidden)) {
                            return false;
                        }
                    }

                    return $context['url'] === 'https://yazoo.test/feed'
                        && $context['context']['deep']['customer_access_token'] === '[masked]'
                        && $context['user']['AUTH-TOKEN'] === '[masked]';
                }),
            );

        $this->postJson('/api/monitoring/frontend-error', [
            'message' => 'Failure password=message-secret for person@example.test',
            'stack' => 'Trace bearer=stack-secret',
            'source' => 'source token=source-secret',
            'url' => 'https://user:url-secret@yazoo.test/feed?token=url-secret#url-secret',
            'userAgent' => 'Agent apiKey=agent-secret',
            'context' => [
                'deep' => ['customer_access_token' => 'nested-secret'],
            ],
            'user' => ['AUTH-TOKEN' => 'nested-secret'],
        ])->assertAccepted();
    }

    public function test_frontend_monitoring_rejects_an_oversized_payload(): void
    {
        $this->postJson('/api/monitoring/frontend-error', [
            'message' => 'Frontend boom',
            'context' => ['details' => str_repeat('x', 66000)],
        ])->assertStatus(413);
    }

    public function test_frontend_monitoring_rejects_a_deep_payload(): void
    {
        $nested = ['value' => true];

        for ($depth = 0; $depth < 9; $depth++) {
            $nested = ['nested' => $nested];
        }

        $this->postJson('/api/monitoring/frontend-error', [
            'message' => 'Frontend boom',
            'context' => $nested,
        ])->assertUnprocessable();
    }

    public function test_frontend_monitoring_rejects_an_extremely_wide_array(): void
    {
        $this->postJson('/api/monitoring/frontend-error', [
            'message' => 'Frontend boom',
            'context' => range(1, 101),
        ])->assertUnprocessable();
    }

    public function test_frontend_monitoring_rejects_malformed_json(): void
    {
        $this->call(
            'POST',
            '/api/monitoring/frontend-error',
            server: [
                'CONTENT_TYPE' => 'application/json',
                'HTTP_ACCEPT' => 'application/json',
            ],
            content: '{"message":',
        )->assertBadRequest();
    }

    public function test_frontend_monitoring_is_rate_limited(): void
    {
        for ($attempt = 1; $attempt <= 10; $attempt++) {
            $this->postJson('/api/monitoring/frontend-error', [
                'message' => "Frontend boom {$attempt}",
            ])->assertAccepted();
        }

        $this->postJson('/api/monitoring/frontend-error', [
            'message' => 'Frontend boom 11',
        ])->assertTooManyRequests();
    }
}
