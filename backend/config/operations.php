<?php

return [
    'run_migrations' => (bool) env('YAZOO_RUN_MIGRATIONS', false),
    'run_queue_worker' => (bool) env('YAZOO_RUN_QUEUE_WORKER', false),
    'run_scheduler' => (bool) env('YAZOO_RUN_SCHEDULER', false),
    'queue_heartbeat_ttl_seconds' => (int) env('YAZOO_QUEUE_HEARTBEAT_TTL_SECONDS', 180),
    'scheduler_heartbeat_ttl_seconds' => (int) env('YAZOO_SCHEDULER_HEARTBEAT_TTL_SECONDS', 180),
    'migration_lock_seconds' => (int) env('YAZOO_MIGRATION_LOCK_SECONDS', 1800),
];
