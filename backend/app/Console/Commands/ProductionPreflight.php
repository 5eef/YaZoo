<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Support\Sms\SmsSender;
use Illuminate\Console\Command;

class ProductionPreflight extends Command
{
    protected $signature = 'yazoo:preflight-production';

    protected $description = 'Fail when required production configuration or operational processes are missing.';

    public function handle(): int
    {
        $failures = [];

        $this->requireValue($failures, 'APP_KEY', config('app.key'));
        $this->requireValue($failures, 'LEGAL_ENTITY_NAME', config('legal.entity_name'));
        $this->requireValue($failures, 'LEGAL_STATUS', config('legal.legal_status'));
        $this->requireValue($failures, 'LEGAL_ADDRESS', config('legal.address'));
        $this->requireValue($failures, 'LEGAL_ICE', config('legal.ice'));
        $this->requireValue($failures, 'PRIVACY_CONTACT_EMAIL', config('legal.privacy_contact_email'));
        $this->requireValue($failures, 'DATA_CONTROLLER_NAME', config('legal.data_controller_name'));
        $this->requireValue($failures, 'CONTACT_RECIPIENT', config('services.contact.recipient'));

        if ((int) config('legal.data_retention_days') <= 0) {
            $failures[] = 'DATA_RETENTION_DAYS must be a positive integer.';
        }

        if ((int) config('legal.data_request_response_days') <= 0) {
            $failures[] = 'DATA_REQUEST_RESPONSE_DAYS must be a positive integer.';
        }

        if ((bool) config('auth.admin_bootstrap.enabled')) {
            $failures[] = 'ADMIN_BOOTSTRAP_ENABLED must be false in production.';
        }

        if (in_array(config('mail.default'), ['log', 'array'], true)) {
            $failures[] = 'MAIL_MAILER must use a real transport in production.';
        } else {
            $this->requireValue($failures, 'MAIL_HOST', config('mail.mailers.smtp.host'));
            $this->requireValue($failures, 'MAIL_USERNAME', config('mail.mailers.smtp.username'));
            $this->requireValue($failures, 'MAIL_PASSWORD', config('mail.mailers.smtp.password'));
            $this->requireValue($failures, 'MAIL_FROM_ADDRESS', config('mail.from.address'));
        }

        $smsDriver = (string) config('services.sms.driver', 'disabled');
        if ($smsDriver === 'log') {
            $failures[] = 'SMS_DRIVER=log is forbidden in production.';
        } elseif (
            $smsDriver !== 'disabled'
            && ! app(SmsSender::class)->isAvailable()
        ) {
            $failures[] = 'SMS_DRIVER is enabled without complete provider configuration.';
        }

        if (
            config('queue.default') === 'redis'
            && ! (bool) config('operations.run_queue_worker')
        ) {
            $failures[] = 'QUEUE_CONNECTION=redis requires YAZOO_RUN_QUEUE_WORKER=true.';
        }

        if (! (bool) config('operations.run_scheduler')) {
            $failures[] = 'YAZOO_RUN_SCHEDULER=true is required for retention and heartbeat tasks.';
        }

        if (! (bool) config('operations.app_service_storage_enabled')) {
            $failures[] = 'WEBSITES_ENABLE_APP_SERVICE_STORAGE=true is required for persistent App Service media.';
        }

        if ((string) config('operations.persistent_storage_path') !== '/home/site/yazoo-storage') {
            $failures[] = 'YAZOO_PERSISTENT_STORAGE_PATH must be /home/site/yazoo-storage.';
        }

        if (
            (bool) config('payments.providers.cmi.enabled')
            && (
                config('payments.providers.cmi.mode') !== 'production'
                || collect(['gateway_url', 'client_id', 'store_key', 'ok_url', 'fail_url', 'callback_url'])
                    ->contains(fn (string $key): bool => blank(config("payments.providers.cmi.{$key}")))
            )
        ) {
            $failures[] = 'CMI is enabled without a complete production configuration.';
        }

        if (
            ! User::query()
                ->where('is_admin', true)
                ->whereNull('banned_at')
                ->where('is_suspended', false)
                ->exists()
        ) {
            $failures[] = 'At least one active administrator is required.';
        }

        if (
            (bool) config('auth.admin_mfa.enforced')
            && ! User::query()
                ->where('is_admin', true)
                ->whereNotNull('admin_mfa_confirmed_at')
                ->whereNotNull('admin_mfa_recovery_codes')
                ->whereNull('banned_at')
                ->where('is_suspended', false)
                ->get()
                ->contains(fn (User $admin): bool => count($admin->admin_mfa_recovery_codes ?? []) > 0)
        ) {
            $failures[] = 'ADMIN_MFA_ENFORCED requires an active administrator with confirmed TOTP and recovery codes.';
        }

        foreach ($failures as $failure) {
            $this->error($failure);
        }

        if ($failures !== []) {
            return self::FAILURE;
        }

        $this->info('Production preflight passed.');

        return self::SUCCESS;
    }

    /**
     * @param  array<int, string>  $failures
     */
    private function requireValue(array &$failures, string $name, mixed $value): void
    {
        $normalized = trim((string) $value);

        if ($normalized === '' || str_contains($normalized, 'example.com')) {
            $failures[] = "{$name} is required and must not use a placeholder.";
        }
    }
}
