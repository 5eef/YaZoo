<?php

namespace Tests\Feature;

use App\Models\Animal;
use App\Models\Community;
use App\Models\MediaAsset;
use App\Models\Post;
use App\Models\Product;
use App\Models\ProfessionalVerification;
use App\Models\Story;
use App\Models\User;
use App\Models\Veterinarian;
use App\Services\MediaAssetService;
use App\Support\MediaStorage;
use Illuminate\Foundation\Testing\DatabaseMigrations;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class R2MediaStorageTest extends TestCase
{
    // Real commits are needed to exercise afterCommit byte cleanup (SQLite only).
    use DatabaseMigrations;

    protected function afterRefreshingDatabase(): void
    {
        DB::connection()->getPdo()->sqliteCreateFunction('CHAR_LENGTH', 'strlen', 1);
    }

    protected function setUp(): void
    {
        parent::setUp();
        config(['media.driver' => 'r2', 'professional_verifications.disk' => 'r2']);
        Storage::fake('r2');
    }

    private function image(): UploadedFile
    {
        return UploadedFile::fake()->createWithContent('fixture.png', base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+X2FoAAAAASUVORK5CYII='));
    }

    public function test_avatar_cover_replacement_and_removal_delete_only_old_objects(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);
        $this->post('/api/users/'.$user->id, ['_method' => 'PATCH', 'avatar_file' => $this->image(), 'cover_photo_file' => $this->image()])->assertOk();
        $avatar = $user->fresh()->avatar;
        $cover = $user->fresh()->cover_photo;
        Storage::disk('r2')->assertExists([$avatar, $cover]);
        $url = MediaStorage::resolveUrl($avatar);
        $this->get($url)->assertOk()->assertHeader('Content-Type', 'image/png');
        $this->post('/api/users/'.$user->id, ['_method' => 'PATCH', 'avatar_file' => $this->image()])->assertOk();
        Storage::disk('r2')->assertMissing($avatar);
        Storage::disk('r2')->assertExists($cover);
        $newAvatar = $user->fresh()->avatar;
        $this->patchJson('/api/users/'.$user->id, ['remove_avatar' => true, 'remove_cover_photo' => true])->assertOk();
        Storage::disk('r2')->assertMissing([$newAvatar, $cover]);
        $this->get($url)->assertNotFound();
    }

    public function test_post_image_create_stream_and_delete(): void
    {
        Sanctum::actingAs(User::factory()->create());
        $id = $this->post('/api/posts', ['media_file' => $this->image(), 'visibility' => 'public'])->assertCreated()->json('data.id');
        $post = Post::findOrFail($id);
        $this->assertStringStartsWith('media/posts/', $post->media_path);
        $this->get('/api/media/posts/'.$id)->assertOk()->assertHeader('Content-Type', 'image/png')->assertStreamedContent(Storage::disk('r2')->get($post->media_path));
        $this->deleteJson('/api/posts/'.$id)->assertOk();
        Storage::disk('r2')->assertMissing($post->media_path);
    }

    public function test_post_video_upload_and_delete(): void
    {
        Sanctum::actingAs(User::factory()->create());
        // Transport fixture with an explicit test MIME; native decoding is device QA.
        $bytes = pack('N', 24).'ftypisom'.pack('N', 0).'isomiso2';
        $upload = UploadedFile::fake()->createWithContent('qa.mp4', $bytes)->mimeType('video/mp4');
        $id = $this->post('/api/posts', ['media_file' => $upload])->assertCreated()->json('data.id');
        $post = Post::findOrFail($id);
        $this->get('/api/media/posts/'.$id)->assertOk()->assertHeader('Content-Type', 'video/mp4')->assertStreamedContent($bytes);
        $this->deleteJson('/api/posts/'.$id)->assertOk();
        Storage::disk('r2')->assertMissing($post->media_path);
    }

    public function test_private_media_route_denies_non_owner_and_public_route(): void
    {
        $owner = User::factory()->create();
        $asset = app(MediaAssetService::class)->registerUpload($owner, $this->image(), 'profiles', 'image', 'private');
        $this->get('/api/media/'.$asset->id)->assertNotFound();
        $this->get('/api/media/private/'.$asset->id)->assertUnauthorized();
        Sanctum::actingAs(User::factory()->create());
        $this->get('/api/media/private/'.$asset->id)->assertNotFound();
        Sanctum::actingAs($owner);
        $this->get('/api/media/private/'.$asset->id)->assertOk()->assertHeader('Content-Type', 'image/png');
    }

    public function test_video_ranges_head_private_post_and_moderation(): void
    {
        $owner = User::factory()->create();
        $post = Post::factory()->create(['user_id' => $owner->id, 'visibility' => 'private', 'media_path' => 'media/posts/test.mp4', 'media_kind' => 'video']);
        Storage::disk('r2')->put($post->media_path, '0123456789');
        $asset = app(MediaAssetService::class)->registerStoredPath($owner, $post->media_path, 'video', 'private', 'video/mp4', 10, 'test.mp4', 'r2');
        app(MediaAssetService::class)->attach($asset, $post, 'media_path');
        $url = '/api/media/posts/'.$post->id;
        $this->get($url)->assertUnauthorized();
        Sanctum::actingAs(User::factory()->create());
        $this->get($url, ['Range' => 'bytes=0-3'])->assertNotFound();
        Sanctum::actingAs($owner);
        $this->get($url)->assertOk()->assertHeader('Content-Type', 'video/mp4')->assertStreamedContent('0123456789');
        $this->get($url, ['Range' => 'bytes=2-5'])->assertStatus(206)->assertHeader('Content-Range', 'bytes 2-5/10')->assertStreamedContent('2345');
        $this->get($url, ['Range' => 'bytes=-3'])->assertStatus(206)->assertStreamedContent('789');
        $this->get($url, ['Range' => 'bytes=7-'])->assertStatus(206)->assertStreamedContent('789');
        $this->get($url, ['Range' => 'bytes=99-'])->assertStatus(416);
        $this->head($url)->assertOk()->assertHeader('Content-Length', '10');
        $this->get('/api/media/'.$asset->id)->assertNotFound();
        $asset->update(['state' => MediaAsset::STATE_INFECTED]);
        $this->get($url)->assertNotFound();
    }

    public function test_story_upload_and_delete(): void
    {
        Sanctum::actingAs(User::factory()->create());
        $response = $this->post('/api/stories', ['media_file' => $this->image()])->assertCreated();
        $story = Story::query()->firstOrFail();
        $this->assertStringStartsWith('media/stories/', $story->media_path);
        Storage::disk('r2')->assertExists($story->media_path);
        $this->get(MediaStorage::resolveUrl($story->media_path))->assertOk();
        $this->deleteJson('/api/stories/'.$story->id)->assertOk();
        Storage::disk('r2')->assertMissing($story->media_path);
    }

    public function test_marketplace_uploads_preserve_omitted_fields_and_clean_on_delete(): void
    {
        $owner = User::factory()->approvedProfessional('breeder')->create();
        $animal = Animal::factory()->create(['user_id' => $owner->id]);
        $seller = User::factory()->approvedProfessional('seller')->create();
        $product = Product::factory()->create(['user_id' => $seller->id]);
        $vetOwner = User::factory()->approvedProfessional('veterinarian')->create();
        $vet = Veterinarian::factory()->create(['user_id' => $vetOwner->id]);
        foreach ([[$animal, $owner, 'animals', 'photo', 'PUT'], [$product, $seller, 'products', 'image', 'PUT'], [$vet, $vetOwner, 'veterinarians', 'image', 'PATCH']] as [$model, $user, $resource, $field, $method]) {
            Sanctum::actingAs($user);
            $name = $model->name;
            $this->post('/api/'.$resource.'/'.$model->id, ['_method' => $method, $field => $this->image()])->assertOk();
            $this->assertSame($name, $model->fresh()->name);
            $asset = MediaAsset::query()->where('attachable_type', $model->getMorphClass())->where('attachable_id', $model->id)->firstOrFail();
            $this->assertSame('r2', $asset->disk);
            Storage::disk('r2')->assertExists($asset->path);
            $this->post('/api/'.$resource.'/'.$model->id, ['_method' => $method, $field => $this->image()])->assertOk();
            Storage::disk('r2')->assertMissing($asset->path);
            if ($resource !== 'veterinarians') {
                $this->assertNotContains($asset->path, $model->fresh()->gallery_urls ?? []);
            }
            $current = MediaAsset::query()->where('attachable_type', $model->getMorphClass())->where('attachable_id', $model->id)->firstOrFail();
            $this->deleteJson('/api/'.$resource.'/'.$model->id)->assertOk();
            if ($resource === 'veterinarians') {
                Storage::disk('r2')->assertMissing($current->path);
            } else {
                // Animals/products retain media references for soft-delete recovery.
                $this->assertNotNull($model->fresh()->deleted_at);
                Storage::disk('r2')->assertExists($current->path);
            }
        }
    }

    public function test_community_image_replacement_and_delete(): void
    {
        Sanctum::actingAs(User::factory()->create());
        $id = $this->post('/api/communities', ['name' => 'QA', 'is_private' => '0', 'image_file' => $this->image()])->assertCreated()->json('data.id');
        $community = Community::findOrFail($id);
        $old = $community->image_url;
        $this->get(MediaStorage::resolveUrl($old))->assertOk();
        $this->post('/api/communities/'.$id, ['_method' => 'PUT', 'image_file' => $this->image()])->assertOk();
        Storage::disk('r2')->assertMissing($old);
        $current = $community->fresh()->image_url;
        $this->deleteJson('/api/communities/'.$id)->assertOk();
        Storage::disk('r2')->assertMissing($current);
    }

    public function test_professional_document_is_private_and_owner_only(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);
        $this->post('/api/professional-verifications', ['business_type' => 'seller', 'document_type' => 'license', 'document' => UploadedFile::fake()->createWithContent('proof.pdf', "%PDF-1.4\nQA document")])->assertCreated();
        $verification = ProfessionalVerification::firstOrFail();
        $asset = MediaAsset::where('kind', 'document')->firstOrFail();
        $this->assertStringStartsWith('private/professional-verifications/', $verification->document_path);
        $url = '/api/professional-verifications/'.$verification->id.'/document';
        $this->get($url)->assertOk()->assertHeader('Content-Type', 'application/pdf')->assertHeader('Cache-Control', 'no-store, private')->assertStreamedContent("%PDF-1.4\nQA document");
        $this->get('/api/media/'.$asset->id)->assertNotFound();
        $this->get('/api/media/private/'.$asset->id)->assertNotFound();
        Sanctum::actingAs(User::factory()->create());
        $this->get($url)->assertForbidden();
    }

    public function test_professional_replacement_cleans_previous_object_and_metadata(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);
        $payload = ['business_type' => 'seller', 'document_type' => 'license'];
        $this->post('/api/professional-verifications', [...$payload, 'document' => UploadedFile::fake()->createWithContent('old.pdf', "%PDF-1.4\nold")])->assertCreated();
        $previous = ProfessionalVerification::firstOrFail();
        $oldPath = $previous->document_path;
        $previous->update(['status' => 'rejected', 'pending_key' => null]);
        $this->post('/api/professional-verifications', [...$payload, 'document' => UploadedFile::fake()->createWithContent('new.pdf', "%PDF-1.4\nnew")])->assertCreated();
        Storage::disk('r2')->assertMissing($oldPath);
        $this->assertDatabaseMissing('media_assets', ['path' => $oldPath]);
        $this->assertNull($previous->fresh()->document_path);
    }

    public function test_expired_professional_document_cleanup_understands_r2_private_prefix(): void
    {
        $user = User::factory()->create();
        $verification = ProfessionalVerification::query()->create(['user_id' => $user->id, 'business_type' => 'seller',
            'document_path' => 'private/professional-verifications/'.$user->id.'/expired.pdf',
            'document_expires_at' => now()->subYears(2), 'document_mime' => 'application/pdf']);
        Storage::disk('r2')->put($verification->document_path, '%PDF-1.4');
        $asset = app(MediaAssetService::class)->registerStoredPath($user, $verification->document_path, 'document', 'private', 'application/pdf', 8, 'expired.pdf', 'r2');
        app(MediaAssetService::class)->attach($asset, $verification, 'document_path');
        $this->artisan('yazoo:purge-professional-documents')->assertSuccessful();
        Storage::disk('r2')->assertMissing($verification->document_path);
        $this->assertDatabaseMissing('media_assets', ['id' => $asset->id]);
        $this->assertNull($verification->fresh()->document_path);
    }

    public function test_attached_object_cannot_be_discarded_or_claimed_by_another_owner(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $service = app(MediaAssetService::class);
        $asset = $service->registerUpload($owner, $this->image(), 'profiles', 'image');
        $service->attach($asset, $owner, 'avatar');
        $service->discardUnattached($asset, $owner);
        Storage::disk('r2')->assertExists($asset->path);
        $this->expectException(ValidationException::class);
        $service->ownedReference($other, $asset->id);
    }
}
