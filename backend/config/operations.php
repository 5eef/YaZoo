<?php

return [
    'deployment_profile' => env('YAZOO_DEPLOYMENT_PROFILE', 'local'),
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
    'require_expected_database' => filter_var(
        env('YAZOO_REQUIRE_EXPECTED_DATABASE', env('APP_ENV') === 'production'),
        FILTER_VALIDATE_BOOL,
    ),
    'expected_database_host' => env('YAZOO_EXPECTED_DB_HOST'),
    'expected_database_port' => env('YAZOO_EXPECTED_DB_PORT'),
    'expected_database_name' => env('YAZOO_EXPECTED_DB_NAME'),
    'protected_database_names' => array_values(array_filter(array_map(
        'trim',
        explode(',', (string) env('YAZOO_PROTECTED_DB_NAMES', '')),
    ))),
    'release_admin_bootstrap_enabled' => filter_var(
        env('YAZOO_RELEASE_ADMIN_BOOTSTRAP_ENABLED', false),
        FILTER_VALIDATE_BOOL,
    ),
    'release_admin_bootstrap_confirmation' => env('YAZOO_RELEASE_ADMIN_BOOTSTRAP_CONFIRMATION'),
    'release_admin' => [
        'name' => env('YAZOO_RELEASE_ADMIN_NAME'),
        'email' => env('YAZOO_RELEASE_ADMIN_EMAIL'),
        'password' => env('YAZOO_RELEASE_ADMIN_PASSWORD'),
        'mfa_secret' => env('YAZOO_RELEASE_ADMIN_MFA_SECRET'),
        'mfa_recovery_codes' => env('YAZOO_RELEASE_ADMIN_MFA_RECOVERY_CODES'),
    ],
    'database2_test_data_bootstrap_enabled' => filter_var(
        env('YAZOO_DATABASE2_TEST_DATA_BOOTSTRAP_ENABLED', false),
        FILTER_VALIDATE_BOOL,
    ),
    'database2_test_data_bootstrap_confirmation' => env(
        'YAZOO_DATABASE2_TEST_DATA_BOOTSTRAP_CONFIRMATION',
    ),
    'database2_test_account_password' => env('YAZOO_DATABASE2_TEST_ACCOUNT_PASSWORD'),
    'database2_test_data_images_path' => env(
        'YAZOO_DATABASE2_TEST_DATA_IMAGES_PATH',
        database_path('seeders/assets/marketplace'),
    ),
    'account_deletion_retry_max_attempts' => (int) env('YAZOO_ACCOUNT_DELETION_RETRY_MAX_ATTEMPTS', 5),
    'account_deletion_retry_batch_size' => (int) env('YAZOO_ACCOUNT_DELETION_RETRY_BATCH_SIZE', 25),
    'account_deletion_processing_lease_seconds' => (int) env('YAZOO_ACCOUNT_DELETION_PROCESSING_LEASE_SECONDS', 900),
    'account_deletion_unique_lock_store' => env(
        'YAZOO_ACCOUNT_DELETION_UNIQUE_LOCK_STORE',
        env('CACHE_STORE', 'database'),
    ),
    'persistent_storage_path' => env('YAZOO_PERSISTENT_STORAGE_PATH'),
    'require_persistent_storage' => filter_var(
        env('YAZOO_REQUIRE_PERSISTENT_STORAGE', env('YAZOO_DEPLOYMENT_PROFILE', 'local') === 'production'),
        FILTER_VALIDATE_BOOL,
    ),
    'require_reverb_health' => filter_var(env('YAZOO_REQUIRE_REVERB_HEALTH', false), FILTER_VALIDATE_BOOL),
    'fulltext_search_enabled' => filter_var(env('YAZOO_FULLTEXT_SEARCH_ENABLED', true), FILTER_VALIDATE_BOOL),
    'showcase_bootstrap_enabled' => filter_var(
        env('YAZOO_SHOWCASE_BOOTSTRAP_ENABLED', false),
        FILTER_VALIDATE_BOOL,
    ),
    'showcase_bootstrap_confirmation' => env(
        'YAZOO_SHOWCASE_CONFIRMATION',
    ),
    'showcase_app_host' => env('YAZOO_SHOWCASE_APP_HOST'),
    'showcase_database_host' => env('YAZOO_SHOWCASE_DATABASE_HOST'),
    'showcase_database_name' => env('YAZOO_SHOWCASE_DATABASE_NAME'),
    'showcase_uploads_enabled' => filter_var(
        env('YAZOO_SHOWCASE_UPLOADS_ENABLED', false),
        FILTER_VALIDATE_BOOL,
    ),
    'showcase_password' => env('YAZOO_SHOWCASE_PASSWORD'),
    'showcase_mfa_secret' => env('YAZOO_SHOWCASE_MFA_SECRET'),
    'showcase_mfa_recovery_codes' => env('YAZOO_SHOWCASE_MFA_RECOVERY_CODES'),
];
