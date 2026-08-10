<?php

namespace Tests\Feature;

use App\Jobs\QueueHeartbeat;
use App\Models\User;
use App\Support\OperationsSchedule;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class OperationsReadinessTest extends TestCase
{
    use RefreshDatabase;

    public function test_retention_and_heartbeats_are_scheduled_with_distributed_guards(): void
    {
        config(['queue.default' => 'redis']);

        $schedule = $this->app->make(Schedule::class);
        OperationsSchedule::register($schedule);
        $events = collect($schedule->events());

        $purge = $events->first(
            fn ($event): bool => $event->description === 'retention:purge-professional-documents',
        );
        $schedulerHeartbeat = $events->first(
            fn ($event): bool => $event->description === 'operations:scheduler-heartbeat',
        );
        $deletionRetries = $events->first(
            fn ($event): bool => $event->description === 'privacy:dispatch-account-deletion-retries',
        );

        $this->assertNotNull($purge);
        $this->assertTrue($purge->withoutOverlapping);
        $this->assertTrue($purge->onOneServer);
        $this->assertSame('15 4 * * *', $purge->expression);

        $this->assertNotNull($schedulerHeartbeat);
        $this->assertTrue($schedulerHeartbeat->withoutOverlapping);
        $this->assertTrue($schedulerHeartbeat->onOneServer);

        $this->assertNotNull($deletionRetries);
        $this->assertTrue($deletionRetries->withoutOverlapping);
        $this->assertTrue($deletionRetries->onOneServer);
        $this->assertSame('*/5 * * * *', $deletionRetries->expression);
    }

    public function test_production_migration_command_is_disabled_by_default(): void
    {
        config(['operations.run_migrations' => false]);

        $this->artisan('yazoo:migrate-production')
            ->expectsOutput('Startup migrations are disabled.')
            ->assertExitCode(0);
    }

    public function test_production_migration_command_refuses_a_concurrent_lock_owner(): void
    {
        config(['operations.run_migrations' => true]);
        $lock = Cache::lock('operations:production-migrations', 60);
        $this->assertTrue($lock->get());

        try {
            $this->artisan('yazoo:migrate-production')
                ->expectsOutput('Another migration process owns the distributed lock.')
                ->assertExitCode(1);
        } finally {
            $lock->release();
        }
    }

    public function test_production_migration_command_runs_once_and_releases_its_lock(): void
    {
        config(['operations.run_migrations' => true]);

        $this->artisan('yazoo:migrate-production')
            ->assertExitCode(0);

        $lock = Cache::lock('operations:production-migrations', 60);
        $this->assertTrue($lock->get());
        $lock->release();
    }

    public function test_queue_heartbeat_job_records_worker_liveness(): void
    {
        Cache::forget('operations:queue-heartbeat');

        (new QueueHeartbeat)->handle();

        $this->assertNotNull(Cache::get('operations:queue-heartbeat'));
    }

    public function test_media_backup_schedule_uses_cached_configuration(): void
    {
        config([
            'media.backup.enabled' => true,
            'media.backup.schedule' => '02:45',
            'media.backup.keep_days' => 11,
        ]);
        $schedule = $this->app->make(Schedule::class);
        OperationsSchedule::register($schedule);

        $backup = collect($schedule->events())->first(
            fn ($event): bool => str_contains((string) $event->command, 'yazoo:backup-media --keep=11'),
        );

        $this->assertNotNull($backup);
        $this->assertSame('45 2 * * *', $backup->expression);
        $this->assertTrue($backup->withoutOverlapping);
    }

    public function test_production_preflight_requires_external_configuration_and_an_active_admin(): void
    {
        config([
            'app.key' => 'base64:test-key',
            'legal.legal_status' => '',
            'legal.address' => '',
            'legal.ice' => '',
            'legal.privacy_contact_email' => 'privacy@example.com',
            'services.contact.recipient' => '',
            'mail.default' => 'log',
            'services.sms.driver' => 'log',
            'queue.default' => 'redis',
            'operations.run_queue_worker' => false,
            'operations.run_scheduler' => false,
            'operations.account_deletion_unique_lock_store' => 'array',
            'media.scanning.required_in_production' => true,
            'media.scanning.enabled' => true,
            'media.scanning.unique_lock_store' => 'array',
            'auth.admin_bootstrap.enabled' => true,
        ]);

        $this->artisan('yazoo:preflight-production')
            ->expectsOutput('LEGAL_STATUS is required and must not use a placeholder.')
            ->expectsOutput('ADMIN_BOOTSTRAP_ENABLED must be false in production.')
            ->expectsOutput('SMS_DRIVER=log is forbidden in production.')
            ->expectsOutput('YAZOO_ACCOUNT_DELETION_UNIQUE_LOCK_STORE must use a shared atomic cache store in production.')
            ->expectsOutput('MEDIA_SCAN_UNIQUE_LOCK_STORE must use a shared atomic cache store in production.')
            ->expectsOutput('MEDIA_SCAN_DRIVER must provide an available scanner in production.')
            ->expectsOutput('At least one active administrator is required.')
            ->assertExitCode(1);
    }

    public function test_production_preflight_passes_with_complete_safe_configuration(): void
    {
        User::factory()->admin()->create([
            'admin_mfa_secret' => 'test-mfa-secret',
            'admin_mfa_recovery_codes' => [Hash::make('TESTRECOVERY')],
            'admin_mfa_confirmed_at' => now(),
        ]);
        config([
            'app.key' => 'base64:test-key',
            'legal.legal_status' => 'Configuration de test',
            'legal.address' => 'Adresse de test',
            'legal.ice' => 'ICE-TEST',
            'legal.privacy_contact_email' => 'privacy@yazoo.test',
            'services.contact.recipient' => 'contact@yazoo.test',
            'mail.default' => 'smtp',
            'mail.mailers.smtp.host' => 'smtp.yazoo.test',
            'mail.mailers.smtp.username' => 'smtp-user',
            'mail.mailers.smtp.password' => 'smtp-password',
            'mail.from.address' => 'noreply@yazoo.test',
            'services.sms.driver' => 'disabled',
            'queue.default' => 'redis',
            'operations.run_queue_worker' => true,
            'operations.run_scheduler' => true,
            'operations.account_deletion_unique_lock_store' => 'redis',
            'operations.account_deletion_retry_max_attempts' => 5,
            'operations.account_deletion_processing_lease_seconds' => 900,
            'operations.app_service_storage_enabled' => true,
            'operations.persistent_storage_path' => '/home/site/yazoo-storage',
            'payments.providers.cmi.enabled' => false,
            'auth.admin_bootstrap.enabled' => false,
            'auth.admin_mfa.enforced' => true,
        ]);

        $this->artisan('yazoo:preflight-production')
            ->expectsOutput('Production preflight passed.')
            ->assertExitCode(0);
    }

    public function test_production_configuration_preflight_does_not_require_the_application_schema(): void
    {
        config([
            'app.key' => 'base64:test-key',
            'legal.legal_status' => 'Configuration de test',
            'legal.address' => 'Adresse de test',
            'legal.ice' => 'ICE-TEST',
            'legal.privacy_contact_email' => 'privacy@yazoo.test',
            'services.contact.recipient' => 'contact@yazoo.test',
            'mail.default' => 'smtp',
            'mail.mailers.smtp.host' => 'smtp.yazoo.test',
            'mail.mailers.smtp.username' => 'smtp-user',
            'mail.mailers.smtp.password' => 'smtp-password',
            'mail.from.address' => 'noreply@yazoo.test',
            'services.sms.driver' => 'disabled',
            'queue.default' => 'redis',
            'operations.run_queue_worker' => true,
            'operations.run_scheduler' => true,
            'operations.account_deletion_unique_lock_store' => 'redis',
            'operations.account_deletion_retry_max_attempts' => 5,
            'operations.account_deletion_processing_lease_seconds' => 900,
            'operations.app_service_storage_enabled' => true,
            'operations.persistent_storage_path' => '/home/site/yazoo-storage',
            'payments.providers.cmi.enabled' => false,
            'auth.admin_bootstrap.enabled' => false,
            'auth.admin_mfa.enforced' => true,
        ]);

        $this->assertDatabaseCount('users', 0);

        $this->artisan('yazoo:preflight-production', ['--configuration-only' => true])
            ->expectsOutput('Production configuration preflight passed.')
            ->assertExitCode(0);
    }

    public function test_production_preflight_fails_without_an_active_administrator(): void
    {
        config([
            'app.key' => 'base64:test-key',
            'legal.legal_status' => 'Configuration de test',
            'legal.address' => 'Adresse de test',
            'legal.ice' => 'ICE-TEST',
            'legal.privacy_contact_email' => 'privacy@yazoo.test',
            'services.contact.recipient' => 'contact@yazoo.test',
            'mail.default' => 'smtp',
            'mail.mailers.smtp.host' => 'smtp.yazoo.test',
            'mail.mailers.smtp.username' => 'smtp-user',
            'mail.mailers.smtp.password' => 'smtp-password',
            'mail.from.address' => 'noreply@yazoo.test',
            'services.sms.driver' => 'disabled',
            'queue.default' => 'redis',
            'operations.run_queue_worker' => true,
            'operations.run_scheduler' => true,
            'operations.app_service_storage_enabled' => true,
            'operations.persistent_storage_path' => '/home/site/yazoo-storage',
            'payments.providers.cmi.enabled' => false,
            'auth.admin_bootstrap.enabled' => false,
        ]);

        $this->artisan('yazoo:preflight-production')
            ->expectsOutput('At least one active administrator is required.')
            ->assertExitCode(1);
    }

    public function test_demo_database_seeder_refuses_to_run_in_production(): void
    {
        $previousEnvironment = app()->environment();
        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('Demo seeders are disabled in production.');

        try {
            app()->detectEnvironment(fn (): string => 'production');
            (new DatabaseSeeder)->run();
        } finally {
            app()->detectEnvironment(fn (): string => $previousEnvironment);
        }
    }
}
