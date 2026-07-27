<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'token' => env('POSTMARK_TOKEN'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'resend' => [
        'key' => env('RESEND_KEY'),
    ],

    'google' => [
        'client_id' => env('GOOGLE_CLIENT_ID'),
        'client_secret' => env('GOOGLE_CLIENT_SECRET'),
        'redirect' => env('GOOGLE_REDIRECT_URI'),
        'frontend_redirect' => env('GOOGLE_FRONTEND_REDIRECT', env('FRONTEND_URL', 'http://localhost:5173').'/feed'),
        'login_redirect' => env('GOOGLE_LOGIN_REDIRECT', env('FRONTEND_URL', 'http://localhost:5173').'/login'),
    ],

    'contact' => [
        'recipient' => env('CONTACT_RECIPIENT'),
        'public_phone' => env('CONTACT_PUBLIC_PHONE'),
        'public_whatsapp' => env('CONTACT_PUBLIC_WHATSAPP'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'sms' => [
        'driver' => env('SMS_DRIVER', 'disabled'),
        'otp_ttl' => (int) env('SMS_OTP_TTL', 5),
        'otp_max_attempts' => (int) env('SMS_OTP_MAX_ATTEMPTS', 5),
        'otp_resend_cooldown_seconds' => (int) env('SMS_OTP_RESEND_COOLDOWN_SECONDS', 60),
        'otp_lock_minutes' => (int) env('SMS_OTP_LOCK_MINUTES', 15),
        'twilio' => [
            'sid' => env('TWILIO_SID'),
            'token' => env('TWILIO_AUTH_TOKEN'),
            'from' => env('TWILIO_FROM'),
        ],
        'orange' => [
            'base_url' => env('ORANGE_SMS_BASE_URL'),
            'token' => env('ORANGE_SMS_TOKEN'),
            'sender' => env('ORANGE_SMS_SENDER', 'YaZoo'),
        ],
    ],

];
