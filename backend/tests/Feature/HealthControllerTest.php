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
            'operations.require_scheduler_heartbeat' => false,
            'operations.require_persistent_storage' => false,
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
            'operations.require_scheduler_heartbeat' => true,
        ]);

        $this->getJson('/health/ready')
            ->assertServiceUnavailable()
            ->assertJsonPath('status', 'degraded')
            ->assertJsonPath('checks.queue.error', 'heartbeat_missing')
            ->assertJsonPath('checks.scheduler.error', 'heartbeat_missing');
    }

    public function test_ready_and_diagnostic_verify_persistent_storage_without_leaking_files(): void
    {
        $root = storage_path('framework/testing/persistent-storage');
        @mkdir($root.'/app/public', 0777, true);
        @mkdir($root.'/app/private', 0777, true);
        config([
            'cache.default' => 'array',
            'queue.default' => 'sync',
            'session.driver' => 'array',
            'operations.require_scheduler_heartbeat' => false,
            'operations.require_persistent_storage' => true,
            'operations.app_service_storage_enabled' => true,
            'operations.persistent_storage_path' => $root,
        ]);

        $this->getJson('/health/ready')
            ->assertOk()
            ->assertJsonPath('checks.persistentStorage.ok', true);

        $this->artisan('yazoo:diagnose-storage --write-test')
            ->expectsOutput('Persistent storage diagnostic passed.')
            ->assertExitCode(0);

        $this->assertEmpty(glob($root.'/app/public/.yazoo-storage-probe-*') ?: []);
        $this->assertEmpty(glob($root.'/app/private/.yazoo-storage-probe-*') ?: []);
    }

    public function test_ready_reports_reverb_unavailable_without_exposing_configuration(): void
    {
        config([
            'cache.default' => 'array',
            'queue.default' => 'sync',
            'session.driver' => 'array',
            'operations.require_scheduler_heartbeat' => false,
            'operations.require_persistent_storage' => false,
            'operations.require_reverb_health' => true,
            'reverb.apps.apps.0.options.host' => '127.0.0.1',
            'reverb.apps.apps.0.options.port' => 1,
        ]);

        $response = $this->getJson('/health/ready')
            ->assertServiceUnavailable()
            ->assertJsonPath('checks.reverb.error', 'reverb_unavailable');

        $response->assertJsonMissingPath('checks.reverb.host')
            ->assertJsonMissingPath('checks.reverb.port')
            ->assertJsonMissingPath('checks.reverb.secret');
    }
}
