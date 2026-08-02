<?php

namespace App\Http\Controllers\Api;

use App\DTOs\PaginationData;
use App\Events\ConversationMessageSent;
use App\Http\Controllers\Controller;
use App\Http\Requests\Messaging\StoreConversationRequest;
use App\Http\Resources\Messaging\ConversationResource;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\User;
use App\Notifications\NewMessageNotification;
use App\Services\ActivityLogger;
use App\Support\PhoneNumber;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ConversationController extends Controller
{
    public function __construct(
        protected ActivityLogger $activityLogger,
    ) {}

    /**
     * Display the authenticated user's conversations.
     */
    public function index(Request $request)
    {
        $pagination = PaginationData::fromRequest($request, 20, 50);

        $conversations = Conversation::query()
            ->where(function ($query) use ($request) {
                $query
                    ->where('participant_one_id', $request->user()->id)
                    ->orWhere('participant_two_id', $request->user()->id);
            })
            ->with($this->participantRelations($request->user()->id))
            ->withCount([
                'messages as unread_messages_count' => fn ($query) => $query
                    ->where('user_id', '!=', $request->user()->id)
                    ->whereNull('read_at'),
            ])
            ->orderByDesc('updated_at')
            ->paginate($pagination->perPage);

        return ConversationResource::collection($conversations);
    }

    public function unreadCount(Request $request): JsonResponse
    {
        $userId = $request->user()->id;

        $unreadCount = Message::query()
            ->where('user_id', '!=', $userId)
            ->whereNull('read_at')
            ->whereHas('conversation', function ($query) use ($userId): void {
                $query
                    ->where('participant_one_id', $userId)
                    ->orWhere('participant_two_id', $userId);
            })
            ->count();

        return response()->json([
            'data' => [
                'unreadCount' => $unreadCount,
                'unread_count' => $unreadCount,
            ],
        ]);
    }

    /**
     * Start a conversation or reuse an existing one.
     */
    public function store(StoreConversationRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $recipient = $this->resolveRecipient($validated);

        [$conversation, $statusCode] = DB::transaction(function () use ($request, $recipient, $validated): array {
            [$conversation, $wasCreated] = $this->findOrCreateConversation($request->user(), $recipient);
            $body = trim((string) ($validated['body'] ?? ''));

            if ($body !== '') {
                $message = $conversation->messages()->create([
                    'user_id' => $request->user()->id,
                    'body' => $body,
                ]);

                $message->load('sender:id,name,avatar');
                $conversation->refresh();
                $this->notifyRecipient($conversation, $request->user()->id, $message);
                $this->logMessageActivity('message.sent', $request->user(), $conversation, $recipient);
                event((new ConversationMessageSent($conversation, $message))->dontBroadcastToCurrentUser());
            }

            if ($wasCreated) {
                $this->logMessageActivity('message.conversation_started', $request->user(), $conversation, $recipient);
            }

            return [$conversation, $wasCreated ? 201 : 200];
        });

        $this->loadConversationState($conversation, $request->user()->id, true);

        return ConversationResource::make($conversation)
            ->response()
            ->setStatusCode($statusCode);
    }

    /**
     * Start or reuse a direct conversation using the user_id contract expected by the app.
     */
    public function direct(StoreConversationRequest $request): JsonResponse
    {
        return $this->store($request);
    }

    /**
     * Display a specific conversation and mark incoming messages as read.
     */
    public function show(Request $request, Conversation $conversation): ConversationResource
    {
        $this->ensureParticipant($conversation, $request->user()->id);
        $this->markIncomingMessagesAsRead($conversation, $request->user()->id);
        $this->markConversationNotificationsAsRead($request->user(), $conversation->id);
        $this->loadConversationState($conversation, $request->user()->id, true);

        return ConversationResource::make($conversation);
    }

    /**
     * Mark a conversation as read for the authenticated participant.
     */
    public function read(Request $request, Conversation $conversation): ConversationResource
    {
        $this->ensureParticipant($conversation, $request->user()->id);
        $this->markIncomingMessagesAsRead($conversation, $request->user()->id);
        $this->markConversationNotificationsAsRead($request->user(), $conversation->id);
        $this->logMessageActivity('message.read', $request->user(), $conversation);
        $this->loadConversationState($conversation, $request->user()->id, true);

        return ConversationResource::make($conversation);
    }

    /**
     * Find an existing conversation or create a new one for two users.
     *
     * @return array{0: Conversation, 1: bool}
     */
    protected function findOrCreateConversation(User $user, User $recipient): array
    {
        [$participantOneId, $participantTwoId] = collect([$user->id, $recipient->id])
            ->sort()
            ->values()
            ->all();

        $conversation = Conversation::query()->firstOrCreate([
            'participant_one_id' => $participantOneId,
            'participant_two_id' => $participantTwoId,
        ]);

        return [$conversation, $conversation->wasRecentlyCreated];
    }

    /**
     * Ensure the authenticated user belongs to the conversation.
     */
    protected function ensureParticipant(Conversation $conversation, int $userId): void
    {
        abort_unless($conversation->hasParticipant($userId), 403, 'Acces non autorise a cette conversation.');
    }

    /**
     * Mark unread incoming messages as read.
     */
    protected function markIncomingMessagesAsRead(Conversation $conversation, int $userId): void
    {
        $conversation->messages()
            ->where('user_id', '!=', $userId)
            ->whereNull('read_at')
            ->update([
                'read_at' => now(),
            ]);
    }

    /**
     * Mark unread message notifications linked to the conversation as read.
     */
    protected function markConversationNotificationsAsRead(User $user, int $conversationId): void
    {
        $user->unreadNotifications()
            ->where('type', NewMessageNotification::class)
            ->where('data->conversation_id', $conversationId)
            ->update(['read_at' => now()]);
    }

    /**
     * Notify the other participant about a new message.
     */
    protected function notifyRecipient(Conversation $conversation, int $senderId, Message $message): void
    {
        $conversation->loadMissing([
            'participantOne:id,name,email,phone,avatar,city,country',
            'participantTwo:id,name,email,phone,avatar,city,country',
        ]);

        $recipient = $conversation->otherParticipantFor($senderId);
        $sender = $senderId === $conversation->participant_one_id
            ? $conversation->participantOne
            : $conversation->participantTwo;

        if ($recipient && $sender && ! $recipient->is($sender)) {
            $recipient->notify(new NewMessageNotification($conversation, $message, $sender));
        }
    }

    /**
     * Load all relations required by the frontend.
     */
    protected function loadConversationState(
        Conversation $conversation,
        int $userId,
        bool $withMessages = false,
    ): void {
        $relations = $this->participantRelations($userId);

        if ($withMessages) {
            $relations['messages'] = fn ($query) => $query
                ->latest()
                ->limit(50)
                ->with('sender:id,name,avatar');
        }

        $conversation->load($relations)->loadCount([
            'messages as unread_messages_count' => fn ($query) => $query
                ->where('user_id', '!=', $userId)
                ->whereNull('read_at'),
        ]);

        if ($withMessages && $conversation->relationLoaded('messages')) {
            $conversation->setRelation(
                'messages',
                $conversation->messages->sortBy('created_at')->values(),
            );
        }
    }

    /**
     * Resolve the conversation recipient from either a private user id or a public contact.
     *
     * @param  array{recipient_id?: int|string|null, recipient_contact?: string|null}  $validated
     */
    protected function resolveRecipient(array $validated): User
    {
        if (! empty($validated['recipient_id'])) {
            return User::query()->whereKey($validated['recipient_id'])->firstOrFail();
        }

        $contact = (string) ($validated['recipient_contact'] ?? '');
        $phone = PhoneNumber::normalize($contact);

        return User::query()
            ->where('email', $contact)
            ->orWhere('phone', $phone)
            ->firstOrFail();
    }

    /**
     * @return array<string, mixed>
     */
    private function participantRelations(int $viewerId): array
    {
        $participant = fn ($query) => $query
            ->select('id', 'name', 'email', 'phone', 'phone_verified_at', 'avatar', 'city', 'country')
            ->withExists([
                'followers as is_followed_by_viewer' => fn ($followers) => $followers
                    ->where('follower_user_id', $viewerId),
            ]);

        return [
            'participantOne' => $participant,
            'participantTwo' => $participant,
            'latestMessage.sender:id,name,avatar',
        ];
    }

    protected function logMessageActivity(
        string $event,
        User $actor,
        Conversation $conversation,
        ?User $target = null,
    ): void {
        $targetUserId = $target?->id ?? $conversation->otherParticipantFor($actor->id)?->id;

        $this->activityLogger->log(
            $event,
            'message',
            $conversation,
            [
                'conversation_id' => $conversation->id,
                'target_user_id' => $targetUserId,
                'sender_id' => $actor->id,
            ],
            $actor,
            $actor,
        );
    }
}
