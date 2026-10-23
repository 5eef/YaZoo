<?php

use App\Models\MediaAsset;
use App\Models\Story;
use App\Models\User;
use App\Services\StoryService;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Storage;

require __DIR__.'/../../vendor/autoload.php';
$app = require __DIR__.'/../../bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();
if (! $app->environment('testing') || config('database.default') !== 'sqlite'
    || config('database.connections.sqlite.database') !== '/state/social-e2e.sqlite'
    || config('filesystems.disks.r2.endpoint') !== 'http://yazoo-social-s3:9090') {
    throw new RuntimeException('Only the dedicated disposable fixture is permitted.');
}
$source = MediaAsset::query()->where('disk', 'r2')->where('mime_type', 'image/png')->firstOrFail();
$temporary = tempnam(sys_get_temp_dir(), 'social-cleanup-');
try {
    file_put_contents($temporary, Storage::disk('r2')->get($source->path));
    $story = app(StoryService::class)->create(
        User::where('email', 'admin@social-e2e.test')->firstOrFail(),
        ['content' => 'Isolated S3 expiration cleanup proof'],
        new UploadedFile($temporary, 'cleanup.png', 'image/png', null, true),
    );
    $path = $story->media_path;
    if (! Storage::disk('r2')->exists($path)) {
        throw new RuntimeException('Story upload was not persisted.');
    }
    $story->update(['expires_at' => now()->subSecond()]);
    $status = Artisan::call('yazoo:purge-expired-stories', ['--limit' => 200]);
    if ($status !== 0 || Story::whereKey($story->id)->exists()
        || MediaAsset::where('path', $path)->exists() || Storage::disk('r2')->exists($path)) {
        throw new RuntimeException('S3 expiration cleanup proof failed.');
    }
    echo "PASS_LOCAL: expired story, relational asset and S3 object removed.\n";
} finally {
    if (is_file($temporary)) {
        unlink($temporary);
    }
}
