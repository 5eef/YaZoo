<?php

namespace Tests\Feature\Messaging;

use App\Models\Conversation;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Crypt;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PrivateChannelAuthorizationTest extends TestCase
{
    use RefreshDatabase;

    public function test_private_channels_reject_other_accounts_and_allow_participants(): void
    {
        config(['broadcasting.default' => 'reverb', 'broadcasting.connections.reverb' => [
            'driver' => 'reverb', 'key' => 'fixture-key', 'secret' => 'fixture-secret',
            'app_id' => 'fixture-app', 'options' => ['host' => '127.0.0.1', 'port' => 8081, 'scheme' => 'http', 'useTLS' => false],
        ]]);
        require base_path('routes/channels.php');
        [$first, $second, $outsider] = User::factory()->count(3)->create()->all();
        $conversation = Conversation::query()->create([
            'participant_one_id' => min($first->id, $second->id),
            'participant_two_id' => max($first->id, $second->id),
        ]);
        Sanctum::actingAs($outsider);
        foreach (["users.{$first->id}", "conversations.{$conversation->id}"] as $channel) {
            $this->postJson('/broadcasting/auth', ['socket_id' => '123.456', 'channel_name' => 'private-'.$channel])->assertForbidden();
        }
        Sanctum::actingAs($first);
        foreach (["users.{$first->id}", "conversations.{$conversation->id}"] as $channel) {
            $this->postJson('/broadcasting/auth', ['socket_id' => '123.456', 'channel_name' => 'private-'.$channel])->assertOk()->assertJsonStructure(['auth']);
        }
    }

    public function test_cookie_channel_authorization_requires_csrf(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('fixture')->plainTextToken;
        $this->withCredentials()->withUnencryptedCookie('yazoo_api_token', Crypt::encryptString($token))
            ->postJson('/broadcasting/auth', ['socket_id' => '123.456', 'channel_name' => 'private-users.1'])
            ->assertStatus(419);
    }
}
