<?php

use App\Models\MediaAsset;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

require __DIR__.'/../../vendor/autoload.php';
$app = require __DIR__.'/../../bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();
if (! $app->environment('testing') || config('database.default') !== 'sqlite'
    || config('database.connections.sqlite.database') !== '/state/social-e2e.sqlite'
    || config('filesystems.disks.r2.endpoint') !== 'http://yazoo-social-s3:9090') {
    throw new RuntimeException('Only the dedicated disposable fixture is permitted.');
}
$counts = [];
foreach (['users', 'posts', 'comments', 'stories', 'story_views', 'conversations', 'messages', 'communities', 'community_members', 'professional_verifications', 'service_listings', 'reservations', 'veterinarians', 'veterinarian_availability_slots', 'veterinarian_appointments', 'notifications', 'media_assets'] as $table) {
    if (DB::getSchemaBuilder()->hasTable($table)) {
        $counts[$table] = DB::table($table)->count();
    }
}
$assets = MediaAsset::query()->where('disk', 'r2')->orderBy('id')->get();
$objects = [];
foreach ($assets as $asset) {
    $bytes = Storage::disk('r2')->get($asset->path);
    if (! is_string($bytes) || $bytes === '') {
        throw new RuntimeException('Missing persistent object: '.$asset->id);
    }
    $objects[] = ['id' => $asset->id, 'bytes' => strlen($bytes), 'sha256' => hash('sha256', $bytes)];
}
echo json_encode(['database' => '/state/social-e2e.sqlite', 'counts' => $counts, 'objects' => $objects], JSON_PRETTY_PRINT).PHP_EOL;
