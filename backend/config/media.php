<?php

return [
    'driver' => env('MEDIA_STORAGE_DRIVER', 'filesystem'),
    'filesystem_disk' => env('MEDIA_FILESYSTEM_DISK', 'public'),
    'scanning' => [
        'enabled' => filter_var(env('MEDIA_SCAN_ENABLED', false), FILTER_VALIDATE_BOOL),
        'required_in_production' => filter_var(
            env('MEDIA_SCAN_REQUIRED_IN_PRODUCTION', env('APP_ENV') === 'production'),
            FILTER_VALIDATE_BOOL,
        ),
        'driver' => env('MEDIA_SCAN_DRIVER', 'unavailable'),
        'quarantine_disk' => env('MEDIA_QUARANTINE_DISK', 'private'),
        'unique_lock_store' => env('MEDIA_SCAN_UNIQUE_LOCK_STORE', env('CACHE_STORE', 'database')),
        'max_attempts' => (int) env('MEDIA_SCAN_MAX_ATTEMPTS', 3),
        'timeout_seconds' => (int) env('MEDIA_SCAN_TIMEOUT_SECONDS', 30),
        'max_bytes' => (int) env('MEDIA_SCAN_MAX_BYTES', 52_428_800),
        'allowed_extensions' => ['jpg', 'jpeg', 'png', 'webp', 'gif', 'mp4', 'webm', 'mov', 'pdf'],
        'allowed_mime_types' => [
            'image/jpeg',
            'image/png',
            'image/webp',
            'image/gif',
            'video/mp4',
            'video/webm',
            'video/quicktime',
            'application/pdf',
        ],
    ],
    'backup' => [
        'enabled' => env('MEDIA_BACKUP_ENABLED', false),
        'schedule' => env('MEDIA_BACKUP_SCHEDULE', '03:30'),
        'keep_days' => env('MEDIA_BACKUP_KEEP_DAYS', 7),
    ],
    'mongodb' => [
        'enabled' => env('MEDIA_MONGODB_ENABLED', false),
        'uri' => env('MEDIA_MONGODB_URI'),
        'database' => env('MEDIA_MONGODB_DATABASE', 'yazoo_media'),
        'bucket' => env('MEDIA_MONGODB_BUCKET', 'uploads'),
    ],
];
