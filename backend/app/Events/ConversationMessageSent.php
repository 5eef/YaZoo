<?php

namespace App\Events;

use App\Models\Conversation;
use App\Models\Message;
use App\Support\MediaStorage;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Contracts\Events\ShouldDispatchAfterCommit;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ConversationMessageSent implements ShouldBroadcast, ShouldDispatchAfterCommit
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public int $tries = 3;

    /** @var list<int> */
    public array $backoff = [1, 5, 15];

    /**
     * Create a new event instance.
     */
    public function __construct(
        protected Conversation $conversation,
        protected Message $message,
    ) {}

    /**
     * Broadcast the event on the private conversation channel.
     *
     * @return array<int, PrivateChannel>
     */
    public function broadcastOn(): array
    {
        return [new PrivateChannel('conversations.'.$this->conversation->id)];
    }

    /**
     * Customize the broadcast event name.
     */
    public function broadcastAs(): string
    {
        return 'message.sent';
    }

    /**
     * Broadcast the new message payload required by the SPA.
     *
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        $sender = $this->message->sender;

        return [
            'conversation' => [
                'id' => $this->conversation->id,
                'updatedAt' => $this->conversation->updated_at?->toISOString(),
            ],
            'message' => [
                'id' => $this->message->id,
                'body' => $this->message->body,
                'createdAt' => $this->message->created_at?->toISOString(),
                'readAt' => $this->message->read_at?->toISOString(),
                'sender' => [
                    'id' => $sender?->id,
                    'name' => $sender?->name,
                    'avatar' => MediaStorage::resolveUrl($sender?->avatar),
                ],
            ],
        ];
    }
}
