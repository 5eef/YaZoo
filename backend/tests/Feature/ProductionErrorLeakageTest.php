<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Route;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Tests\TestCase;

class ProductionErrorLeakageTest extends TestCase
{
    public function test_server_http_errors_hide_internal_messages_when_debug_is_disabled(): void
    {
        config(['app.debug' => false]);
        Route::get('/api/test-production-error', function (): void {
            throw new HttpException(503, 'SQL internal path /private/config secret-test-only');
        });

        $response = $this->getJson('/api/test-production-error');
        $response->assertStatus(503)->assertJsonPath('error', 'server.internal');
        $this->assertStringNotContainsString('secret-test-only', $response->getContent());
        $this->assertStringNotContainsString('/private/config', $response->getContent());
        $this->assertStringNotContainsString('SQL', $response->getContent());
    }
}
