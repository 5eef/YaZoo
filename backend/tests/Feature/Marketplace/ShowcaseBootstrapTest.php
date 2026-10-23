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
use App\Support\ShowcaseBootstrapState;
use Database\Seeders\DemoContentSeeder;
use Database\Seeders\MarketplaceTestSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Tests\TestCase;

class ShowcaseBootstrapTest extends TestCase
{
    use RefreshDatabase;

    private string $imagesPath;

    private string $confirmation = 'demo-db.example/yazoo_showcase@demo.example';

    private string $password = 'Showcase-Test-Password-2026!';

    public function test_legacy_credential_sync_refuses_to_change_any_existing_hash(): void
    {
        foreach (['client.fes@yazoo.test', 'veterinaire.agadir@yazoo.test', 'real@example.test'] as $email) {
            User::factory()->create(['email' => $email, 'is_admin' => false]);
        }
        $before = DB::table('users')->orderBy('id')->get()->toJson();
        $this->assertSame(1, Artisan::call('yazoo:sync-showcase-credentials', ['--confirmation' => $this->confirmation]));
        $this->assertSame($before, DB::table('users')->orderBy('id')->get()->toJson());
    }

    public function test_initial_bootstrap_refuses_even_an_allowlisted_existing_account(): void
    {
        User::factory()->create(['email' => 'veterinaire.agadir@yazoo.test']);
        $before = DB::table('users')->get()->toJson();
        $this->assertSame(1, Artisan::call('yazoo:bootstrap-showcase', [
            '--images' => $this->imagesPath, '--confirmation' => $this->confirmation,
        ]));
        $this->assertSame($before, DB::table('users')->get()->toJson());
        $this->assertSame([], Storage::disk('public')->allFiles());
    }

    public function test_registered_user_and_veterinarian_can_relogin_after_completed_bootstrap_restart(): void
    {
        Mail::fake();
        $arguments = ['--images' => $this->imagesPath, '--confirmation' => $this->confirmation];
        $this->assertSame(0, Artisan::call('yazoo:bootstrap-showcase', $arguments));
        $payload = [
            'name' => 'Independent User', 'email' => 'independent@example.test',
            'password' => 'Owner-Selected-Test-Password!', 'password_confirmation' => 'Owner-Selected-Test-Password!',
            'phone' => '+212600008777', 'country' => 'Maroc', 'city' => 'Agadir',
        ];
        $this->postJson('/api/auth/register', $payload)->assertCreated();
        $newUser = User::query()->where('email', $payload['email'])->sole();
        $this->assertTrue(Hash::check($payload['password'], $newUser->password));
        $this->assertFalse(Hash::check($this->password, $newUser->password));

        $login = $this->postJson('/api/auth/login', [
            'email' => $payload['email'], 'password' => $payload['password'],
        ])->assertOk();
        $token = Crypt::decryptString($login->getCookie('yazoo_api_token', false)->getValue());
        $this->withHeader('Authorization', 'Bearer '.$token)->postJson('/api/auth/logout')->assertOk();
        $this->assertDatabaseMissing('personal_access_tokens', ['token' => hash('sha256', explode('|', $token, 2)[1])]);
        $this->flushHeaders();
        $this->postJson('/api/auth/login', [
            'email' => $payload['email'], 'password' => $payload['password'],
        ])->assertOk();

        $before = DB::table('users')->orderBy('id')->get()->toJson();
        $counts = $this->showcaseCounts();
        // Re-resolve the cache repository, retaining only database-backed marker state.
        Cache::forgetDriver('database');
        $this->assertSame('complete', Cache::store('database')->get('yazoo_showcase_bootstrap_v2'));
        config(['operations.showcase_password' => 'Different-Startup-Test-Password!']);
        $this->assertSame(0, Artisan::call('yazoo:bootstrap-showcase', $arguments));
        $this->assertStringContainsString('aucune ecriture', Artisan::output());
        $this->assertSame($before, DB::table('users')->orderBy('id')->get()->toJson());
        $this->assertSame($counts, $this->showcaseCounts());
        $this->postJson('/api/auth/login', [
            'email' => $payload['email'], 'password' => $payload['password'],
        ])->assertOk();
        $this->postJson('/api/auth/login', [
            'email' => 'veterinaire.agadir@yazoo.test', 'password' => $this->password,
        ])->assertOk()->assertJsonPath('user.email', 'veterinaire.agadir@yazoo.test');
        $this->assertSame($before, DB::table('users')->orderBy('id')->get()->toJson());
    }

    public function test_completed_bootstrap_survives_application_cache_clear_with_registered_users(): void
    {
        $arguments = ['--images' => $this->imagesPath, '--confirmation' => $this->confirmation];
        $this->assertSame(0, Artisan::call('yazoo:bootstrap-showcase', $arguments));
        User::factory()->create(['email' => 'registered-before-cache-clear@example.test']);
        $before = DB::table('users')->orderBy('id')->get()->toJson();
        $counts = $this->showcaseCounts();
        $this->assertSame(0, Artisan::call('cache:clear', ['store' => 'database']));
        $this->assertNull(Cache::store('database')->get('yazoo_showcase_bootstrap_v2'));
        $this->assertSame(0, Artisan::call('yazoo:bootstrap-showcase', $arguments), Artisan::output());
        $this->assertSame($before, DB::table('users')->orderBy('id')->get()->toJson());
        $this->assertSame($counts, $this->showcaseCounts());
        $this->assertDatabaseCount('operation_markers', 1);
        config(['operations.showcase_bootstrap_enabled' => true]);
        $this->mock(ShowcaseBootstrapGuard::class)->shouldReceive('assertAllowed')->twice()->with($this->confirmation);
        $refresh = ['--confirmation' => $this->confirmation];
        $this->assertSame(0, Artisan::call('yazoo:refresh-showcase-availability', $refresh));
        $slots = VeterinarianAvailabilitySlot::query()->count();
        $this->assertSame(0, Artisan::call('yazoo:refresh-showcase-availability', $refresh));
        $this->assertSame($slots, VeterinarianAvailabilitySlot::query()->count());
        $this->assertSame($before, DB::table('users')->orderBy('id')->get()->toJson());
    }

    public function test_legacy_v2_is_promoted_before_purge_without_replaying_accounts_or_content(): void
    {
        User::factory()->create(['email' => 'legacy-registered@example.test']);
        User::factory()->create(['email' => 'veterinaire.agadir@yazoo.test']);
        $before = DB::table('users')->orderBy('id')->get()->toJson();
        Cache::store('database')->forever(ShowcaseBootstrapState::KEY, 'complete');
        $this->assertDatabaseCount('operation_markers', 0);
        $arguments = ['--images' => $this->imagesPath, '--confirmation' => $this->confirmation];
        $this->assertSame(0, Artisan::call('yazoo:bootstrap-showcase', $arguments));
        $this->assertDatabaseHas('operation_markers', ['key' => ShowcaseBootstrapState::KEY]);
        $marker = DB::table('operation_markers')->where('key', ShowcaseBootstrapState::KEY)->first();
        $this->assertSame('legacy-cache-v2', json_decode($marker->metadata, true)['source']);
        $this->assertSame(0, Artisan::call('cache:clear', ['store' => 'database']));
        $this->assertSame(0, Artisan::call('yazoo:bootstrap-showcase', $arguments));
        $this->assertSame(0, Artisan::call('yazoo:bootstrap-showcase', $arguments));
        $this->assertDatabaseCount('operation_markers', 1);
        $this->assertEquals($marker, DB::table('operation_markers')->where('key', ShowcaseBootstrapState::KEY)->first());
        $this->assertSame($before, DB::table('users')->orderBy('id')->get()->toJson());
        $this->assertDatabaseCount('posts', 0);
        $this->assertSame([], Storage::disk('public')->allFiles());
    }

    public function test_render_legacy_sql_marker_with_yazoo_prefix_promotes_without_touching_twenty_accounts(): void
    {
        config(['cache.prefix' => 'yazoo_cache_']);
        Cache::forgetDriver('database');
        User::factory()->count(18)->create();
        User::factory()->create(['email' => 'veterinaire.agadir@yazoo.test']);
        User::factory()->create(['email' => 'client.fes@yazoo.test']);
        $before = DB::table('users')->orderBy('id')->get()->toJson();
        DB::table('cache')->insert([
            'key' => 'yazoo_cache_yazoo_showcase_bootstrap_v2',
            'value' => 's:8:"complete";',
            'expiration' => now()->addDay()->timestamp,
        ]);
        $this->assertSame('complete', Cache::store('database')->get(ShowcaseBootstrapState::KEY));
        $this->assertDatabaseCount('operation_markers', 0);
        $arguments = ['--images' => $this->imagesPath, '--confirmation' => $this->confirmation];
        $this->assertSame(0, Artisan::call('yazoo:bootstrap-showcase', $arguments));
        $this->assertDatabaseHas('operation_markers', ['key' => ShowcaseBootstrapState::KEY]);
        $this->assertSame(0, Artisan::call('cache:clear', ['store' => 'database']));
        $this->assertSame(0, Artisan::call('yazoo:bootstrap-showcase', $arguments));
        $this->assertDatabaseCount('operation_markers', 1);
        $this->assertDatabaseCount('users', 20);
        $this->assertSame($before, DB::table('users')->orderBy('id')->get()->toJson());
        $this->assertDatabaseCount('posts', 0);
        $this->assertSame([], Storage::disk('public')->allFiles());
    }

    public function test_partial_initialization_without_proof_is_refused_after_cache_purge(): void
    {
        app(MarketplaceTestSeeder::class)->seedFrom($this->imagesPath);
        $before = DB::table('users')->orderBy('id')->get()->toJson();
        $counts = $this->showcaseCounts();
        $this->assertSame(0, Artisan::call('cache:clear', ['store' => 'database']));
        $arguments = ['--images' => $this->imagesPath, '--confirmation' => $this->confirmation];
        $this->assertSame(1, Artisan::call('yazoo:bootstrap-showcase', $arguments));
        $this->assertSame($before, DB::table('users')->orderBy('id')->get()->toJson());
        $this->assertSame($counts, $this->showcaseCounts());
        $this->assertDatabaseCount('operation_markers', 0);
    }

    public function test_lost_legacy_marker_never_authorizes_recovery_from_a_nonempty_database(): void
    {
        User::factory()->create(['email' => 'registered@example.test']);
        $before = DB::table('users')->get()->toJson();
        Cache::store('database')->forever(ShowcaseBootstrapState::KEY, 'complete');
        $this->assertSame(0, Artisan::call('cache:clear', ['store' => 'database']));
        $this->assertSame(1, Artisan::call('yazoo:bootstrap-showcase', [
            '--images' => $this->imagesPath, '--confirmation' => $this->confirmation,
        ]));
        $this->assertDatabaseCount('operation_markers', 0);
        $this->assertSame($before, DB::table('users')->get()->toJson());
    }

    public function test_wrong_database_refuses_legacy_promotion_before_any_write(): void
    {
        User::factory()->create(['email' => 'protected@example.test']);
        $before = DB::table('users')->get()->toJson();
        Cache::store('database')->forever(ShowcaseBootstrapState::KEY, 'complete');
        app()['env'] = 'production';
        config([
            'app.url' => 'https://demo.example',
            'operations.showcase_bootstrap_enabled' => true,
            'operations.showcase_app_host' => 'demo.example',
            'operations.showcase_database_host' => 'demo-db.example',
            'operations.showcase_database_name' => 'authorized_showcase',
        ]);
        $this->assertSame(1, Artisan::call('yazoo:bootstrap-showcase', [
            '--images' => $this->imagesPath, '--confirmation' => $this->confirmation,
        ]));
        $this->assertStringContainsString('La cible MySQL showcase', Artisan::output());
        $this->assertDatabaseCount('operation_markers', 0);
        $this->assertSame($before, DB::table('users')->get()->toJson());
    }

    public function test_dry_run_does_not_promote_legacy_marker(): void
    {
        Cache::store('database')->forever(ShowcaseBootstrapState::KEY, 'complete');
        $this->assertSame(0, Artisan::call('yazoo:bootstrap-showcase', [
            '--images' => $this->imagesPath, '--confirmation' => $this->confirmation, '--dry-run' => true,
        ]));
        $this->assertDatabaseCount('operation_markers', 0);
        $this->assertDatabaseCount('users', 0);
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

    public function test_it_creates_showcase_credentials_once_and_preserves_them_on_rerun(): void
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

        $hashesBefore = User::query()->pluck('password', 'id')->all();
        config(['operations.showcase_password' => 'Changed-Test-Only-Password-2026!']);
        $countsBefore = $this->showcaseCounts();
        $publicFilesBefore = Storage::disk('public')->allFiles();
        $privateFilesBefore = Storage::disk('private')->allFiles();

        $this->assertSame(0, Artisan::call('yazoo:bootstrap-showcase', $arguments));
        $this->assertSame($hashesBefore, User::query()->pluck('password', 'id')->all());
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
        $this->assertDatabaseHas('operation_markers', ['key' => ShowcaseBootstrapState::KEY]);
        $this->assertSame(0, Artisan::call('cache:clear', ['store' => 'database']));
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
