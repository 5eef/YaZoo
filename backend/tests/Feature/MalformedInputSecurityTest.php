<?php

namespace Tests\Feature;

use App\Models\Post;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class MalformedInputSecurityTest extends TestCase
{
    use RefreshDatabase;

    public function test_wrong_types_return_validation_errors_instead_of_server_errors(): void
    {
        Sanctum::actingAs(User::factory()->create(), ['*']);
        $post = Post::factory()->create();
        foreach ([['unexpected'], ['nested' => ['unexpected']], 42, true] as $value) {
            $this->postJson('/api/posts', ['content' => $value])->assertUnprocessable();
            $this->postJson('/api/posts', ['content' => 'Valid text', 'tags' => [$value]])->assertUnprocessable();
            $this->postJson('/api/posts/'.$post->id.'/comments', ['body' => $value])->assertUnprocessable();
            $this->postJson('/api/reports', ['reportable_type' => $value, 'reportable_id' => $post->id, 'reason' => 'other'])->assertUnprocessable();
            $this->getJson('/api/search?'.http_build_query(['q' => $value]))->assertStatus(is_array($value) ? 422 : 200);
        }
    }

    public function test_auth_rate_limit_and_normalization_handle_arrays_without_throwing(): void
    {
        $this->postJson('/api/auth/mobile/login', ['email' => ['invalid'], 'phone' => ['invalid'], 'password' => ['invalid'], 'device_name' => 'test'])->assertUnprocessable();
        $this->postJson('/api/auth/password/forgot', ['channel' => ['invalid'], 'identifier' => ['invalid']])->assertUnprocessable();
    }
}
