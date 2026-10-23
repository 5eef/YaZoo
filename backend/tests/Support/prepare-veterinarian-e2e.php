<?php

use App\Models\User;
use App\Models\Veterinarian;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Hash;

// Run only inside the disposable E2E container. Never loads a remote database.
require __DIR__.'/../../vendor/autoload.php';
$app = require __DIR__.'/../../bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();
if (! $app->environment('testing') || config('database.default') !== 'sqlite' || config('database.connections.sqlite.database') !== '/tmp/yazoo-veterinarian-e2e.sqlite') {
    throw new RuntimeException('E2E requires its dedicated /tmp SQLite database.');
}
touch('/tmp/yazoo-veterinarian-e2e.sqlite');
Artisan::call('migrate', ['--force' => true]);
$client = User::factory()->create(['name' => 'Client DEMO E2E', 'email' => 'client.e2e@yazoo.test', 'password' => Hash::make('Local-E2E-Only-2026!')]);
$owner = User::factory()->create(['name' => 'Veterinaire DEMO E2E', 'email' => 'vet.e2e@yazoo.test', 'password' => Hash::make('Local-E2E-Only-2026!')]);
$vet = Veterinarian::factory()->create(['user_id' => $owner->id, 'name' => 'Veterinaire DEMO Sefrou', 'city' => 'Sefrou', 'description' => 'Profil fictif E2E', 'is_active' => true, 'moderation_status' => 'active', 'specialties' => ['Vaccination'], 'working_hours' => ['09:00-18:00']]);
$vet->availabilitySlots()->create(['starts_at' => now()->addDay()->setTime(10, 0), 'ends_at' => now()->addDay()->setTime(10, 30), 'is_available' => true]);
echo "Isolated E2E fixture ready.\n";
