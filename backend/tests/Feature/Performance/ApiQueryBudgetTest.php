<?php

namespace Tests\Feature\Performance;

use App\Models\Conversation;
use App\Models\Post;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Testing\TestResponse;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ApiQueryBudgetTest extends TestCase
{
    use RefreshDatabase;

    public function test_feed_query_count_stays_bounded_with_social_signals_and_replies(): void
    {
        $viewer = User::factory()->create();
        $authors = User::factory()->count(12)->create();
        $reactors = User::factory()->count(4)->create();
        $viewer->following()->syncWithoutDetaching($authors->modelKeys());

        foreach ($authors as $author) {
            $post = Post::factory()->for($author)->create([
                'community_id' => null,
                'visibility' => Post::VISIBILITY_PUBLIC,
                'moderation_status' => 'active',
            ]);

            foreach (Post::REACTIONS as $index => $reaction) {
                $post->likes()->create([
                    'user_id' => $reactors[$index]->id,
                    'reaction' => $reaction,
                ]);
            }

            $comment = $post->comments()->create([
                'user_id' => $author->id,
                'body' => 'Commentaire racine',
            ]);

            foreach (range(1, 5) as $reply) {
                $post->comments()->create([
                    'user_id' => $reactors[$reply % $reactors->count()]->id,
                    'parent_id' => $comment->id,
                    'body' => "Reponse {$reply}",
                ]);
            }
        }

        Sanctum::actingAs($viewer, ['*']);

        [$response, $queryCount] = $this->captureQueries(
            fn () => $this->getJson('/api/posts?per_page=20'),
        );

        $response
            ->assertOk()
            ->assertJsonCount(12, 'data')
            ->assertJsonCount(4, 'data.0.reactions')
            ->assertJsonCount(3, 'data.0.comments.0.replies')
            ->assertJsonPath('data.0.comments.0.repliesCount', 5)
            ->assertJsonPath('data.0.author.isFollowing', true);

        $this->assertLessThanOrEqual(12, $queryCount, "Le feed a execute {$queryCount} requetes SQL.");
    }

    public function test_conversation_list_query_count_does_not_grow_per_participant(): void
    {
        $viewer = User::factory()->create();
        $participants = User::factory()->count(12)->create();
        $viewer->following()->syncWithoutDetaching($participants->modelKeys());

        foreach ($participants as $participant) {
            [$firstId, $secondId] = collect([$viewer->id, $participant->id])->sort()->values()->all();
            $conversation = Conversation::query()->create([
                'participant_one_id' => $firstId,
                'participant_two_id' => $secondId,
            ]);
            $conversation->messages()->create([
                'user_id' => $participant->id,
                'body' => 'Bonjour',
            ]);
        }

        Sanctum::actingAs($viewer, ['*']);

        [$response, $queryCount] = $this->captureQueries(
            fn () => $this->getJson('/api/conversations?per_page=20'),
        );

        $response
            ->assertOk()
            ->assertJsonCount(12, 'data')
            ->assertJsonPath('data.0.participant.is_following', true);

        $this->assertLessThanOrEqual(9, $queryCount, "La liste des conversations a execute {$queryCount} requetes SQL.");
    }

    public function test_user_suggestions_preload_follow_state_in_one_query(): void
    {
        $viewer = User::factory()->create();
        $suggestions = User::factory()->count(20)->create();
        $viewer->following()->syncWithoutDetaching($suggestions->take(5)->modelKeys());

        Sanctum::actingAs($viewer, ['*']);

        [$response, $queryCount] = $this->captureQueries(
            fn () => $this->getJson('/api/users/suggestions?limit=20'),
        );

        $response->assertOk()->assertJsonCount(20, 'data');

        $this->assertLessThanOrEqual(3, $queryCount, "Les suggestions ont execute {$queryCount} requetes SQL.");
    }

    /**
     * @return array{0: TestResponse, 1: int}
     */
    private function captureQueries(callable $request): array
    {
        DB::flushQueryLog();
        DB::enableQueryLog();

        try {
            $response = $request();
            $queryCount = count(DB::getQueryLog());
        } finally {
            DB::disableQueryLog();
        }

        return [$response, $queryCount];
    }
}
