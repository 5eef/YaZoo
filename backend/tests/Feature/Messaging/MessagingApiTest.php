<?php

namespace Tests\Feature\Messaging;

use App\Models\Conversation;
use App\Models\User;
use App\Notifications\NewMessageNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class MessagingApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_authenticated_user_can_create_conversation_with_initial_message(): void
    {
        $sender = User::factory()->create([
            'name' => 'Sender User',
            'email' => 'sender@example.com',
        ]);
        $recipient = User::factory()->create([
            'name' => 'Recipient User',
            'email' => 'recipient@example.com',
        ]);

        Sanctum::actingAs($sender, ['*']);

        $response = $this->postJson('/api/conversations/direct', [
            'recipient_email' => $recipient->email,
            'body' => 'Bonjour, je veux parler de votre annonce.',
        ]);

        $conversationId = $response->json('data.id');

        $response
            ->assertCreated()
            ->assertJsonPath('data.participant.id', $recipient->id)
            ->assertJsonPath('data.messages.0.body', 'Bonjour, je veux parler de votre annonce.');

        $this->assertDatabaseHas('conversations', [
            'id' => $conversationId,
        ]);

        $this->assertDatabaseHas('messages', [
            'conversation_id' => $conversationId,
            'user_id' => $sender->id,
            'body' => 'Bonjour, je veux parler de votre annonce.',
        ]);

        $this->assertSame(1, $recipient->notifications()->count());
        $this->assertSame(NewMessageNotification::class, $recipient->notifications()->first()->type);
    }

    public function test_authenticated_user_can_open_conversation_from_profile_user_id(): void
    {
        $sender = User::factory()->create();
        $recipient = User::factory()->create([
            'name' => 'Profil consulte',
            'email' => 'profile@example.com',
        ]);

        Sanctum::actingAs($sender, ['*']);

        $response = $this->postJson('/api/conversations/direct', [
            'user_id' => $recipient->id,
        ]);

        $conversationId = $response->json('data.id');

        $response
            ->assertCreated()
            ->assertJsonPath('data.participant.id', $recipient->id)
            ->assertJsonCount(0, 'data.messages');

        $this->assertDatabaseHas('conversations', [
            'id' => $conversationId,
        ]);

        $this->assertDatabaseMissing('messages', [
            'conversation_id' => $conversationId,
        ]);
    }

    public function test_authenticated_user_can_list_and_open_conversations(): void
    {
        $viewer = User::factory()->create();
        $otherUser = User::factory()->create([
            'name' => 'Autre utilisateur',
            'email' => 'autre@example.com',
        ]);

        $conversation = Conversation::query()->create([
            'participant_one_id' => min($viewer->id, $otherUser->id),
            'participant_two_id' => max($viewer->id, $otherUser->id),
        ]);

        $conversation->messages()->create([
            'user_id' => $otherUser->id,
            'body' => 'Salut, toujours disponible ?',
        ]);

        $conversation->messages()->create([
            'user_id' => $viewer->id,
            'body' => 'Oui, bien sur.',
            'read_at' => now(),
        ]);

        Sanctum::actingAs($viewer, ['*']);

        $this->getJson('/api/conversations')
            ->assertOk()
            ->assertJsonPath('data.0.participant.id', $otherUser->id)
            ->assertJsonPath('data.0.unreadCount', 1);

        $this->getJson("/api/conversations/{$conversation->id}")
            ->assertOk()
            ->assertJsonCount(2, 'data.messages')
            ->assertJsonPath('data.unreadCount', 0);

        $this->assertNotNull(
            $conversation->messages()
                ->where('user_id', $otherUser->id)
                ->first()
                ?->fresh()
                ?->read_at,
        );
    }

    public function test_read_endpoint_marks_conversation_as_read(): void
    {
        $viewer = User::factory()->create();
        $otherUser = User::factory()->create();

        $conversation = Conversation::query()->create([
            'participant_one_id' => min($viewer->id, $otherUser->id),
            'participant_two_id' => max($viewer->id, $otherUser->id),
        ]);

        $conversation->messages()->create([
            'user_id' => $otherUser->id,
            'body' => 'Message non lu.',
        ]);

        Sanctum::actingAs($viewer, ['*']);

        $this->patchJson("/api/conversations/{$conversation->id}/read")
            ->assertOk()
            ->assertJsonPath('data.unread_count', 0);

        $this->assertNotNull(
            $conversation->messages()->where('user_id', $otherUser->id)->first()?->fresh()?->read_at,
        );
    }

    public function test_authenticated_user_can_send_message_in_existing_conversation(): void
    {
        $sender = User::factory()->create();
        $recipient = User::factory()->create();
        $conversation = Conversation::query()->create([
            'participant_one_id' => min($sender->id, $recipient->id),
            'participant_two_id' => max($sender->id, $recipient->id),
        ]);

        Sanctum::actingAs($sender, ['*']);

        $this->postJson("/api/conversations/{$conversation->id}/messages", [
            'body' => 'Je peux passer demain ?',
        ])
            ->assertCreated()
            ->assertJsonPath('data.body', 'Je peux passer demain ?')
            ->assertJsonPath('conversation.participant.id', $recipient->id);

        $this->assertDatabaseHas('messages', [
            'conversation_id' => $conversation->id,
            'user_id' => $sender->id,
            'body' => 'Je peux passer demain ?',
        ]);
    }

    public function test_user_cannot_access_a_conversation_without_being_participant(): void
    {
        $viewer = User::factory()->create();
        $participantOne = User::factory()->create();
        $participantTwo = User::factory()->create();
        $conversation = Conversation::query()->create([
            'participant_one_id' => min($participantOne->id, $participantTwo->id),
            'participant_two_id' => max($participantOne->id, $participantTwo->id),
        ]);

        Sanctum::actingAs($viewer, ['*']);

        $this->getJson("/api/conversations/{$conversation->id}")
            ->assertForbidden();
    }
}
