<?php

namespace Tests\Feature;

use App\Jobs\QueueHeartbeat;
use App\Models\User;
use App\Support\OperationsSchedule;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

class OperationsReadinessTest extends TestCase
{
    use RefreshDatabase;

    public function test_retention_and_heartbeats_are_scheduled_with_distributed_guards(): void
    {
        $schedule = $this->app->make(Schedule::class);
        OperationsSchedule::register($schedule);
        $events = collect($schedule->events());

        $purge = $events->first(
            fn ($event): bool => $event->description === 'retention:purge-professional-documents',
        );
        $schedulerHeartbeat = $events->first(
            fn ($event): bool => $event->description === 'operations:scheduler-heartbeat',
        );

        $this->assertNotNull($purge);
        $this->assertTrue($purge->withoutOverlapping);
        $this->assertTrue($purge->onOneServer);
        $this->assertSame('15 4 * * *', $purge->expression);

        $this->assertNotNull($schedulerHeartbeat);
        $this->assertTrue($schedulerHeartbeat->withoutOverlapping);
        $this->assertTrue($schedulerHeartbeat->onOneServer);
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
            'auth.admin_bootstrap.enabled' => true,
        ]);

        $this->artisan('yazoo:preflight-production')
            ->expectsOutput('LEGAL_STATUS is required and must not use a placeholder.')
            ->expectsOutput('ADMIN_BOOTSTRAP_ENABLED must be false in production.')
            ->expectsOutput('SMS_DRIVER=log is forbidden in production.')
            ->expectsOutput('At least one active administrator is required.')
            ->assertExitCode(1);
    }

    public function test_production_preflight_passes_with_complete_safe_configuration(): void
    {
        User::factory()->admin()->create();
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
            ->expectsOutput('Production preflight passed.')
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
