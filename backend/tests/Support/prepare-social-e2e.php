<?php

use App\Models\User;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\Artisan;

require __DIR__.'/../../vendor/autoload.php';
$app = require __DIR__.'/../../bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();

if (! $app->environment('testing') || config('database.default') !== 'sqlite'
    || config('database.connections.sqlite.database') !== '/state/social-e2e.sqlite'
    || config('media.driver') !== 'r2'
    || config('filesystems.disks.r2.endpoint') !== 'http://yazoo-social-s3:9090') {
    throw new RuntimeException('Only the dedicated local SQLite/S3Mock fixture is permitted.');
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
