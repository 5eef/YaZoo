<?php

namespace Tests\Feature\Marketplace;

use App\Models\User;
use Database\Seeders\MarketplaceTestSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Tests\TestCase;

class AzureShowcaseBootstrapTest extends TestCase
{
    use RefreshDatabase;

    private string $imagesPath;

    private string $confirmation = 'yazoo-mysql-0c2b09/yazoo@yazoo-api';

    private string $password = 'Showcase-Test-Password-2026!';

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'app.url' => 'http://localhost',
            'operations.showcase_bootstrap_confirmation' => $this->confirmation,
            'operations.showcase_password' => $this->password,
            'operations.showcase_mfa_secret' => 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP',
            'operations.showcase_mfa_recovery_codes' => 'ABCDE12345,ABCDE12346,ABCDE12347,ABCDE12348,ABCDE12349,ABCDE1234A,ABCDE1234B,ABCDE1234C',
        ]);
        Storage::fake('public');
        Storage::fake('private');
        $this->imagesPath = storage_path('framework/testing/azure-showcase-'.Str::uuid());
        File::ensureDirectoryExists($this->imagesPath);
        $this->writeImages();
    }

    protected function tearDown(): void
    {
        if (isset($this->imagesPath) && str_starts_with($this->imagesPath, storage_path('framework/testing/azure-showcase-'))) {
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

        $this->assertSame(0, Artisan::call('yazoo:bootstrap-azure-showcase', $arguments));
        $this->assertDatabaseCount('users', 20);
        $this->assertDatabaseCount('posts', 3);
        $this->assertDatabaseCount('comments', 2);
        $this->assertDatabaseCount('likes', 4);
        $this->assertDatabaseCount('animals', 5);
        $this->assertDatabaseCount('products', 9);
        $this->assertDatabaseCount('service_listings', 10);
        $this->assertDatabaseCount('reservations', 6);
        $this->assertDatabaseCount('payments', 2);
        $this->assertSame('complete', Cache::store('database')->get('yazoo_showcase_bootstrap_v1'));
        $this->assertTrue(User::query()->get()->every(
            fn (User $user): bool => Hash::check($this->password, $user->password),
        ));
        $admin = User::query()->where('email', 'bough.youssef@gmail.com')->firstOrFail();
        $this->assertNotNull($admin->admin_mfa_confirmed_at);
        $this->assertSame('JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP', $admin->admin_mfa_secret);
        $this->assertCount(8, $admin->admin_mfa_recovery_codes);
        $this->assertTrue(Hash::check('ABCDE12345', $admin->admin_mfa_recovery_codes[0]));

        $countsBefore = $this->showcaseCounts();
        $publicFilesBefore = Storage::disk('public')->allFiles();
        $privateFilesBefore = Storage::disk('private')->allFiles();

        $this->assertSame(0, Artisan::call('yazoo:bootstrap-azure-showcase', $arguments));
        $this->assertSame($countsBefore, $this->showcaseCounts());
        $this->assertSame($publicFilesBefore, Storage::disk('public')->allFiles());
        $this->assertSame($privateFilesBefore, Storage::disk('private')->allFiles());
    }

    public function test_it_refuses_a_database_containing_an_unrelated_account(): void
    {
        User::factory()->create(['email' => 'existing-user@example.test']);

        $exit = Artisan::call('yazoo:bootstrap-azure-showcase', [
            '--images' => $this->imagesPath,
            '--confirmation' => $this->confirmation,
        ]);

        $this->assertSame(1, $exit);
        $this->assertDatabaseCount('users', 1);
        $this->assertSame([], Storage::disk('public')->allFiles());
        $this->assertSame([], Storage::disk('private')->allFiles());
        $this->assertNull(Cache::store('database')->get('yazoo_showcase_bootstrap_v1'));
    }

    public function test_showcase_seeders_do_not_require_development_only_faker(): void
    {
        foreach (['DemoContentSeeder.php', 'MarketplaceTestSeeder.php'] as $seeder) {
            $source = File::get(database_path('seeders/'.$seeder));

            $this->assertStringNotContainsString('::factory(', $source, $seeder);
            $this->assertStringNotContainsString('fake()', $source, $seeder);
        }
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
            'posts' => \App\Models\Post::query()->count(),
            'comments' => \App\Models\Comment::query()->count(),
            'likes' => \App\Models\Like::query()->count(),
            'animals' => \App\Models\Animal::query()->count(),
            'products' => \App\Models\Product::query()->count(),
            'services' => \App\Models\ServiceListing::query()->count(),
            'reservations' => \App\Models\Reservation::query()->count(),
            'payments' => \App\Models\Payment::query()->count(),
        ];
    }
}
