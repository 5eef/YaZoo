<?php

namespace Tests\Feature\Marketplace;

use App\Models\Animal;
use App\Models\Comment;
use App\Models\Like;
use App\Models\Payment;
use App\Models\Post;
use App\Models\Product;
use App\Models\Reservation;
use App\Models\ServiceListing;
use App\Models\User;
use App\Models\Veterinarian;
use App\Models\VeterinarianAvailabilitySlot;
use App\Support\ShowcaseBootstrapGuard;
use Database\Seeders\DemoContentSeeder;
use Database\Seeders\MarketplaceTestSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Tests\TestCase;

class ShowcaseBootstrapTest extends TestCase
{
    use RefreshDatabase;

    private string $imagesPath;

    private string $confirmation = 'demo-db.example/yazoo_showcase@demo.example';

    private string $password = 'Showcase-Test-Password-2026!';

    public function test_completed_bootstrap_preserves_data_but_sync_rotates_jury_password_once(): void
    {
        $arguments = ['--images' => $this->imagesPath, '--confirmation' => $this->confirmation];
        $this->assertSame(0, Artisan::call('yazoo:bootstrap-showcase', $arguments), Artisan::output());
        $before = [];
        foreach (['users', 'posts', 'stories', 'comments', 'likes', 'follows', 'messages', 'veterinarian_appointments'] as $table) {
            $before[$table] = DB::table($table)->orderBy('id')->get()->toJson();
        }
        $outsider = User::factory()->create(['email' => 'outside@example.test', 'is_admin' => false]);
        $adminHashes = User::query()->where('is_admin', true)->pluck('password', 'id')->all();
        config(['operations.showcase_password' => 'Rotated-Test-Only-Password-2026!']);
        $this->assertSame(0, Artisan::call('yazoo:bootstrap-showcase', $arguments));
        $this->assertStringContainsString('aucune ecriture', Artisan::output());
        foreach ($before as $table => $rows) {
            $query = DB::table($table)->orderBy('id');
            if ($table === 'users') {
                $query->where('id', '!=', $outsider->id);
            }
            $this->assertSame($rows, $query->get()->toJson());
        }
        $this->mock(ShowcaseBootstrapGuard::class, function ($mock): void {
            $mock->shouldReceive('assertAllowed')->with($this->confirmation)->twice();
        });
        $sync = ['--confirmation' => $this->confirmation];
        $syncExit = Artisan::call('yazoo:sync-showcase-credentials', $sync);
        $syncOutput = Artisan::output();
        $this->assertSame(0, $syncExit, $syncOutput);
        $this->assertStringContainsString('18 modification(s)', $syncOutput);
        $this->assertTrue(Hash::check(config('operations.showcase_password'), User::query()->where('email', 'client.fes@yazoo.test')->firstOrFail()->password));
        $this->assertSame(0, Artisan::call('yazoo:sync-showcase-credentials', $sync));
        $this->assertStringContainsString('0 modification(s)', Artisan::output());
        $this->assertSame($adminHashes, User::query()->where('is_admin', true)->pluck('password', 'id')->all());
        $this->assertSame($outsider->password, $outsider->fresh()->password);
        foreach (array_diff(array_keys($before), ['users']) as $table) {
            $this->assertSame($before[$table], DB::table($table)->orderBy('id')->get()->toJson());
        }
        $this->assertStringNotContainsString(config('operations.showcase_password'), Artisan::output());
    }

    public function test_credential_sync_is_idempotent_and_preserves_non_demo_users_and_admins(): void
    {
        $this->mock(ShowcaseBootstrapGuard::class, function ($mock): void {
            $mock->shouldReceive('assertAllowed')->with($this->confirmation)->twice();
        });
        Cache::store('database')->forever('yazoo_showcase_bootstrap_v2', 'complete');
        $client = User::factory()->create(['email' => 'client.fes@yazoo.test', 'name' => 'Client DEMO AFWAJ', 'bio' => 'Personnage fictif AFWAJ', 'is_admin' => false]);
        $outsider = User::factory()->create(['email' => 'outside@example.test', 'name' => 'DEMO outsider', 'bio' => 'fictif', 'is_admin' => false]);
        $admin = User::factory()->create(['email' => 'bough.youssef@gmail.com', 'is_admin' => true]);
        $before = [$outsider->password, $admin->password, $client->updated_at->toISOString()];
        $arguments = ['--confirmation' => $this->confirmation];
        $this->assertSame(0, Artisan::call('yazoo:sync-showcase-credentials', $arguments), Artisan::output());
        $hash = $client->fresh()->password;
        $this->assertTrue(Hash::check($this->password, $hash));
        $this->assertSame(0, Artisan::call('yazoo:sync-showcase-credentials', $arguments));
        $this->assertSame($hash, $client->fresh()->password);
        $this->assertSame($before, [$outsider->fresh()->password, $admin->fresh()->password, $client->fresh()->updated_at->toISOString()]);
        $this->assertStringNotContainsString($this->password, Artisan::output());
    }

    public function test_credential_sync_refuses_an_allowlisted_user_without_fictitious_markers(): void
    {
        $this->mock(ShowcaseBootstrapGuard::class, function ($mock): void {
            $mock->shouldReceive('assertAllowed')->once();
        });
        Cache::store('database')->forever('yazoo_showcase_bootstrap_v2', 'complete');
        $client = User::factory()->create(['email' => 'client.fes@yazoo.test', 'name' => 'Real account', 'is_admin' => false]);
        $hash = $client->password;
        $this->assertSame(1, Artisan::call('yazoo:sync-showcase-credentials', ['--confirmation' => $this->confirmation]));
        $this->assertSame($hash, $client->fresh()->password);
    }

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'app.url' => 'http://localhost',
            'operations.deployment_profile' => 'showcase',
            'operations.showcase_bootstrap_confirmation' => $this->confirmation,
            'operations.showcase_password' => $this->password,
            'operations.showcase_mfa_secret' => 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP',
            'operations.showcase_mfa_recovery_codes' => 'ABCDE12345,ABCDE12346,ABCDE12347,ABCDE12348,ABCDE12349,ABCDE1234A,ABCDE1234B,ABCDE1234C',
        ]);
        Storage::fake('public');
        Storage::fake('private');
        $this->imagesPath = storage_path('framework/testing/showcase-'.Str::uuid());
        File::ensureDirectoryExists($this->imagesPath);
        $this->writeImages();
    }

    protected function tearDown(): void
    {
        if (isset($this->imagesPath) && str_starts_with($this->imagesPath, storage_path('framework/testing/showcase-'))) {
            File::deleteDirectory($this->imagesPath);
        }

        parent::tearDown();
    }

    public function test_it_bootstraps_the_complete_showcase_once_and_rotates_all_demo_passwords(): void
    {
        $arguments = [
            '--images' => $this->imagesPath,
            '--confirmation' => $this->confirmation,
        ];

        $exit = Artisan::call('yazoo:bootstrap-showcase', $arguments);
        $this->assertSame(0, $exit, Artisan::output());
        $this->assertDatabaseCount('users', 20);
        $this->assertDatabaseCount('posts', 5);
        $this->assertDatabaseCount('comments', 4);
        $this->assertDatabaseCount('likes', 6);
        $this->assertDatabaseCount('stories', 2);
        $this->assertDatabaseCount('follows', 3);
        $this->assertDatabaseCount('veterinarian_availability_slots', 12);
        $this->assertDatabaseCount('veterinarian_appointments', 3);
        $this->assertDatabaseCount('conversations', 5);
        $this->assertDatabaseCount('messages', 10);
        $this->assertDatabaseCount('animals', 5);
        $this->assertDatabaseCount('products', 9);
        $this->assertDatabaseCount('service_listings', 10);
        $this->assertDatabaseCount('reservations', 6);
        $this->assertDatabaseCount('payments', 2);
        $feedMedia = Post::query()->pluck('media_kind', 'media_path');
        $this->assertSame([
            'marketplace/demo/cafe_chat.png' => 'image',
            'marketplace/demo/dresseur_chien.png' => 'image',
            'marketplace/demo/produit_oiseau_cage.png' => 'image',
            'showcase/demo/afwaj-reel-1.mp4' => 'video',
            'showcase/demo/afwaj-reel-2.mp4' => 'video',
        ], $feedMedia->all());
        $feedMedia->keys()->each(
            fn (string $path) => $this->assertTrue(Storage::disk('public')->exists($path), $path),
        );
        $this->assertSame('complete', Cache::store('database')->get('yazoo_showcase_bootstrap_v2'));
        $this->assertSame(['Sefrou', 'Fès', 'Meknès'], Veterinarian::query()->orderBy('id')->pluck('city')->all());
        $client = User::query()->where('email', 'client.fes@yazoo.test')->firstOrFail();
        $this->assertFalse((bool) $client->is_admin);
        $this->actingAs($client)->getJson('/api/posts')->assertOk()->assertJsonCount(5, 'data');
        $this->getJson('/api/stories')->assertOk()->assertJsonCount(1, 'data');
        $this->getJson('/api/services')->assertOk()->assertJsonCount(10, 'data');
        $this->getJson('/api/veterinarian-appointments')->assertOk()->assertJsonCount(3, 'data');
        foreach (Post::query()->where('media_kind', 'video')->get() as $post) {
            $this->get('/api/media/posts/'.$post->id)->assertOk()->assertHeader('content-type', 'video/mp4');
        }
        $this->assertTrue(User::query()->where('is_admin', false)->get()->every(
            fn (User $user): bool => Hash::check($this->password, $user->password),
        ));
        $this->assertTrue(User::query()->where('is_admin', true)->get()->every(
            fn (User $user): bool => ! Hash::check($this->password, $user->password),
        ));
        $admin = User::query()->where('email', 'bough.youssef@gmail.com')->firstOrFail();
        $this->assertNotNull($admin->admin_mfa_confirmed_at);
        $this->assertSame('JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP', $admin->admin_mfa_secret);
        $this->assertCount(8, $admin->admin_mfa_recovery_codes);
        $this->assertTrue(Hash::check('ABCDE12345', $admin->admin_mfa_recovery_codes[0]));

        $vet = Veterinarian::query()->where('city', 'Sefrou')->firstOrFail();
        $slot = VeterinarianAvailabilitySlot::query()->where('veterinarian_id', $vet->id)
            ->where('starts_at', '<', now()->addDays(4))->orderBy('starts_at')->firstOrFail();
        $this->postJson('/api/veterinarians/'.$vet->id.'/appointments', [
            'availability_slot_id' => $slot->id, 'animal_type' => 'chat', 'reason' => 'Consultation fictive AFWAJ',
        ])->assertCreated()->assertJsonPath('data.status', 'pending');

        $countsBefore = $this->showcaseCounts();
        $publicFilesBefore = Storage::disk('public')->allFiles();
        $privateFilesBefore = Storage::disk('private')->allFiles();

        $this->assertSame(0, Artisan::call('yazoo:bootstrap-showcase', $arguments));
        $this->assertSame($countsBefore, $this->showcaseCounts());
        $this->assertSame($publicFilesBefore, Storage::disk('public')->allFiles());
        $this->assertSame($privateFilesBefore, Storage::disk('private')->allFiles());
    }

    public function test_it_refuses_a_database_containing_an_unrelated_account(): void
    {
        User::factory()->create(['email' => 'existing-user@example.test']);

        $exit = Artisan::call('yazoo:bootstrap-showcase', [
            '--images' => $this->imagesPath,
            '--confirmation' => $this->confirmation,
        ]);

        $this->assertSame(1, $exit);
        $this->assertDatabaseCount('users', 1);
        $this->assertSame([], Storage::disk('public')->allFiles());
        $this->assertSame([], Storage::disk('private')->allFiles());
        $this->assertNull(Cache::store('database')->get('yazoo_showcase_bootstrap_v1'));
    }

    public function test_it_upgrades_an_untouched_v1_once_without_changing_credentials(): void
    {
        app(MarketplaceTestSeeder::class)->seedFrom($this->imagesPath);
        app(DemoContentSeeder::class)->run();
        Cache::store('database')->forever('yazoo_showcase_bootstrap_v1', 'complete');
        $passwords = User::query()->pluck('password', 'id')->all();
        $arguments = ['--images' => $this->imagesPath, '--confirmation' => $this->confirmation];
        $exit = Artisan::call('yazoo:bootstrap-showcase', $arguments);
        $this->assertSame(0, $exit, Artisan::output());
        $this->assertDatabaseCount('posts', 5);
        $this->assertDatabaseCount('stories', 2);
        $this->assertSame($passwords, User::query()->pluck('password', 'id')->all());
        $counts = $this->showcaseCounts();
        $this->assertSame(0, Artisan::call('yazoo:bootstrap-showcase', $arguments));
        $this->assertSame($counts, $this->showcaseCounts());
    }

    public function test_it_refuses_to_upgrade_a_v1_with_new_social_content(): void
    {
        app(MarketplaceTestSeeder::class)->seedFrom($this->imagesPath);
        app(DemoContentSeeder::class)->run();
        User::query()->firstOrFail()->posts()->create(['content' => 'Existing jury contribution']);
        Cache::store('database')->forever('yazoo_showcase_bootstrap_v1', 'complete');
        $this->assertSame(1, Artisan::call('yazoo:bootstrap-showcase', ['--images' => $this->imagesPath, '--confirmation' => $this->confirmation]));
        $this->assertDatabaseCount('posts', 4);
        $this->assertDatabaseCount('stories', 0);
        $this->assertNull(Cache::store('database')->get('yazoo_showcase_bootstrap_v2'));
    }

    public function test_showcase_seeders_do_not_require_development_only_faker(): void
    {
        foreach (['DemoContentSeeder.php', 'MarketplaceTestSeeder.php'] as $seeder) {
            $source = File::get(database_path('seeders/'.$seeder));

            $this->assertStringNotContainsString('::factory(', $source, $seeder);
            $this->assertStringNotContainsString('fake()', $source, $seeder);
            $this->assertStringNotContainsString('images.unsplash.com', $source, $seeder);
        }
    }

    public function test_it_rehydrates_missing_showcase_media_without_changing_database_rows(): void
    {
        $arguments = [
            '--images' => $this->imagesPath,
            '--confirmation' => $this->confirmation,
        ];
        $this->assertSame(0, Artisan::call('yazoo:bootstrap-showcase', $arguments));
        $countsBefore = $this->showcaseCounts();

        Storage::disk('public')->deleteDirectory('marketplace/demo');
        Storage::disk('public')->deleteDirectory('showcase/demo');
        $this->assertSame([], Storage::disk('public')->allFiles('marketplace/demo'));

        $this->assertSame(0, Artisan::call('yazoo:ensure-showcase-media', [
            '--images' => $this->imagesPath,
        ]));
        $this->assertCount(21, Storage::disk('public')->allFiles('marketplace/demo'));
        $this->assertCount(2, Storage::disk('public')->allFiles('showcase/demo'));
        $this->assertSame($countsBefore, $this->showcaseCounts());
    }

    private function writeImages(): void
    {
        $png = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', true);
        $this->assertIsString($png);

        foreach (array_keys(MarketplaceTestSeeder::IMAGE_PLAN) as $file) {
            File::put($this->imagesPath.DIRECTORY_SEPARATOR.$file, $png);
        }
    }

    /** @return array<string, int> */
    private function showcaseCounts(): array
    {
        return [
            'users' => User::query()->count(),
            'posts' => Post::query()->count(),
            'comments' => Comment::query()->count(),
            'likes' => Like::query()->count(),
            'animals' => Animal::query()->count(),
            'products' => Product::query()->count(),
            'services' => ServiceListing::query()->count(),
            'reservations' => Reservation::query()->count(),
            'payments' => Payment::query()->count(),
            'stories' => DB::table('stories')->count(),
            'follows' => DB::table('follows')->count(),
            'veterinarians' => Veterinarian::query()->count(),
            'availability' => VeterinarianAvailabilitySlot::query()->count(),
            'appointments' => DB::table('veterinarian_appointments')->count(),
            'conversations' => DB::table('conversations')->count(),
            'messages' => DB::table('messages')->count(),
        ];
    }
}
