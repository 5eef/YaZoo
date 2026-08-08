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
];
