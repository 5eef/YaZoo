<?php

namespace Tests\Feature\Feed;

use App\Models\Community;
use App\Models\Post;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ReelsFilterTest extends TestCase
{
    use RefreshDatabase;

    public function test_video_filter_is_paginated_after_visibility_and_moderation_checks(): void
    {
        $owner = User::factory()->create();
        $viewer = User::factory()->create();
        $public = Post::factory()->create(['user_id' => $owner->id, 'media_kind' => 'video', 'visibility' => 'public', 'moderation_status' => 'active']);
        Post::factory()->create(['user_id' => $owner->id, 'media_kind' => 'image', 'visibility' => 'public', 'moderation_status' => 'active']);
        Post::factory()->create(['user_id' => $owner->id, 'media_kind' => 'video', 'visibility' => 'private', 'moderation_status' => 'active']);
        Post::factory()->create(['user_id' => $owner->id, 'media_kind' => 'video', 'visibility' => 'followers', 'moderation_status' => 'active']);
        Post::factory()->create(['user_id' => $owner->id, 'media_kind' => 'video', 'visibility' => 'public', 'moderation_status' => 'hidden']);
        $community = Community::factory()->create(['user_id' => $owner->id, 'is_private' => true]);
        Post::factory()->create(['user_id' => $owner->id, 'community_id' => $community->id, 'media_kind' => 'video', 'visibility' => 'public', 'moderation_status' => 'active']);

        $this->getJson('/api/posts?media_kind=video')->assertUnauthorized();
        Sanctum::actingAs($viewer);
        $this->getJson('/api/posts?media_kind=video&per_page=1')->assertOk()
            ->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $public->id)->assertJsonPath('meta.total', 1);
        $this->getJson('/api/posts?media_kind=invalid')->assertUnprocessable();
        $this->getJson("/api/posts?media_kind=video&community_id={$community->id}")->assertForbidden();
        $this->patchJson("/api/posts/{$public->id}", ['content' => 'Unauthorized'])->assertForbidden();
        $this->deleteJson("/api/posts/{$public->id}")->assertForbidden();
        $this->assertDatabaseHas('posts', ['id' => $public->id]);
    }
}
