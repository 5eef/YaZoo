<?php

namespace Tests\Feature\Feed;

use App\Models\Comment;
use App\Models\Community;
use App\Models\Post;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use RuntimeException;
use Tests\TestCase;

class FeedApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_cannot_access_feed_or_stories(): void
    {
        $this->getJson('/api/posts')->assertUnauthorized();
        $this->getJson('/api/stories')->assertUnauthorized();
    }

    protected function fakeImageUpload(string $name): UploadedFile
    {
        return UploadedFile::fake()->createWithContent(
            $name,
            base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+X2FoAAAAASUVORK5CYII='),
        );
    }

    public function test_authenticated_user_can_list_feed_posts(): void
    {
        $viewer = User::factory()->create();
        $post = Post::factory()->create([
            'content' => 'Premier post YaZoo',
            'tags' => ['chiens', 'astuces'],
        ]);
        Comment::factory()->create([
            'post_id' => $post->id,
        ]);
        $post->likes()->create([
            'user_id' => $viewer->id,
        ]);

        Sanctum::actingAs($viewer, ['*']);

        $response = $this->getJson('/api/posts');

        $response
            ->assertOk()
            ->assertJsonPath('data.0.content', 'Premier post YaZoo')
            ->assertJsonPath('data.0.likes', 1)
            ->assertJsonPath('data.0.liked', true)
            ->assertJsonPath('data.0.userReaction', 'like')
            ->assertJsonPath('data.0.reactions.0.reaction', 'like')
            ->assertJsonPath('data.0.commentsCount', 1)
            ->assertJsonPath('data.0.tags.0', 'chiens');
    }

    public function test_authenticated_user_can_create_post(): void
    {
        Sanctum::actingAs(User::factory()->create(), ['*']);

        $response = $this->postJson('/api/posts', [
            'content' => 'Mon premier post backend.',
            'location' => 'Casablanca',
            'tags' => ['animaux', 'communaute'],
        ]);

        $response
            ->assertCreated()
            ->assertJsonPath('data.content', 'Mon premier post backend.')
            ->assertJsonPath('data.location', 'Casablanca')
            ->assertJsonPath('data.tags.0', 'animaux');

        $this->assertDatabaseHas('posts', [
            'content' => 'Mon premier post backend.',
            'location' => 'Casablanca',
        ]);
    }

    public function test_authenticated_user_can_create_post_with_uploaded_image(): void
    {
        Storage::fake('public');
        Sanctum::actingAs(User::factory()->create(), ['*']);

        $response = $this->post('/api/posts', [
            'content' => 'Post avec image',
            'media_file' => $this->fakeImageUpload('feed.jpg'),
        ], [
            'Accept' => 'application/json',
        ]);

        $response
            ->assertCreated()
            ->assertJsonPath('data.content', 'Post avec image')
            ->assertJsonPath('data.mediaKind', 'image');

        $path = Post::query()->latest()->first()?->media_path;

        $this->assertNotNull($path);
        Storage::disk('public')->assertExists($path);
    }

    public function test_non_member_is_rejected_before_community_media_is_written(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();
        $community = Community::factory()->create();
        Sanctum::actingAs($user, ['*']);

        $this->post('/api/posts', [
            'content' => 'Publication non autorisee',
            'community_id' => $community->id,
            'media_file' => $this->fakeImageUpload('denied.jpg'),
        ], [
            'Accept' => 'application/json',
        ])->assertForbidden();

        $this->assertSame([], Storage::disk('public')->allFiles('feed/posts'));
        $this->assertDatabaseMissing('posts', [
            'community_id' => $community->id,
            'user_id' => $user->id,
        ]);
    }

    public function test_database_failure_after_upload_removes_only_the_new_media(): void
    {
        Storage::fake('public');
        Storage::disk('public')->put('feed/posts/existing.jpg', 'existing-content');
        $user = User::factory()->create();
        Sanctum::actingAs($user, ['*']);
        Post::creating(static function (): void {
            throw new RuntimeException('Simulated database failure.');
        });

        $this->post('/api/posts', [
            'content' => 'Publication qui echoue',
            'media_file' => $this->fakeImageUpload('cleanup.jpg'),
        ], [
            'Accept' => 'application/json',
        ])->assertServerError();

        Storage::disk('public')->assertExists('feed/posts/existing.jpg');
        $this->assertSame(
            ['feed/posts/existing.jpg'],
            Storage::disk('public')->allFiles('feed/posts'),
        );
        $this->assertDatabaseCount('posts', 0);
    }

    public function test_authenticated_user_can_create_post_with_uploaded_video_only(): void
    {
        Storage::fake('public');
        Sanctum::actingAs(User::factory()->create(), ['*']);

        $response = $this->post('/api/posts', [
            'content' => '',
            'media_file' => UploadedFile::fake()->create('clip.mp4', 1024, 'video/mp4'),
        ], [
            'Accept' => 'application/json',
        ]);

        $response
            ->assertCreated()
            ->assertJsonPath('data.mediaKind', 'video');

        $this->assertDatabaseHas('posts', [
            'media_kind' => 'video',
        ]);
    }

    public function test_authenticated_user_can_toggle_like_on_post(): void
    {
        $user = User::factory()->create();
        $post = Post::factory()->create();

        Sanctum::actingAs($user, ['*']);

        $this->postJson("/api/posts/{$post->id}/like", [
            'reaction' => 'love',
        ])
            ->assertOk()
            ->assertJsonPath('data.liked', true)
            ->assertJsonPath('data.userReaction', 'love')
            ->assertJsonPath('data.likes', 1);

        $this->postJson("/api/posts/{$post->id}/like", [
            'reaction' => 'love',
        ])
            ->assertOk()
            ->assertJsonPath('data.liked', false)
            ->assertJsonPath('data.likes', 0);
    }

    public function test_liking_another_users_post_creates_a_notification(): void
    {
        $owner = User::factory()->create();
        $user = User::factory()->create();
        $post = Post::factory()->create([
            'user_id' => $owner->id,
        ]);

        Sanctum::actingAs($user, ['*']);

        $this->postJson("/api/posts/{$post->id}/like")
            ->assertOk();

        $this->assertSame(1, $owner->notifications()->count());
        $this->assertSame('post_like', $owner->notifications()->first()->data['kind']);
    }

    public function test_authenticated_user_can_comment_on_post(): void
    {
        $user = User::factory()->create([
            'name' => 'Comment User',
        ]);
        $post = Post::factory()->create();

        Sanctum::actingAs($user, ['*']);

        $response = $this->postJson("/api/posts/{$post->id}/comments", [
            'body' => 'Voici un commentaire utile.',
            'reaction' => 'happy',
        ]);

        $response
            ->assertCreated()
            ->assertJsonPath('data.body', 'Voici un commentaire utile.')
            ->assertJsonPath('data.reaction', 'happy')
            ->assertJsonPath('data.author.name', 'Comment User');

        $this->assertDatabaseHas('comments', [
            'post_id' => $post->id,
            'user_id' => $user->id,
            'body' => 'Voici un commentaire utile.',
            'reaction' => 'happy',
        ]);
    }

    public function test_authenticated_user_can_reply_to_comment_and_react(): void
    {
        $user = User::factory()->create();
        $post = Post::factory()->create();
        $comment = Comment::factory()->create([
            'post_id' => $post->id,
        ]);

        Sanctum::actingAs($user, ['*']);

        $replyResponse = $this->postJson("/api/posts/{$post->id}/comments", [
            'body' => 'Merci pour le conseil.',
            'parent_id' => $comment->id,
            'reaction' => 'love',
        ]);

        $replyResponse
            ->assertCreated()
            ->assertJsonPath('data.parentId', $comment->id)
            ->assertJsonPath('data.reaction', 'love');

        $replyId = $replyResponse->json('data.id');

        $this->postJson("/api/comments/{$replyId}/reaction", [
            'reaction' => 'wow',
        ])
            ->assertOk()
            ->assertJsonPath('data.reaction', 'wow');
    }

    public function test_authenticated_user_cannot_change_another_users_comment_reaction(): void
    {
        $owner = User::factory()->create();
        $otherUser = User::factory()->create();
        $comment = Comment::factory()->create([
            'user_id' => $owner->id,
            'reaction' => 'love',
        ]);

        Sanctum::actingAs($otherUser, ['*']);

        $this->postJson("/api/comments/{$comment->id}/reaction", [
            'reaction' => 'angry',
        ])->assertForbidden();

        $this->assertDatabaseHas('comments', [
            'id' => $comment->id,
            'reaction' => 'love',
        ]);
    }

    public function test_commenting_another_users_post_creates_a_notification(): void
    {
        $owner = User::factory()->create();
        $user = User::factory()->create([
            'name' => 'Comment User',
        ]);
        $post = Post::factory()->create([
            'user_id' => $owner->id,
        ]);

        Sanctum::actingAs($user, ['*']);

        $this->postJson("/api/posts/{$post->id}/comments", [
            'body' => 'Voici un commentaire utile.',
        ])
            ->assertCreated();

        $this->assertSame(1, $owner->notifications()->count());
        $this->assertSame('post_comment', $owner->notifications()->first()->data['kind']);
    }
}
