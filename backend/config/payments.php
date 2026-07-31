<?php

return [
    'default_provider' => env('PAYMENT_DEFAULT_PROVIDER', 'manual_bank_transfer'),
    'currency' => env('PAYMENT_CURRENCY', 'MAD'),
    'commission_rate' => (float) env('PAYMENT_COMMISSION_RATE', 0),
    'active_payment_ttl_minutes' => (int) env('PAYMENT_ACTIVE_TTL_MINUTES', 30),

    'providers' => [
        'cash_on_pickup' => [
            'enabled' => true,
            'manual' => true,
        ],
        'manual_bank_transfer' => [
            'enabled' => true,
            'manual' => true,
        ],
        'cmi' => [
            'enabled' => env('CMI_ENABLED', false)
                && env('CMI_CONTRACT_APPROVED', false)
                && env('CMI_SANDBOX_VALIDATED', false)
                && env('CMI_HOMOLOGATION_APPROVED', false),
            'contract_approved' => env('CMI_CONTRACT_APPROVED', false),
            'sandbox_validated' => env('CMI_SANDBOX_VALIDATED', false),
            'homologation_approved' => env('CMI_HOMOLOGATION_APPROVED', false),
            'mode' => env('CMI_MODE', 'sandbox'),
            'gateway_url' => env('CMI_GATEWAY_URL'),
            'client_id' => env('CMI_CLIENT_ID'),
            'store_key' => env('CMI_STORE_KEY'),
            'ok_url' => env('CMI_OK_URL'),
            'fail_url' => env('CMI_FAIL_URL'),
            'callback_url' => env('CMI_CALLBACK_URL'),
        ],
        'payzone' => [
            'enabled' => false,
        ],
        'stripe' => [
            'enabled' => false,
        ],
    ],
];
