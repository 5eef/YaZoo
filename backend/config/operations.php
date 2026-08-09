<?php

return [
    'run_migrations' => (bool) env('YAZOO_RUN_MIGRATIONS', false),
    'run_queue_worker' => (bool) env('YAZOO_RUN_QUEUE_WORKER', false),
    'run_scheduler' => (bool) env('YAZOO_RUN_SCHEDULER', false),
    'require_scheduler_heartbeat' => (bool) env(
        'YAZOO_REQUIRE_SCHEDULER_HEARTBEAT',
        env('YAZOO_RUN_SCHEDULER', false),
    ),
    'queue_heartbeat_ttl_seconds' => (int) env('YAZOO_QUEUE_HEARTBEAT_TTL_SECONDS', 180),
    'scheduler_heartbeat_ttl_seconds' => (int) env('YAZOO_SCHEDULER_HEARTBEAT_TTL_SECONDS', 180),
    'migration_lock_seconds' => (int) env('YAZOO_MIGRATION_LOCK_SECONDS', 1800),
    'account_deletion_retry_max_attempts' => (int) env('YAZOO_ACCOUNT_DELETION_RETRY_MAX_ATTEMPTS', 5),
    'account_deletion_retry_batch_size' => (int) env('YAZOO_ACCOUNT_DELETION_RETRY_BATCH_SIZE', 25),
    'account_deletion_processing_lease_seconds' => (int) env('YAZOO_ACCOUNT_DELETION_PROCESSING_LEASE_SECONDS', 900),
    'account_deletion_unique_lock_store' => env(
        'YAZOO_ACCOUNT_DELETION_UNIQUE_LOCK_STORE',
        env('CACHE_STORE', 'database'),
    ),
    'app_service_storage_enabled' => filter_var(
        env('WEBSITES_ENABLE_APP_SERVICE_STORAGE', false),
        FILTER_VALIDATE_BOOL,
    ),
    'persistent_storage_path' => env('YAZOO_PERSISTENT_STORAGE_PATH', '/home/site/yazoo-storage'),
    'require_persistent_storage' => filter_var(
        env('YAZOO_REQUIRE_PERSISTENT_STORAGE', env('APP_ENV') === 'production'),
        FILTER_VALIDATE_BOOL,
    ),
    'require_reverb_health' => filter_var(env('YAZOO_REQUIRE_REVERB_HEALTH', false), FILTER_VALIDATE_BOOL),
    'showcase_bootstrap_enabled' => filter_var(
        env('YAZOO_SHOWCASE_BOOTSTRAP_ENABLED', false),
        FILTER_VALIDATE_BOOL,
    ),
    'showcase_bootstrap_confirmation' => env(
        'YAZOO_SHOWCASE_CONFIRMATION',
        'yazoo-mysql-0c2b09/yazoo@yazoo-api',
    ),
    'showcase_app_host' => env('YAZOO_SHOWCASE_APP_HOST', 'yazoo-api.azurewebsites.net'),
    'showcase_database_host' => env(
        'YAZOO_SHOWCASE_DATABASE_HOST',
        'yazoo-mysql-0c2b09.mysql.database.azure.com',
    ),
    'showcase_database_name' => env('YAZOO_SHOWCASE_DATABASE_NAME', 'yazoo'),
    'showcase_password' => env('YAZOO_SHOWCASE_PASSWORD'),
    'showcase_mfa_secret' => env('YAZOO_SHOWCASE_MFA_SECRET'),
    'showcase_mfa_recovery_codes' => env('YAZOO_SHOWCASE_MFA_RECOVERY_CODES'),
];
