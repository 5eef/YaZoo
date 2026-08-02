<?php

namespace Tests\Feature\Feed;

use App\Models\Story;
use App\Models\User;
use App\Services\MediaAssetService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class StoryApiTest extends TestCase
{
    use RefreshDatabase;

    protected function fakeImageUpload(string $name): UploadedFile
    {
        return UploadedFile::fake()->createWithContent(
            $name,
            base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+X2FoAAAAASUVORK5CYII='),
        );
    }

    public function test_authenticated_user_can_list_active_stories_grouped_by_user(): void
    {
        $viewer = User::factory()->create();
        $owner = User::factory()->create(['name' => 'Sara Stories']);
        $other = User::factory()->create(['name' => 'Imane Adoption']);

        $ownStory = Story::factory()->for($viewer)->create([
            'content' => 'Ma propre story',
            'created_at' => now()->subMinutes(30),
            'expires_at' => now()->addHours(23),
        ]);

        $unviewedStory = Story::factory()->for($owner)->create([
            'content' => 'Story adoption',
            'created_at' => now()->subMinutes(20),
            'expires_at' => now()->addHours(22),
        ]);

        $viewedStory = Story::factory()->for($other)->create([
            'content' => 'Story deja vue',
            'created_at' => now()->subMinutes(10),
            'expires_at' => now()->addHours(21),
        ]);
        $viewedStory->views()->create([
            'user_id' => $viewer->id,
            'viewed_at' => now()->subMinutes(5),
        ]);

        Story::factory()->for($owner)->create([
            'content' => 'Expiree',
            'expires_at' => now()->subMinute(),
        ]);

        Sanctum::actingAs($viewer, ['*']);

        $response = $this->getJson('/api/stories');

        $response
            ->assertOk()
            ->assertJsonCount(3, 'data')
            ->assertJsonPath('data.0.isOwn', true)
            ->assertJsonPath('data.0.stories.0.content', $ownStory->content)
            ->assertJsonPath('data.1.hasUnviewed', true)
            ->assertJsonPath('data.1.stories.0.content', $unviewedStory->content)
            ->assertJsonPath('data.2.hasUnviewed', false)
            ->assertJsonPath('data.2.stories.0.content', $viewedStory->content);
    }

    public function test_authenticated_user_can_create_story_with_uploaded_media(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();

        Sanctum::actingAs($user, ['*']);

        $response = $this->post('/api/stories', [
            'content' => 'Story du jour',
            'location' => 'Casablanca',
            'media_file' => $this->fakeImageUpload('story.jpg'),
        ], [
            'Accept' => 'application/json',
        ]);

        $response
            ->assertCreated()
            ->assertJsonPath('data.content', 'Story du jour')
            ->assertJsonPath('data.mediaKind', 'image')
            ->assertJsonPath('data.isOwn', true);

        $story = Story::query()->latest()->first();

        $this->assertNotNull($story);
        $this->assertTrue($story->expires_at->isFuture());
        Storage::disk('public')->assertExists($story->media_path);
    }

    public function test_viewing_a_story_records_the_view_once(): void
    {
        $viewer = User::factory()->create();
        $owner = User::factory()->create();
        $story = Story::factory()->for($owner)->create();

        Sanctum::actingAs($viewer, ['*']);

        $this->postJson("/api/stories/{$story->id}/view")
            ->assertOk()
            ->assertJsonPath('data.isViewed', true)
            ->assertJsonPath('data.viewsCount', 1);

        $this->postJson("/api/stories/{$story->id}/view")
            ->assertOk()
            ->assertJsonPath('data.viewsCount', 1);

        $this->assertDatabaseCount('story_views', 1);
        $this->assertDatabaseHas('story_views', [
            'story_id' => $story->id,
            'user_id' => $viewer->id,
        ]);
    }

    public function test_owner_can_delete_story_but_other_user_cannot(): void
    {
        Storage::fake('public');
        $owner = User::factory()->create();
        $intruder = User::factory()->create();
        $story = Story::factory()->for($owner)->create([
            'media_path' => 'feed/stories/example.jpg',
        ]);
        Storage::disk('public')->put('feed/stories/example.jpg', 'fake-image');
        $asset = app(MediaAssetService::class)->registerStoredPath(
            $owner,
            'feed/stories/example.jpg',
            'image',
        );
        app(MediaAssetService::class)->attach($asset, $story, 'media_path');

        Sanctum::actingAs($intruder, ['*']);
        $this->deleteJson("/api/stories/{$story->id}")
            ->assertForbidden();

        Sanctum::actingAs($owner, ['*']);
        $this->deleteJson("/api/stories/{$story->id}")
            ->assertOk()
            ->assertJsonPath('message', 'Story supprimee avec succes.');

        $this->assertDatabaseMissing('stories', [
            'id' => $story->id,
        ]);
        Storage::disk('public')->assertMissing('feed/stories/example.jpg');
    }
}
