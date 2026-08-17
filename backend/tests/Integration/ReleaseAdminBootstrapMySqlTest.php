<?php

namespace Tests\Integration;

use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class ReleaseAdminBootstrapMySqlTest extends TestCase
{
    private const EMAIL = 'mysql-release-admin@yazoo.test';

    protected function setUp(): void
    {
        parent::setUp();

        if (
            config('database.default') !== 'mysql'
            || ! filter_var(env('YAZOO_MYSQL_CONCURRENCY_TEST', false), FILTER_VALIDATE_BOOL)
        ) {
            $this->markTestSkipped('Requires the explicitly enabled disposable DATABASE #2 MySQL environment.');
        }

        User::query()->where('email', self::EMAIL)->delete();
        $this->assertFalse(User::query()->where('is_admin', true)->exists(), 'Disposable MySQL must not retain an admin fixture.');

        $host = (string) config('database.connections.mysql.host');
        $port = (string) config('database.connections.mysql.port');
        $database = (string) config('database.connections.mysql.database');
        config([
            'operations.release_admin_bootstrap_enabled' => true,
            'operations.release_admin_bootstrap_confirmation' => "{$host}/{$database}",
            'operations.release_admin' => [
                'name' => 'MySQL Release Administrator',
                'email' => self::EMAIL,
                'password' => 'MySQL-Release-Password-2026!',
                'mfa_secret' => 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP',
                'mfa_recovery_codes' => 'ABCDE12345,ABCDE12346,ABCDE12347,ABCDE12348,ABCDE12349,ABCDE1234A,ABCDE1234B,ABCDE1234C',
            ],
            'operations.require_expected_database' => true,
            'operations.expected_database_host' => $host,
            'operations.expected_database_port' => $port,
            'operations.expected_database_name' => $database,
            'operations.protected_database_names' => ['yazoo'],
        ]);
    }

    protected function tearDown(): void
    {
        if (config('database.default') === 'mysql') {
            User::query()->where('email', self::EMAIL)->delete();
        }

        parent::tearDown();
    }

    public function test_release_admin_bootstrap_is_idempotent_on_mysql(): void
    {
        $confirmation = (string) config('operations.release_admin_bootstrap_confirmation');

        $this->artisan('yazoo:bootstrap-release-admin', ['--confirmation' => $confirmation])
            ->assertExitCode(0);
        $this->artisan('yazoo:bootstrap-release-admin', ['--confirmation' => $confirmation])
            ->assertExitCode(0);

        $admin = User::query()->where('email', self::EMAIL)->sole();
        $this->assertTrue($admin->is_admin);
        $this->assertNotNull($admin->admin_mfa_confirmed_at);
        $this->assertCount(8, $admin->admin_mfa_recovery_codes);
        $this->assertTrue(Hash::check('ABCDE12345', $admin->admin_mfa_recovery_codes[0]));
    }
}
