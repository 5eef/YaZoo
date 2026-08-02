<?php

namespace App\Events;

use App\Http\Resources\Notification\NotificationResource;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Contracts\Events\ShouldDispatchAfterCommit;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class UserNotificationCreated implements ShouldBroadcast, ShouldDispatchAfterCommit
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public int $tries = 3;

    /** @var list<int> */
    public array $backoff = [1, 5, 15];

    /**
     * Create a new event instance.
     */
    public function __construct(
        protected Model $notification,
        protected int $userId,
        protected int $unreadCount,
    ) {}

    /**
     * Broadcast the event on the private user channel.
     *
     * @return array<int, PrivateChannel>
     */
    public function broadcastOn(): array
    {
        return [new PrivateChannel('users.'.$this->userId)];
    }

    /**
     * Customize the broadcast event name.
     */
    public function broadcastAs(): string
    {
        return 'notification.created';
    }

    /**
     * Broadcast a normalized notification payload to the SPA.
     *
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        return [
            'notification' => NotificationResource::make($this->notification)->resolve(),
            'unreadCount' => $this->unreadCount,
        ];
    }
}
