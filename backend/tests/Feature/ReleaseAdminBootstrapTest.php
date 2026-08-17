<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class ReleaseAdminBootstrapTest extends TestCase
{
    use RefreshDatabase;

    private const CONFIRMATION = 'database2.test/yazoo_azure_test';

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'operations.release_admin_bootstrap_enabled' => true,
            'operations.release_admin_bootstrap_confirmation' => self::CONFIRMATION,
            'operations.release_admin' => [
                'name' => 'Release Administrator',
                'email' => 'release-admin@yazoo.test',
                'password' => 'Release-Password-2026!',
                'mfa_secret' => 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP',
                'mfa_recovery_codes' => 'ABCDE12345,ABCDE12346,ABCDE12347,ABCDE12348,ABCDE12349,ABCDE1234A,ABCDE1234B,ABCDE1234C',
            ],
            'operations.require_expected_database' => true,
            'operations.expected_database_host' => 'database2.test',
            'operations.expected_database_port' => '3306',
            'operations.expected_database_name' => ':memory:',
            'operations.protected_database_names' => ['yazoo'],
            'database.connections.sqlite.host' => 'database2.test',
            'database.connections.sqlite.port' => '3306',
            'database.connections.sqlite.database' => ':memory:',
        ]);
    }

    public function test_it_creates_the_first_release_admin_with_confirmed_mfa(): void
    {
        $this->artisan('yazoo:bootstrap-release-admin', ['--confirmation' => self::CONFIRMATION])
            ->expectsOutput('Release administrator created with MFA enabled.')
            ->assertExitCode(0);

        $admin = User::query()->sole();
        $this->assertTrue($admin->is_admin);
        $this->assertFalse($admin->is_suspended);
        $this->assertNotNull($admin->email_verified_at);
        $this->assertNotNull($admin->admin_mfa_confirmed_at);
        $this->assertSame('JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP', $admin->admin_mfa_secret);
        $this->assertCount(8, $admin->admin_mfa_recovery_codes);
        $this->assertTrue(Hash::check('ABCDE12345', $admin->admin_mfa_recovery_codes[0]));
        $this->assertTrue(Hash::check('Release-Password-2026!', $admin->password));
    }

    public function test_it_is_idempotent_when_an_eligible_admin_already_exists(): void
    {
        $this->artisan('yazoo:bootstrap-release-admin', ['--confirmation' => self::CONFIRMATION])
            ->assertExitCode(0);
        $originalPassword = User::query()->sole()->password;

        config(['operations.release_admin.password' => 'Different-Password-2026!']);

        $this->artisan('yazoo:bootstrap-release-admin', ['--confirmation' => self::CONFIRMATION])
            ->expectsOutput('An active MFA-enabled administrator already exists; bootstrap made no changes.')
            ->assertExitCode(0);

        $this->assertDatabaseCount('users', 1);
        $this->assertSame($originalPassword, User::query()->sole()->password);
    }

    public function test_it_refuses_an_invalid_database_confirmation_without_writing(): void
    {
        $this->artisan('yazoo:bootstrap-release-admin', ['--confirmation' => 'database1.test/yazoo'])
            ->expectsOutputToContain('database confirmation is invalid')
            ->assertExitCode(1);

        $this->assertDatabaseCount('users', 0);
    }

    public function test_it_refuses_to_overwrite_an_existing_non_admin_account(): void
    {
        User::factory()->create(['email' => 'release-admin@yazoo.test', 'is_admin' => false]);

        $this->artisan('yazoo:bootstrap-release-admin', ['--confirmation' => self::CONFIRMATION])
            ->expectsOutputToContain('already belongs to a non-admin account')
            ->assertExitCode(1);

        $this->assertFalse(User::query()->sole()->is_admin);
    }

    public function test_it_refuses_a_protected_database_target(): void
    {
        config([
            'operations.expected_database_name' => 'yazoo',
            'database.connections.sqlite.database' => 'yazoo',
        ]);

        $this->artisan('yazoo:bootstrap-release-admin', ['--confirmation' => self::CONFIRMATION])
            ->expectsOutputToContain('Configured database is protected from deployment migrations.')
            ->assertExitCode(1);

        $this->assertDatabaseCount('users', 0);
    }
}
