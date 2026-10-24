<?php

use App\Models\User;
use Aws\S3\Exception\S3Exception;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Storage;

require __DIR__.'/../../vendor/autoload.php';
$app = require __DIR__.'/../../bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();

if (! $app->environment('testing') || config('database.default') !== 'sqlite'
    || config('database.connections.sqlite.database') !== '/state/social-e2e.sqlite'
    || config('media.driver') !== 'r2'
    || config('filesystems.disks.r2.endpoint') !== 'http://yazoo-social-s3:9090') {
    throw new RuntimeException('Only the dedicated local SQLite/S3Mock fixture is permitted.');
}

// A fresh S3Mock has no bucket. Provision only this guarded disposable fixture.
$client = Storage::disk('r2')->getClient();
$bucket = (string) config('filesystems.disks.r2.bucket');
if ($bucket !== 'yazoo-social-test') {
    throw new RuntimeException('Only the dedicated local S3Mock bucket is permitted.');
}
try {
    $client->headBucket(['Bucket' => $bucket]);
} catch (S3Exception $exception) {
    if ($exception->getStatusCode() !== 404) {
        throw $exception;
    }
    $client->createBucket(['Bucket' => $bucket]);
}

touch('/state/social-e2e.sqlite');
Artisan::call('migrate', ['--force' => true]);
if (! User::where('email', 'admin@social-e2e.test')->exists()) {
    User::factory()->admin()->create([
        'name' => 'Local review administrator',
        'email' => 'admin@social-e2e.test',
        'password' => 'Social-Isolated-Test-2026!',
    ]);
}
echo "Disposable social fixture ready; no professional badge granted.\n";
