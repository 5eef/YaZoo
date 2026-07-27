<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

class HealthControllerTest extends TestCase
{
    public function test_live_and_ready_expose_the_active_version_and_safe_checks(): void
    {
        config([
            'app.version' => 'test-sha',
            'cache.default' => 'array',
            'queue.default' => 'sync',
            'session.driver' => 'array',
            'operations.run_scheduler' => false,
        ]);

        $this->getJson('/health/live')
            ->assertOk()
            ->assertJson([
                'status' => 'ok',
                'service' => 'yazoo-api',
                'version' => 'test-sha',
            ]);

        $this->getJson('/health/ready')
            ->assertOk()
            ->assertJsonPath('checks.database.ok', true)
            ->assertJsonPath('checks.redis.skipped', true)
            ->assertJsonPath('checks.queue.skipped', true)
            ->assertJsonPath('checks.scheduler.skipped', true);
    }

    public function test_ready_fails_closed_when_required_heartbeats_are_missing(): void
    {
        Cache::flush();
        config([
            'cache.default' => 'array',
            'queue.default' => 'database',
            'session.driver' => 'array',
            'operations.run_scheduler' => true,
        ]);

        $this->getJson('/health/ready')
            ->assertServiceUnavailable()
            ->assertJsonPath('status', 'degraded')
            ->assertJsonPath('checks.queue.error', 'heartbeat_missing')
            ->assertJsonPath('checks.scheduler.error', 'heartbeat_missing');
    }
}
