<?php

namespace Tests\Feature;

use App\Models\MediaAsset;
use App\Models\Post;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PostMediaSecurityTest extends TestCase
{
    use RefreshDatabase;

    public function test_private_post_media_checks_visibility_for_get_head_and_range_requests(): void
    {
        Storage::fake('private');
        $owner = User::factory()->create();
        $post = Post::factory()->create(['user_id' => $owner->id, 'visibility' => 'private', 'media_path' => 'feed/posts/test.mp4', 'media_kind' => 'video']);
        Storage::disk('private')->put($post->media_path, '0123456789');
        $asset = $owner->ownedMediaAssets()->create([
            'disk' => 'private', 'path' => $post->media_path, 'path_hash' => hash('sha256', $post->media_path),
            'kind' => 'video', 'visibility' => 'private', 'state' => MediaAsset::STATE_ACTIVE,
        ]);
        $asset->forceFill(['attachable_type' => $post->getMorphClass(), 'attachable_id' => $post->id])->save();
        $url = '/api/media/posts/'.$post->id;
        $this->get($url)->assertUnauthorized();
        Sanctum::actingAs(User::factory()->create());
        $this->get($url)->assertNotFound();
        $this->head($url)->assertNotFound();
        $this->get($url, ['Range' => 'bytes=0-3'])->assertNotFound();
        Sanctum::actingAs($owner);
        $this->get($url)->assertOk()->assertHeader('Cache-Control', 'no-store, private');
        $this->get($url, ['Range' => 'bytes=0-3'])->assertStatus(206)->assertHeader('Content-Range', 'bytes 0-3/10');
        $this->get($url, ['Range' => 'bytes=99-100'])->assertStatus(416);
        $this->head($url)->assertOk();
        $post->delete();
        $this->get($url)->assertNotFound();
    }

    public function test_legacy_files_still_use_authorization_when_a_public_post_becomes_private(): void
    {
        Storage::fake('public');
        $post = Post::factory()->create(['media_path' => 'feed/posts/legacy.png', 'visibility' => 'public']);
        Storage::disk('public')->put($post->media_path, 'fixture');
        Sanctum::actingAs(User::factory()->create());
        $url = '/api/media/posts/'.$post->id;
        $this->get($url)->assertOk();
        $post->update(['visibility' => 'private']);
        $this->get($url)->assertNotFound();
    }
}
