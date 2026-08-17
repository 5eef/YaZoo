<?php

namespace Tests\Feature\Marketplace;

use App\Models\User;
use Database\Seeders\MarketplaceTestSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Tests\TestCase;

class Database2TestDataBootstrapTest extends TestCase
{
    use RefreshDatabase;

    private const TEST_PASSWORD = 'Database2-Test-Accounts-2026!';

    private string $imagesPath;

    private string $confirmation;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('public');
        Storage::fake('private');
        $this->imagesPath = storage_path('framework/testing/database2-demo-'.Str::uuid());
        File::ensureDirectoryExists($this->imagesPath);
        $this->writeImages();

        $connection = (string) config('database.default');
        $host = (string) config("database.connections.{$connection}.host");
        $port = (string) config("database.connections.{$connection}.port");
        $database = (string) config("database.connections.{$connection}.database");
        if ($connection === 'sqlite') {
            $host = 'database2.test';
            $port = '3306';
            config([
                'database.connections.sqlite.host' => $host,
                'database.connections.sqlite.port' => $port,
            ]);
        }
        $this->confirmation = "{$host}/{$database}";

        config([
            'operations.database2_test_data_bootstrap_enabled' => true,
            'operations.database2_test_data_bootstrap_confirmation' => $this->confirmation,
            'operations.database2_test_account_password' => self::TEST_PASSWORD,
            'operations.database2_test_data_images_path' => $this->imagesPath,
            'operations.release_admin' => [
                'name' => 'Release Administrator',
                'email' => 'bough.youssef@gmail.com',
                'password' => 'Release-Administrator-2026!',
                'mfa_secret' => 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP',
                'mfa_recovery_codes' => 'ABCDE12345,ABCDE12346,ABCDE12347,ABCDE12348,ABCDE12349,ABCDE1234A,ABCDE1234B,ABCDE1234C',
            ],
            'operations.release_admin_bootstrap_enabled' => true,
            'operations.release_admin_bootstrap_confirmation' => $this->confirmation,
            'operations.require_expected_database' => true,
            'operations.expected_database_host' => $host,
            'operations.expected_database_port' => $port,
            'operations.expected_database_name' => $database,
            'operations.protected_database_names' => ['yazoo'],
        ]);
    }

    protected function tearDown(): void
    {
        if (isset($this->imagesPath) && str_starts_with($this->imagesPath, storage_path('framework/testing/database2-demo-'))) {
            File::deleteDirectory($this->imagesPath);
        }

        parent::tearDown();
    }

    public function test_it_bootstraps_the_local_test_accounts_and_media_once(): void
    {
        $arguments = ['--confirmation' => $this->confirmation];

        $this->assertSame(0, Artisan::call('yazoo:bootstrap-database2-test-data', $arguments));
        $this->assertDatabaseCount('users', 14);
        $this->assertDatabaseCount('animals', 3);
        $this->assertDatabaseCount('products', 7);
        $this->assertDatabaseCount('service_listings', 10);
        $this->assertDatabaseCount('veterinarians', 3);
        $this->assertDatabaseCount('professional_verifications', 12);
        $this->assertDatabaseCount('operation_markers', 1);
        $this->assertCount(21, Storage::disk('public')->allFiles());
        $this->assertCount(12, Storage::disk('private')->allFiles());
        $this->assertTrue(User::query()->get()->every(
            fn (User $user): bool => Hash::check(self::TEST_PASSWORD, $user->password),
        ));

        $counts = [
            'users' => User::query()->count(),
            'animals' => DB::table('animals')->count(),
            'products' => DB::table('products')->count(),
            'files' => count(Storage::disk('public')->allFiles()),
        ];

        $this->assertSame(0, Artisan::call('yazoo:bootstrap-database2-test-data', $arguments));
        $this->assertSame($counts, [
            'users' => User::query()->count(),
            'animals' => DB::table('animals')->count(),
            'products' => DB::table('products')->count(),
            'files' => count(Storage::disk('public')->allFiles()),
        ]);
    }

    public function test_it_refuses_the_protected_database_before_writing(): void
    {
        $connection = (string) config('database.default');
        config([
            'operations.expected_database_name' => 'yazoo',
            "database.connections.{$connection}.database" => 'yazoo',
        ]);

        $exit = Artisan::call('yazoo:bootstrap-database2-test-data', [
            '--confirmation' => $this->confirmation,
        ]);

        $this->assertSame(1, $exit);
        $this->assertDatabaseCount('users', 0);
        $this->assertSame([], Storage::disk('public')->allFiles());
    }

    public function test_release_admin_is_secured_after_the_dataset_and_stays_separate(): void
    {
        $arguments = ['--confirmation' => $this->confirmation];

        $this->assertSame(0, Artisan::call('yazoo:bootstrap-database2-test-data', $arguments));
        $this->assertSame(0, Artisan::call('yazoo:bootstrap-release-admin', $arguments));

        $admin = User::query()->where('email', 'bough.youssef@gmail.com')->sole();
        $this->assertTrue(Hash::check('Release-Administrator-2026!', $admin->password));
        $this->assertFalse(Hash::check(self::TEST_PASSWORD, $admin->password));
        $this->assertNotNull($admin->admin_mfa_confirmed_at);
        $this->assertCount(8, $admin->admin_mfa_recovery_codes);
        $this->assertTrue(User::query()->where('is_admin', false)->get()->every(
            fn (User $user): bool => Hash::check(self::TEST_PASSWORD, $user->password),
        ));

        $adminPassword = $admin->password;
        $this->assertSame(0, Artisan::call('yazoo:bootstrap-database2-test-data', $arguments));
        $this->assertSame($adminPassword, $admin->fresh()->password);
    }

    public function test_it_refuses_an_unrelated_existing_account(): void
    {
        User::factory()->create(['email' => 'unrelated@example.test']);

        $exit = Artisan::call('yazoo:bootstrap-database2-test-data', [
            '--confirmation' => $this->confirmation,
        ]);

        $this->assertSame(1, $exit);
        $this->assertDatabaseCount('users', 1);
        $this->assertSame([], Storage::disk('public')->allFiles());
    }

    private function writeImages(): void
    {
        $png = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', true);
        $this->assertIsString($png);

        foreach (array_keys(MarketplaceTestSeeder::IMAGE_PLAN) as $file) {
            File::put($this->imagesPath.DIRECTORY_SEPARATOR.$file, $png);
        }
    }
}
