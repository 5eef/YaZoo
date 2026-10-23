<?php

namespace Tests\Unit\Support;

use App\Support\MediaStorage;
use Aws\MockHandler;
use Aws\Result;
use GuzzleHttp\Psr7\Utils;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class R2AdapterTest extends TestCase
{
    public function test_real_s3_adapter_strips_acl_and_requests_range_without_buffering(): void
    {
        $config = config('filesystems.disks.r2');
        $config['key'] = 'test-only-placeholder';
        $config['secret'] = 'test-only-placeholder';
        $config['bucket'] = 'qa-bucket';
        $config['endpoint'] = 'https://qa.r2.cloudflarestorage.com';
        config(['filesystems.disks.r2.bucket' => $config['bucket']]);
        $disk = MediaStorage::createR2Disk($config);
        $calls = [];
        $mock = new MockHandler([
            function ($command) use (&$calls) {
                $calls[] = $command->getName();
                $this->assertFalse(isset($command['ACL']));

                return new Result(['ETag' => 'qa']);
            },
            function ($command) use (&$calls) {
                $calls[] = $command->getName();
                $this->assertSame('bytes=2-5', $command['Range']);
                $this->assertTrue($command['@http']['stream']);

                return new Result(['Body' => Utils::streamFor('2345')]);
            },
            function ($command) {
                $this->assertSame('CreateMultipartUpload', $command->getName());
                $this->assertFalse(isset($command['ACL']));

                return new Result(['UploadId' => 'qa-upload']);
            },
        ]);
        $disk->getClient()->getHandlerList()->setHandler($mock);
        Storage::set('r2', $disk);
        $this->assertTrue($disk->put('media/posts/qa.mp4', '0123456789'));
        $stream = MediaStorage::openDiskStream('r2', 'media/posts/qa.mp4', [2, 5]);
        $this->assertSame('2345', stream_get_contents($stream));
        fclose($stream);
        $this->assertSame(['PutObject', 'GetObject'], $calls);
        $disk->getClient()->createMultipartUpload(['Bucket' => 'qa-bucket', 'Key' => 'media/posts/qa.mp4', 'ACL' => 'private']);
    }
}
