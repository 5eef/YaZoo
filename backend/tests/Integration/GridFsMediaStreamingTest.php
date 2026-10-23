<?php

namespace Tests\Integration;

use App\Models\MediaAsset;
use App\Models\Post;
use App\Models\User;
use Illuminate\Support\Facades\Artisan;
use Laravel\Sanctum\Sanctum;
use MongoDB\Client;
use MongoDB\GridFS\Bucket;
use Tests\TestCase;

class GridFsMediaStreamingTest extends TestCase
{
    private Bucket $bucket;

    protected function setUp(): void
    {
        parent::setUp();
        $uri = getenv('YAZOO_GRIDFS_TEST_URI');
        if (! is_string($uri) || $uri === '') {
            throw new \RuntimeException('An isolated YAZOO_GRIDFS_TEST_URI is required; no implicit production target.');
        }
        $bucketName = 'test_'.bin2hex(random_bytes(8));
        config([
            'database.default' => 'sqlite', 'database.connections.sqlite.database' => ':memory:',
            'cache.default' => 'array', 'cache.limiter' => 'array', 'session.driver' => 'array',
            'queue.default' => 'sync', 'app.debug' => false,
            'media.driver' => 'mongodb', 'media.mongodb.enabled' => true,
            'media.mongodb.uri' => $uri, 'media.mongodb.database' => 'yazoo_gridfs_tests', 'media.mongodb.bucket' => $bucketName,
        ]);
        Artisan::call('migrate', ['--force' => true]);
        $this->bucket = (new Client($uri))->selectDatabase('yazoo_gridfs_tests')->selectGridFSBucket(['bucketName' => $bucketName]);
    }

    protected function tearDown(): void
    {
        if (isset($this->bucket)) {
            $this->bucket->drop();
        }
        parent::tearDown();
    }

    public function test_real_gridfs_private_post_ranges_head_visibility_and_removed_file(): void
    {
        $stream = fopen('php://temp', 'w+');
        fwrite($stream, '0123456789');
        rewind($stream);
        try {
            $id = $this->bucket->uploadFromStream('fixture.mp4', $stream, ['metadata' => ['mime_type' => 'video/mp4']]);
        } finally {
            fclose($stream);
        }
        $owner = User::factory()->create();
        $post = Post::factory()->create(['user_id' => $owner->id, 'visibility' => 'private', 'media_path' => 'mongodb:'.$id, 'media_kind' => 'video']);
        $asset = $owner->ownedMediaAssets()->create(['disk' => 'mongodb', 'path' => $post->media_path, 'path_hash' => hash('sha256', $post->media_path), 'kind' => 'video', 'state' => MediaAsset::STATE_ACTIVE, 'visibility' => 'private']);
        $asset->forceFill(['attachable_type' => $post->getMorphClass(), 'attachable_id' => $post->id])->save();
        $url = '/api/media/posts/'.$post->id;
        Sanctum::actingAs(User::factory()->create());
        $this->get($url, ['Range' => 'bytes=0-3'])->assertNotFound();
        Sanctum::actingAs($owner);
        $full = $this->get($url)->assertOk()->assertHeader('Cache-Control', 'no-store, private');
        $this->assertSame('0123456789', $full->streamedContent());
        $range = $this->get($url, ['Range' => 'bytes=0-3'])->assertStatus(206)->assertHeader('Content-Range', 'bytes 0-3/10');
        $this->assertSame('0123', $range->streamedContent());
        $suffix = $this->get($url, ['Range' => 'bytes=-3'])->assertStatus(206);
        $this->assertSame('789', $suffix->streamedContent());
        $this->get($url, ['Range' => 'bytes=99-100'])->assertStatus(416)->assertHeader('Content-Range', 'bytes */10');
        $head = $this->head($url)->assertOk()->assertHeader('Content-Length', '10');
        $this->assertSame('', $head->streamedContent());
        $asset->update(['visibility' => 'public']);
        $this->get('/api/media/'.$id)->assertNotFound();
        $this->bucket->delete($id);
        $this->get($url)->assertNotFound();
    }
}
