<?php

return [
    'entity_name' => env('LEGAL_ENTITY_NAME', env('APP_ENV') === 'production' ? '' : 'YaZoo'),
    'legal_status' => env('LEGAL_STATUS', ''),
    'address' => env('LEGAL_ADDRESS', ''),
    'ice' => env('LEGAL_ICE', ''),
    'privacy_contact_email' => env('PRIVACY_CONTACT_EMAIL', 'privacy@example.com'),
    'data_controller_name' => env('DATA_CONTROLLER_NAME', env('APP_ENV') === 'production' ? '' : 'YaZoo'),
    'data_retention_days' => (int) env('DATA_RETENTION_DAYS', 365),
    'data_request_response_days' => (int) env('DATA_REQUEST_RESPONSE_DAYS', 30),
];
