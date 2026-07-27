<?php

return [
    'driver' => env('MEDIA_STORAGE_DRIVER', 'filesystem'),
    'filesystem_disk' => env('MEDIA_FILESYSTEM_DISK', 'public'),
    'backup' => [
        'enabled' => env('MEDIA_BACKUP_ENABLED', false),
        'schedule' => env('MEDIA_BACKUP_SCHEDULE', '03:30'),
        'keep_days' => env('MEDIA_BACKUP_KEEP_DAYS', 7),
    ],
    'azure_blob' => [
        'enabled' => env('MEDIA_AZURE_BLOB_ENABLED', false),
        'account' => env('MEDIA_AZURE_BLOB_ACCOUNT'),
        'container' => env('MEDIA_AZURE_BLOB_CONTAINER'),
        'endpoint' => env('MEDIA_AZURE_BLOB_ENDPOINT'),
    ],
    'mongodb' => [
        'enabled' => env('MEDIA_MONGODB_ENABLED', false),
        'uri' => env('MEDIA_MONGODB_URI'),
        'database' => env('MEDIA_MONGODB_DATABASE', 'yazoo_media'),
        'bucket' => env('MEDIA_MONGODB_BUCKET', 'uploads'),
    ],
];
