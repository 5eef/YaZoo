<?php

namespace Tests\Unit\Support;

use App\Support\MediaStorage;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use RuntimeException;
use Tests\TestCase;

class MediaStorageTest extends TestCase
{
    public function test_filesystem_upload_url_resolution_and_strict_cleanup(): void
    {
        Storage::fake('public');
        config([
            'media.driver' => 'filesystem',
            'media.filesystem_disk' => 'public',
        ]);

        $path = MediaStorage::storeUploadedFile(
            UploadedFile::fake()->create('animal.jpg', 32, 'image/jpeg'),
            'marketplace/animals',
        );

        Storage::disk('public')->assertExists($path);
        $this->assertStringContainsString($path, (string) MediaStorage::resolveUrl($path));
        $this->assertSame('https://example.test/image.jpg', MediaStorage::resolveUrl('https://example.test/image.jpg'));
        $this->assertNull(MediaStorage::resolveUrl(null));
        $this->assertSame(
            'image',
            MediaStorage::detectMediaKind(UploadedFile::fake()->create('photo.png', 32, 'image/png')),
        );

        MediaStorage::deleteStoredFilesOrFail([
            $path,
            $path,
            'https://example.test/external.jpg',
            '/absolute/external.jpg',
            null,
        ]);

        Storage::disk('public')->assertMissing($path);
    }

    public function test_video_detection_uses_the_uploaded_mime_type(): void
    {
        $video = UploadedFile::fake()->create('clip.mp4', 128, 'video/mp4');

        $this->assertSame('video', MediaStorage::detectMediaKind($video));
        $this->assertTrue(MediaStorage::isMongoReference('mongodb:507f1f77bcf86cd799439011'));
        $this->assertFalse(MediaStorage::isMongoReference('marketplace/photo.jpg'));
    }

    public function test_lenient_cleanup_ignores_external_paths_and_deletes_internal_files(): void
    {
        Storage::fake('public');
        config(['media.filesystem_disk' => 'public']);
        Storage::disk('public')->put('marketplace/one.jpg', 'one');
        Storage::disk('public')->put('marketplace/two.jpg', 'two');

        MediaStorage::deleteStoredFiles([
            'marketplace/one.jpg',
            'marketplace/two.jpg',
            'marketplace/two.jpg',
            'https://example.test/external.jpg',
            '/absolute/external.jpg',
            null,
        ]);

        Storage::disk('public')->assertMissing([
            'marketplace/one.jpg',
            'marketplace/two.jpg',
        ]);
    }

    public function test_mongodb_reference_resolution_and_missing_uri_fail_closed(): void
    {
        Storage::fake('public');
        config([
            'app.url' => 'https://api.yazoo.test/',
            'media.filesystem_disk' => 'public',
            'media.mongodb.uri' => '',
        ]);

        $this->assertSame(extension_loaded('mongodb'), MediaStorage::isMongoDriverAvailable());
        $this->assertSame(
            'https://api.yazoo.test/api/media/507f1f77bcf86cd799439011',
            MediaStorage::resolveUrl('mongodb:507f1f77bcf86cd799439011'),
        );

        Storage::disk('public')->put('legacy/photo.jpg', 'test');

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage("L'URI MongoDB media n'est pas configuree.");
        MediaStorage::importPublicDiskPath('legacy/photo.jpg', 'imported');
    }
}
