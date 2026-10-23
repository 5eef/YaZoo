<?php

namespace Tests\Feature;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

class MediaRateLimitTest extends TestCase
{
    public function test_exhausted_media_budget_returns_429_without_exhausting_action_budget(): void
    {
        Route::get('/api/media/rate-fixture', fn () => response()->noContent())->middleware('throttle:api');
        Route::get('/api/action-rate-fixture', fn () => response()->noContent())->middleware('throttle:api');
        $limiter = RateLimiter::limiter('api');
        $media = $limiter(Request::create('/api/media/rate-fixture', 'GET', [], [], [], ['REMOTE_ADDR' => '127.0.0.1']));
        // Exercise the public middleware contract instead of copying its private key hash.
        for ($i = 0; $i < $media->maxAttempts; $i++) {
            $this->get('/api/media/rate-fixture')->assertNoContent();
        }
        $this->get('/api/media/rate-fixture', ['Range' => 'bytes=0-3'])->assertStatus(429)->assertHeader('Retry-After');
        $this->head('/api/media/rate-fixture')->assertStatus(429);
        $this->get('/api/action-rate-fixture')->assertNoContent();
    }

    public function test_media_ranges_have_a_separate_bounded_budget_from_api_actions(): void
    {
        $limiter = RateLimiter::limiter('api');
        $actions = $limiter(Request::create('/api/posts'));
        $media = $limiter(Request::create('/api/media/012345678901234567890123'));
        $private = $limiter(Request::create('/api/media/private/012345678901234567890123', 'HEAD'));

        $this->assertSame(120, $actions->maxAttempts);
        $this->assertSame(600, $media->maxAttempts);
        $this->assertSame($media->key, $private->key);
        $this->assertNotSame($actions->key, $media->key);
        $this->assertSame(60, $media->decaySeconds);
        $this->assertSame(120, $limiter(Request::create('/api/media/anything', 'POST'))->maxAttempts);
    }
}
