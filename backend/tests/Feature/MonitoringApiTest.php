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
