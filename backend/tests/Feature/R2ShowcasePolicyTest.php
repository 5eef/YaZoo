<?php

namespace Tests\Feature;

use App\Http\Middleware\RejectDisabledShowcaseUploads;
use App\Support\MediaStorage;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Tests\TestCase;

class R2ShowcasePolicyTest extends TestCase
{
    private function uploadStatus(): int
    {
        $request = Request::create('/upload', 'POST', [], [], ['file' => UploadedFile::fake()->create('qa.txt')]);

        return app(RejectDisabledShowcaseUploads::class)->handle($request, fn () => response('', 204))->getStatusCode();
    }

    public function test_enabled_uploads_fail_closed_without_complete_persistent_configuration(): void
    {
        config(['operations.deployment_profile' => 'showcase', 'operations.showcase_uploads_enabled' => true, 'media.driver' => 'filesystem']);
        $this->assertSame(409, $this->uploadStatus());
        config(['media.driver' => 'r2', 'professional_verifications.disk' => 'r2']);
        $this->assertSame(409, $this->uploadStatus());
    }

    public function test_complete_configuration_allows_uploads_only_when_explicitly_enabled(): void
    {
        config(['operations.deployment_profile' => 'showcase', 'operations.showcase_uploads_enabled' => true, 'media.driver' => 'r2', 'professional_verifications.disk' => 'r2',
            'filesystems.disks.r2.key' => 'test-only-placeholder', 'filesystems.disks.r2.secret' => 'test-only-placeholder',
            'filesystems.disks.r2.bucket' => 'qa-bucket', 'filesystems.disks.r2.endpoint' => 'https://qa.r2.cloudflarestorage.com', 'filesystems.disks.r2.region' => 'auto']);
        $this->assertTrue(MediaStorage::persistentUploadsConfigured());
        $this->assertSame(204, $this->uploadStatus());
        config(['operations.showcase_uploads_enabled' => false]);
        $this->assertSame(409, $this->uploadStatus());
        config(['operations.showcase_uploads_enabled' => true, 'filesystems.disks.r2.secret' => '']);
        $this->assertSame(409, $this->uploadStatus());
        $this->getJson('/health/ready')->assertServiceUnavailable()
            ->assertJsonPath('checks.mediaStorage.media_driver', 'r2')
            ->assertJsonPath('checks.mediaStorage.media_storage', 'not_ready');
    }
}
