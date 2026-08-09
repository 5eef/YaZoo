<?php

namespace Tests\Unit\Support;

use App\Support\ShowcaseBootstrapGuard;
use RuntimeException;
use Tests\TestCase;

class ShowcaseBootstrapGuardTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        app()['env'] = 'production';
        config([
            'app.url' => 'https://yazoo-api.azurewebsites.net',
            'database.default' => 'showcase',
            'database.connections.showcase' => [
                'driver' => 'mysql',
                'host' => 'yazoo-mysql-0c2b09.mysql.database.azure.com',
                'database' => 'yazoo',
            ],
            'operations.showcase_bootstrap_enabled' => true,
            'operations.showcase_bootstrap_confirmation' => 'yazoo-mysql-0c2b09/yazoo@yazoo-api',
            'operations.showcase_app_host' => 'yazoo-api.azurewebsites.net',
            'operations.showcase_database_host' => 'yazoo-mysql-0c2b09.mysql.database.azure.com',
            'operations.showcase_database_name' => 'yazoo',
            'operations.showcase_password' => 'Showcase-Test-Password-2026!',
            'operations.showcase_mfa_secret' => 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP',
            'operations.showcase_mfa_recovery_codes' => 'ABCDE12345,ABCDE12346,ABCDE12347,ABCDE12348,ABCDE12349,ABCDE1234A,ABCDE1234B,ABCDE1234C',
        ]);
    }

    public function test_it_accepts_only_the_exact_authorized_production_target(): void
    {
        app(ShowcaseBootstrapGuard::class)->assertAllowed('yazoo-mysql-0c2b09/yazoo@yazoo-api');

        $this->addToAssertionCount(1);
    }

    public function test_it_rejects_a_wrong_confirmation(): void
    {
        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('confirmation');

        app(ShowcaseBootstrapGuard::class)->assertAllowed('wrong-target');
    }

    public function test_it_rejects_a_different_application_host(): void
    {
        config(['app.url' => 'https://another-api.azurewebsites.net']);

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('cible applicative');

        app(ShowcaseBootstrapGuard::class)->assertAllowed('yazoo-mysql-0c2b09/yazoo@yazoo-api');
    }

    public function test_it_rejects_a_different_database(): void
    {
        config(['database.connections.showcase.database' => 'another_database']);

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('cible MySQL');

        app(ShowcaseBootstrapGuard::class)->assertAllowed('yazoo-mysql-0c2b09/yazoo@yazoo-api');
    }

    public function test_it_rejects_a_short_showcase_password(): void
    {
        config(['operations.showcase_password' => 'too-short']);

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('20 caracteres');

        app(ShowcaseBootstrapGuard::class)->assertAllowed('yazoo-mysql-0c2b09/yazoo@yazoo-api');
    }

    public function test_it_rejects_invalid_mfa_bootstrap_material(): void
    {
        config(['operations.showcase_mfa_secret' => 'invalid']);

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('MFA');

        app(ShowcaseBootstrapGuard::class)->assertAllowed('yazoo-mysql-0c2b09/yazoo@yazoo-api');
    }
}
