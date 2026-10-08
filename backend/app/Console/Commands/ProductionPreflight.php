<?php

namespace App\Console\Commands;

use App\Contracts\MediaScanner;
use App\Models\User;
use App\Support\AccountDeletionRetryPolicy;
use App\Support\DatabaseTargetGuard;
use App\Support\Sms\SmsSender;
use Illuminate\Console\Command;
use Illuminate\Encryption\Encrypter;

class ProductionPreflight extends Command
{
    protected $signature = 'yazoo:preflight-production
        {--configuration-only : Validate production configuration without querying application tables}';

    protected $description = 'Fail when required production configuration or operational processes are missing.';

    public function handle(DatabaseTargetGuard $databaseTargetGuard): int
    {
        $failures = [];
        $configurationOnly = (bool) $this->option('configuration-only');
        $profile = (string) config('operations.deployment_profile');
        $isProductionProfile = $profile === 'production';
        $isShowcaseProfile = $profile === 'showcase';

        if (! in_array($profile, ['showcase', 'production'], true)) {
            $failures[] = 'YAZOO_DEPLOYMENT_PROFILE must be showcase or production for deployment preflight.';
        }

        array_push($failures, ...$databaseTargetGuard->failures());

        if (config('app.env') !== 'production') {
            $failures[] = 'APP_ENV must be production for deployment preflight.';
        }
        if ((bool) config('app.debug')) {
            $failures[] = 'APP_DEBUG must be false for deployment preflight.';
        }
        foreach (['APP_URL' => config('app.url'), 'FRONTEND_URL' => config('app.frontend_url')] as $name => $value) {
            $this->requireValue($failures, $name, $value);
            $parts = parse_url((string) $value);
            $host = strtolower((string) ($parts['host'] ?? ''));
            if (! is_array($parts) || ($parts['scheme'] ?? '') !== 'https' || empty($parts['host']) || isset($parts['user']) || isset($parts['pass'])
                || isset($parts['query']) || isset($parts['fragment']) || preg_match('/[<>\s]/', $host)
                || in_array(trim($host, '[]'), ['localhost', '127.0.0.1', '::1'], true)
                || preg_match('/\.(test|invalid|example|localhost)$/', $host)
                || (filter_var(trim($host, '[]'), FILTER_VALIDATE_IP) && ! filter_var(trim($host, '[]'), FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE))) {
                $failures[] = "{$name} must be an HTTPS URL without credentials.";
            }
        }
        if (config('cors.supports_credentials') && (in_array('*', config('cors.allowed_origins', []), true) || config('cors.allowed_origins_patterns', []) !== [])) {
            $failures[] = 'Credentialed CORS requires explicit allowed origins without wildcard patterns.';
        }
        if (! config('session.secure') || ! config('session.http_only')) {
            $failures[] = 'Production session cookies must be Secure and HttpOnly.';
        }
        $connection = (string) config('database.default');
        if (in_array($connection, ['mysql', 'mariadb', 'pgsql', 'sqlsrv'], true)) {
            $this->requireValue($failures, 'DB_DATABASE', config("database.connections.{$connection}.database"));
            $this->requireValue($failures, 'DB_USERNAME', config("database.connections.{$connection}.username"));
            $this->requireValue($failures, 'DB_PASSWORD', config("database.connections.{$connection}.password"));
            $password = (string) config("database.connections.{$connection}.password");
            if (strlen($password) < 12 || preg_match('/^(password|root|admin|secret|changeme|test)(\d|[!_.-])*$/i', $password)) {
                $failures[] = 'DB_PASSWORD must be a non-default secret of at least 12 characters.';
            }
        }

        $this->requireValue($failures, 'APP_KEY', config('app.key'));
        $key = (string) config('app.key');
        $decodedKey = str_starts_with($key, 'base64:') ? base64_decode(substr($key, 7), true) : $key;
        if (! is_string($decodedKey) || ! Encrypter::supported($decodedKey, (string) config('app.cipher'))) {
            $failures[] = 'APP_KEY must be a valid key for the configured cipher.';
        } elseif (count(array_unique(str_split($decodedKey))) < 8) {
            $failures[] = 'APP_KEY must not use a weak repeated-byte key.';
        }
        foreach (array_filter(array_map('trim', explode(',', (string) config('app.trusted_proxies')))) as $proxy) {
            [$ip, $mask] = array_pad(explode('/', $proxy, 2), 2, null);
            $bits = str_contains($ip, ':') ? 128 : 32;
            if (! filter_var($ip, FILTER_VALIDATE_IP) || ($mask !== null && (! ctype_digit($mask) || (int) $mask < 1 || (int) $mask > $bits))) {
                $failures[] = 'TRUSTED_PROXIES must contain explicit IP addresses or bounded CIDR ranges.';
                break;
            }
        }
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

        if ($isProductionProfile && in_array(config('mail.default'), ['log', 'array'], true)) {
            $failures[] = 'MAIL_MAILER must use a real transport in production.';
        } elseif (! in_array(config('mail.default'), ['log', 'array'], true)) {
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
            config('queue.default') !== 'sync'
            && ! (bool) config('operations.run_queue_worker')
        ) {
            $failures[] = 'An asynchronous QUEUE_CONNECTION requires YAZOO_RUN_QUEUE_WORKER=true.';
        }

        if ($isProductionProfile && ! (bool) config('operations.run_scheduler')) {
            $failures[] = 'YAZOO_RUN_SCHEDULER=true is required for retention and heartbeat tasks.';
        }

        $uniqueLockStore = (string) config('operations.account_deletion_unique_lock_store');
        $uniqueLockDriver = (string) config("cache.stores.{$uniqueLockStore}.driver");
        if (! in_array($uniqueLockDriver, ['redis', 'database', 'dynamodb', 'memcached'], true)) {
            $failures[] = 'YAZOO_ACCOUNT_DELETION_UNIQUE_LOCK_STORE must use a shared atomic cache store in production.';
        }

        $configuredDeletionAttempts = (int) config('operations.account_deletion_retry_max_attempts');
        if (
            $configuredDeletionAttempts < AccountDeletionRetryPolicy::MIN_PROCESSING_ATTEMPTS
            || $configuredDeletionAttempts > AccountDeletionRetryPolicy::MAX_PROCESSING_ATTEMPTS
        ) {
            $failures[] = 'YAZOO_ACCOUNT_DELETION_RETRY_MAX_ATTEMPTS must be between 2 and 50, including the initial attempt.';
        }

        if ((int) config('operations.account_deletion_processing_lease_seconds') < 60) {
            $failures[] = 'YAZOO_ACCOUNT_DELETION_PROCESSING_LEASE_SECONDS must be at least 60.';
        }

        if ((bool) config('operations.require_persistent_storage')) {
            $path = rtrim((string) config('operations.persistent_storage_path'), '/\\');

            if ($path === '') {
                $failures[] = 'YAZOO_PERSISTENT_STORAGE_PATH is required when YAZOO_REQUIRE_PERSISTENT_STORAGE=true.';
            } elseif (! $configurationOnly && (! is_dir($path) || ! is_readable($path) || ! is_writable($path))) {
                $failures[] = 'YAZOO_PERSISTENT_STORAGE_PATH must exist and be readable and writable.';
            }
        }

        if ($isProductionProfile && (bool) config('media.scanning.required_in_production')) {
            $mediaLockStore = (string) config('media.scanning.unique_lock_store');
            $mediaLockDriver = (string) config("cache.stores.{$mediaLockStore}.driver");

            if (! in_array($mediaLockDriver, ['redis', 'database', 'dynamodb', 'memcached'], true)) {
                $failures[] = 'MEDIA_SCAN_UNIQUE_LOCK_STORE must use a shared atomic cache store in production.';
            }

            if (! (bool) config('media.scanning.enabled')) {
                $failures[] = 'MEDIA_SCAN_ENABLED=true is required by the production media policy.';
            } elseif (! app(MediaScanner::class)->isAvailable()) {
                $failures[] = 'MEDIA_SCAN_DRIVER must provide an available scanner in production.';
            }
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
        if ((bool) config('payments.providers.cmi.enabled')) {
            foreach (['gateway_url', 'client_id', 'store_key', 'ok_url', 'fail_url', 'callback_url'] as $field) {
                $this->requireValue($failures, 'CMI_'.strtoupper($field), config("payments.providers.cmi.{$field}"));
            }
            if (strlen((string) config('payments.providers.cmi.store_key')) < 12) {
                $failures[] = 'CMI_STORE_KEY must contain at least 12 characters.';
            }
        }

        if (
            ! $configurationOnly
            &&
            ! User::query()
                ->where('is_admin', true)
                ->whereNull('banned_at')
                ->where('is_suspended', false)
                ->exists()
        ) {
            $failures[] = 'At least one active administrator is required.';
        }

        if (($isProductionProfile || $isShowcaseProfile) && ! (bool) config('auth.admin_mfa.enforced')) {
            $failures[] = 'ADMIN_MFA_ENFORCED must be true in production.';
        } elseif (! $configurationOnly && ! User::query()
            ->where('is_admin', true)
            ->whereNotNull('admin_mfa_confirmed_at')
            ->whereNotNull('admin_mfa_recovery_codes')
            ->whereNull('banned_at')
            ->where('is_suspended', false)
            ->get()
            ->contains(fn (User $admin): bool => count($admin->admin_mfa_recovery_codes ?? []) > 0)) {
            $failures[] = 'ADMIN_MFA_ENFORCED requires an active administrator with confirmed TOTP and recovery codes.';
        }

        foreach ($failures as $failure) {
            $this->error($failure);
        }

        if ($failures !== []) {
            return self::FAILURE;
        }

        $this->info($configurationOnly
            ? 'Production configuration preflight passed.'
            : 'Production preflight passed.');

        return self::SUCCESS;
    }

    /**
     * @param  array<int, string>  $failures
     */
    private function requireValue(array &$failures, string $name, mixed $value): void
    {
        $normalized = trim((string) $value);

        if ($normalized === '' || preg_match('/example\.(com|org|net)|<[^>]+>|YOUR[_ -]|à renseigner|a renseigner|todo|placeholder|change.?me|replace[_ -]?me|^default$/iu', $normalized)) {
            $failures[] = "{$name} is required and must not use a placeholder.";
        }
    }
}
