<?php

namespace Tests\Feature\Profile;

use App\Models\Animal;
use App\Models\Post;
use App\Models\User;
use App\Models\Veterinarian;
use App\Notifications\UserFollowedNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ProfileApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_social_profile_links_only_active_public_professional_listings(): void
    {
        $owner = User::factory()->create(['email' => 'vet.demo@yazoo.test']);
        $vet = Veterinarian::factory()->create(['user_id' => $owner->id, 'is_active' => true, 'moderation_status' => 'active']);
        Veterinarian::factory()->create(['user_id' => $owner->id, 'is_active' => false, 'moderation_status' => 'active']);
        Veterinarian::factory()->create(['user_id' => $owner->id, 'is_active' => true, 'moderation_status' => 'pending_review']);
        Sanctum::actingAs(User::factory()->create());
        $this->getJson('/api/users/'.$owner->id)->assertOk()->assertJsonPath('data.isDemo', true)
            ->assertJsonPath('data.isProfessionalVerified', false)->assertJsonCount(1, 'data.publicVeterinarians')
            ->assertJsonPath('data.publicVeterinarians.0.id', $vet->id)->assertJsonPath('data.email', null);
    }

    protected function fakeImageUpload(string $name): UploadedFile
    {
        return UploadedFile::fake()->createWithContent(
            $name,
            base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+X2FoAAAAASUVORK5CYII='),
        );
    }

    public function test_authenticated_user_can_view_a_profile_with_counts(): void
    {
        $viewer = User::factory()->create();
        $owner = User::factory()->create([
            'name' => 'Profile Owner',
            'city' => 'Casablanca',
        ]);

        Post::factory()->count(2)->create(['user_id' => $owner->id]);
        Animal::factory()->count(3)->create(['user_id' => $owner->id]);

        Sanctum::actingAs($viewer, ['*']);

        $this->getJson("/api/users/{$owner->id}")
            ->assertOk()
            ->assertJsonPath('data.name', 'Profile Owner')
            ->assertJsonPath('data.postsCount', 2)
            ->assertJsonPath('data.animalsCount', 3)
            ->assertJsonPath('data.city', 'Casablanca');
    }

    public function test_public_profile_hides_private_contact_details_from_other_users(): void
    {
        $viewer = User::factory()->create();
        $owner = User::factory()->create([
            'email' => 'owner@yazoo.app',
            'phone' => '+212611111111',
        ]);

        Sanctum::actingAs($viewer, ['*']);

        $this->getJson("/api/users/{$owner->id}")
            ->assertOk()
            ->assertJsonPath('data.email', null)
            ->assertJsonPath('data.phone', null);
    }

    public function test_owner_can_still_view_private_contact_details_on_own_profile(): void
    {
        $owner = User::factory()->create([
            'email' => 'owner@yazoo.app',
            'phone' => '+212622222222',
        ]);

        Sanctum::actingAs($owner, ['*']);

        $this->getJson("/api/users/{$owner->id}")
            ->assertOk()
            ->assertJsonPath('data.email', 'owner@yazoo.app')
            ->assertJsonPath('data.phone', '+212622222222');
    }

    public function test_user_can_update_own_profile(): void
    {
        $user = User::factory()->create([
            'name' => 'Old Name',
        ]);

        Sanctum::actingAs($user, ['*']);

        $this->patchJson("/api/users/{$user->id}", [
            'name' => 'New Name',
            'phone' => '+212611111111',
            'country' => 'Maroc',
            'city' => 'Rabat',
            'bio' => 'Bio mise a jour',
            'avatar' => 'https://example.com/avatar.jpg',
            'cover_photo' => 'https://example.com/cover.jpg',
        ])
            ->assertOk()
            ->assertJsonPath('data.name', 'New Name')
            ->assertJsonPath('data.city', 'Rabat')
            ->assertJsonPath('data.bio', 'Bio mise a jour');

        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'name' => 'New Name',
            'city' => 'Rabat',
        ]);
    }

    public function test_user_cannot_update_another_profile(): void
    {
        $user = User::factory()->create();
        $other = User::factory()->create();

        Sanctum::actingAs($user, ['*']);

        $this->patchJson("/api/users/{$other->id}", [
            'name' => 'Nope',
        ])->assertForbidden();
    }

    public function test_user_can_upload_profile_avatar_and_cover(): void
    {
        Storage::fake('public');

        $user = User::factory()->create([
            'name' => 'Uploader',
        ]);

        Sanctum::actingAs($user, ['*']);

        $response = $this->patch("/api/users/{$user->id}", [
            'name' => 'Uploader',
            'phone' => '+212600000000',
            'country' => 'Maroc',
            'city' => 'Casablanca',
            'bio' => 'Bio',
            'avatar_file' => $this->fakeImageUpload('avatar.jpg'),
            'cover_photo_file' => $this->fakeImageUpload('cover.jpg'),
        ], [
            'Accept' => 'application/json',
        ]);

        $response
            ->assertOk()
            ->assertJsonPath('data.name', 'Uploader');

        $user->refresh();

        $this->assertNotNull($user->avatar);
        $this->assertNotNull($user->cover_photo);
        Storage::disk('public')->assertExists($user->avatar);
        Storage::disk('public')->assertExists($user->cover_photo);
    }

    public function test_following_a_profile_notifies_owner_and_relationship_lists_are_visible(): void
    {
        Notification::fake();

        $owner = User::factory()->create(['name' => 'Profile Owner']);
        $follower = User::factory()->create(['name' => 'Follower User']);
        $followedByOwner = User::factory()->create(['name' => 'Followed By Owner']);

        $owner->following()->attach($followedByOwner->id);

        Sanctum::actingAs($follower, ['*']);

        $this->postJson("/api/users/{$owner->id}/follow")
            ->assertOk()
            ->assertJsonPath('data.isFollowing', true)
            ->assertJsonPath('data.followersCount', 1);

        Notification::assertSentTo($owner, UserFollowedNotification::class);

        $this->getJson("/api/users/{$owner->id}/followers")
            ->assertOk()
            ->assertJsonPath('data.0.id', $follower->id)
            ->assertJsonPath('data.0.name', 'Follower User');

        $this->getJson("/api/users/{$owner->id}/following")
            ->assertOk()
            ->assertJsonPath('data.0.id', $followedByOwner->id)
            ->assertJsonPath('data.0.name', 'Followed By Owner');
    }
}
