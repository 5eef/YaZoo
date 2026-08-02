<?php

namespace Tests\Feature\Feed;

use App\Models\Comment;
use App\Models\Community;
use App\Models\CommunityMember;
use App\Models\Post;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PostVisibilityAuthorizationTest extends TestCase
{
    use RefreshDatabase;

    public function test_non_member_cannot_discover_or_interact_with_private_community_content_by_id(): void
    {
        $owner = User::factory()->create();
        $outsider = User::factory()->create();
        $community = Community::factory()->create([
            'user_id' => $owner->id,
            'name' => 'Private Atlas Circle',
            'is_private' => true,
        ]);
        $post = Post::factory()->create([
            'user_id' => $owner->id,
            'community_id' => $community->id,
            'content' => 'Private Atlas content',
            'visibility' => Post::VISIBILITY_PUBLIC,
            'moderation_status' => 'active',
        ]);

        Sanctum::actingAs($outsider, ['*']);

        $this->getJson('/api/search?q=Atlas')
            ->assertOk()
            ->assertJsonCount(0, 'data.communities')
            ->assertJsonCount(0, 'data.posts');
        $this->getJson('/api/communities')->assertJsonMissing(['id' => $community->id]);
        $this->getJson("/api/communities/{$community->id}")->assertForbidden();
        $this->getJson("/api/posts?community_id={$community->id}")->assertForbidden();
        $this->postJson("/api/posts/{$post->id}/like")->assertForbidden();
        $this->postJson("/api/posts/{$post->id}/comments", ['body' => 'Forbidden'])->assertForbidden();
        $this->patchJson("/api/posts/{$post->id}", ['content' => 'Hijacked'])->assertForbidden();
        $this->deleteJson("/api/posts/{$post->id}")->assertForbidden();

        $this->assertDatabaseHas('posts', ['id' => $post->id, 'content' => 'Private Atlas content']);
        $this->assertDatabaseCount('likes', 0);
        $this->assertDatabaseCount('comments', 0);
    }

    public function test_approved_member_can_discover_and_interact_with_active_private_community_post(): void
    {
        $owner = User::factory()->create();
        $member = User::factory()->create();
        $community = Community::factory()->create([
            'user_id' => $owner->id,
            'name' => 'Private Atlas Circle',
            'is_private' => true,
        ]);
        CommunityMember::factory()->create([
            'community_id' => $community->id,
            'user_id' => $member->id,
            'status' => 'approved',
            'role' => 'member',
        ]);
        $post = Post::factory()->create([
            'user_id' => $owner->id,
            'community_id' => $community->id,
            'content' => 'Private Atlas content',
            'visibility' => Post::VISIBILITY_PUBLIC,
            'moderation_status' => 'active',
        ]);

        Sanctum::actingAs($member, ['*']);

        $this->getJson('/api/search?q=Atlas')
            ->assertOk()
            ->assertJsonPath('data.communities.0.id', $community->id)
            ->assertJsonPath('data.posts.0.id', $post->id);
        $this->getJson("/api/posts?community_id={$community->id}")
            ->assertOk()
            ->assertJsonPath('data.0.id', $post->id);
        $this->postJson("/api/posts/{$post->id}/like")->assertOk();
        $this->postJson("/api/posts/{$post->id}/comments", ['body' => 'Allowed'])->assertCreated();
    }

    public function test_moderated_post_is_visible_to_author_and_authorized_moderator_but_not_interactable(): void
    {
        $owner = User::factory()->create();
        $moderator = User::factory()->create();
        $outsider = User::factory()->create();
        $community = Community::factory()->create([
            'user_id' => $owner->id,
            'is_private' => true,
        ]);
        CommunityMember::factory()->create([
            'community_id' => $community->id,
            'user_id' => $moderator->id,
            'status' => 'approved',
            'role' => 'admin',
        ]);
        $post = Post::factory()->create([
            'user_id' => $owner->id,
            'community_id' => $community->id,
            'content' => 'Suspended Atlas post',
            'visibility' => Post::VISIBILITY_PRIVATE,
            'moderation_status' => 'suspended',
        ]);

        Sanctum::actingAs($outsider, ['*']);
        $this->getJson('/api/search?q=Atlas')->assertJsonCount(0, 'data.posts');
        $this->postJson("/api/posts/{$post->id}/like")->assertForbidden();

        Sanctum::actingAs($moderator, ['*']);
        $this->getJson('/api/search?q=Atlas')->assertJsonPath('data.posts.0.id', $post->id);
        $this->postJson("/api/posts/{$post->id}/like")->assertForbidden();

        Sanctum::actingAs($owner, ['*']);
        $this->getJson("/api/posts?community_id={$community->id}")
            ->assertOk()
            ->assertJsonPath('data.0.id', $post->id);
        $this->postJson("/api/posts/{$post->id}/comments", ['body' => 'Not while suspended'])
            ->assertForbidden();
    }

    public function test_followers_and_private_audiences_are_enforced_for_feed_search_and_comment_reactions(): void
    {
        $author = User::factory()->create();
        $follower = User::factory()->create();
        $outsider = User::factory()->create();
        $follower->following()->attach($author->id);

        $followersPost = Post::factory()->create([
            'user_id' => $author->id,
            'content' => 'Followers Atlas post',
            'visibility' => Post::VISIBILITY_FOLLOWERS,
            'moderation_status' => 'active',
        ]);
        $privatePost = Post::factory()->create([
            'user_id' => $author->id,
            'content' => 'Private Atlas post',
            'visibility' => Post::VISIBILITY_PRIVATE,
            'moderation_status' => 'active',
        ]);
        $comment = Comment::factory()->create([
            'post_id' => $privatePost->id,
            'user_id' => $outsider->id,
        ]);

        Sanctum::actingAs($outsider, ['*']);
        $this->getJson('/api/search?q=Followers')->assertJsonCount(0, 'data.posts');
        $this->postJson("/api/comments/{$comment->id}/reaction", ['reaction' => 'like'])->assertForbidden();

        Sanctum::actingAs($follower, ['*']);
        $this->getJson('/api/search?q=Followers')->assertJsonPath('data.posts.0.id', $followersPost->id);
        $this->getJson('/api/search?q=Private')->assertJsonCount(0, 'data.posts');
    }
}
