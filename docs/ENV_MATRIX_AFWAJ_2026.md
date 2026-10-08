# YaZoo environment matrix — 2026-10-08

Inventaire des neuf examples suivis ; noms seulement, aucune valeur de secret. REQUIRED PRODUCTION désigne les paramètres de politique minimale ; OPTIONAL reste obligatoire si le service correspondant est activé. SECRET doit provenir du secret store. PUBLIC SAFE signifie nom destiné au bundle, jamais autorisation de mettre des credentials. DEMO ONLY est interdit pour une vraie release sauf bootstrap explicitement gardé puis désactivé.

| Variable | Classification | Examples |
|---|---|---|
| ADMIN_BOOTSTRAP_ENABLED | DEMO ONLY | backend/.env.docker.example, backend/.env.example, backend/.env.production.example, backend/.env.showcase.example |
| ADMIN_MFA_CHALLENGE_TTL_MINUTES | OPTIONAL | backend/.env.example |
| ADMIN_MFA_ENFORCED | REQUIRED PRODUCTION | backend/.env.example, backend/.env.production.example, backend/.env.showcase.example |
| ADMIN_MFA_ISSUER | OPTIONAL | backend/.env.example |
| ANIMAL_LISTINGS_PUBLIC | OPTIONAL | backend/.env.example |
| APP_DEBUG | REQUIRED PRODUCTION | backend/.env.docker.example, backend/.env.example, backend/.env.production.example, backend/.env.showcase.example |
| APP_ENV | REQUIRED PRODUCTION | backend/.env.docker.example, backend/.env.example, backend/.env.production.example, backend/.env.showcase.example |
| APP_FAKER_LOCALE | OPTIONAL | backend/.env.docker.example, backend/.env.example, backend/.env.production.example |
| APP_FALLBACK_LOCALE | OPTIONAL | backend/.env.docker.example, backend/.env.example, backend/.env.production.example |
| APP_FORCE_HTTPS | OPTIONAL | backend/.env.docker.example, backend/.env.example, backend/.env.production.example, backend/.env.showcase.example |
| APP_KEY | REQUIRED PRODUCTION, SECRET | .env.example, backend/.env.docker.example, backend/.env.example, backend/.env.production.example, backend/.env.showcase.example |
| APP_LOCALE | OPTIONAL | backend/.env.docker.example, backend/.env.example, backend/.env.production.example |
| APP_MAINTENANCE_DRIVER | OPTIONAL | backend/.env.docker.example, backend/.env.example, backend/.env.production.example |
| APP_NAME | OPTIONAL | backend/.env.docker.example, backend/.env.example, backend/.env.production.example, backend/.env.showcase.example |
| APP_PORT | OPTIONAL | .env.example |
| APP_URL | REQUIRED PRODUCTION | backend/.env.docker.example, backend/.env.example, backend/.env.production.example, backend/.env.showcase.example |
| APPINSIGHTS_CONNECTION_STRING | OPTIONAL | .env.example, backend/.env.docker.example, backend/.env.example, backend/.env.production.example |
| AWS_ACCESS_KEY_ID | OPTIONAL, SECRET | backend/.env.example, backend/.env.production.example, backend/.env.showcase.example |
| AWS_BUCKET | OPTIONAL | backend/.env.example, backend/.env.production.example, backend/.env.showcase.example |
| AWS_DEFAULT_REGION | OPTIONAL | backend/.env.example, backend/.env.production.example, backend/.env.showcase.example |
| AWS_ENDPOINT | OPTIONAL | backend/.env.production.example, backend/.env.showcase.example |
| AWS_SECRET_ACCESS_KEY | OPTIONAL, SECRET | backend/.env.example, backend/.env.production.example, backend/.env.showcase.example |
| AWS_URL | OPTIONAL | backend/.env.production.example, backend/.env.showcase.example |
| AWS_USE_PATH_STYLE_ENDPOINT | OPTIONAL | backend/.env.example, backend/.env.production.example, backend/.env.showcase.example |
| BCRYPT_ROUNDS | OPTIONAL | backend/.env.docker.example, backend/.env.example, backend/.env.production.example |
| BROADCAST_CONNECTION | OPTIONAL | backend/.env.docker.example, backend/.env.example, backend/.env.production.example, backend/.env.showcase.example |
| CACHE_STORE | OPTIONAL | backend/.env.docker.example, backend/.env.example, backend/.env.production.example, backend/.env.showcase.example |
| CMI_CALLBACK_URL | OPTIONAL | backend/.env.docker.example, backend/.env.example, backend/.env.production.example |
| CMI_CLIENT_ID | OPTIONAL | backend/.env.docker.example, backend/.env.example, backend/.env.production.example |
| CMI_CONTRACT_APPROVED | OPTIONAL | backend/.env.example |
| CMI_ENABLED | OPTIONAL | backend/.env.docker.example, backend/.env.example, backend/.env.production.example, backend/.env.showcase.example |
| CMI_FAIL_URL | OPTIONAL | backend/.env.docker.example, backend/.env.example, backend/.env.production.example |
| CMI_GATEWAY_URL | OPTIONAL | backend/.env.docker.example, backend/.env.example, backend/.env.production.example |
| CMI_HOMOLOGATION_APPROVED | OPTIONAL | backend/.env.example |
| CMI_MODE | OPTIONAL | backend/.env.docker.example, backend/.env.example, backend/.env.production.example |
| CMI_OK_URL | OPTIONAL | backend/.env.docker.example, backend/.env.example, backend/.env.production.example |
| CMI_SANDBOX_VALIDATED | OPTIONAL | backend/.env.example |
| CMI_STORE_KEY | OPTIONAL, SECRET | backend/.env.docker.example, backend/.env.example, backend/.env.production.example |
| COMPOSE_PROJECT_NAME | OPTIONAL | .env.example |
| CONTACT_PUBLIC_PHONE | OPTIONAL | backend/.env.docker.example, backend/.env.example, backend/.env.production.example |
| CONTACT_PUBLIC_WHATSAPP | OPTIONAL | backend/.env.docker.example, backend/.env.example, backend/.env.production.example |
| CONTACT_RECIPIENT | REQUIRED PRODUCTION | backend/.env.docker.example, backend/.env.example, backend/.env.production.example, backend/.env.showcase.example |
| CORS_ALLOWED_ORIGINS | REQUIRED PRODUCTION | backend/.env.docker.example, backend/.env.example, backend/.env.production.example, backend/.env.showcase.example |
| DATA_CONTROLLER_NAME | REQUIRED PRODUCTION | backend/.env.docker.example, backend/.env.example, backend/.env.production.example, backend/.env.showcase.example |
| DATA_REQUEST_RESPONSE_DAYS | REQUIRED PRODUCTION | backend/.env.docker.example, backend/.env.example, backend/.env.production.example, backend/.env.showcase.example |
| DATA_RETENTION_DAYS | REQUIRED PRODUCTION | backend/.env.docker.example, backend/.env.example, backend/.env.production.example, backend/.env.showcase.example |
| DB_CONNECTION | REQUIRED PRODUCTION | backend/.env.docker.example, backend/.env.example, backend/.env.production.example, backend/.env.showcase.example |
| DB_DATABASE | REQUIRED PRODUCTION | .env.example, backend/.env.docker.example, backend/.env.example, backend/.env.production.example, backend/.env.showcase.example |
| DB_HOST | REQUIRED PRODUCTION | backend/.env.docker.example, backend/.env.example, backend/.env.production.example, backend/.env.showcase.example |
| DB_PASSWORD | REQUIRED PRODUCTION, SECRET | .env.example, backend/.env.docker.example, backend/.env.example, backend/.env.production.example, backend/.env.showcase.example |
| DB_PORT | REQUIRED PRODUCTION | backend/.env.docker.example, backend/.env.example, backend/.env.production.example, backend/.env.showcase.example |
| DB_QUEUE | OPTIONAL | backend/.env.docker.example, backend/.env.production.example |
| DB_QUEUE_RETRY_AFTER | OPTIONAL | backend/.env.docker.example, backend/.env.production.example |
| DB_QUEUE_TABLE | OPTIONAL | backend/.env.docker.example, backend/.env.production.example |
| DB_ROOT_PASSWORD | OPTIONAL, SECRET | .env.example, backend/.env.example |
| DB_USERNAME | REQUIRED PRODUCTION | .env.example, backend/.env.docker.example, backend/.env.example, backend/.env.production.example, backend/.env.showcase.example |
| E2E_ADMIN_EMAIL | DEMO ONLY | frontend/.env.e2e.example |
| E2E_ADMIN_PASSWORD | DEMO ONLY, SECRET | frontend/.env.e2e.example |
| E2E_API_URL | DEMO ONLY | frontend/.env.e2e.example |
| E2E_BASE_URL | DEMO ONLY | frontend/.env.e2e.example |
| E2E_SKIP_WEBSERVER | DEMO ONLY | frontend/.env.e2e.example |
| E2E_USER_EMAIL | DEMO ONLY | frontend/.env.e2e.example |
| E2E_USER_PASSWORD | DEMO ONLY, SECRET | frontend/.env.e2e.example |
| EXPO_PUBLIC_API_URL | REQUIRED PRODUCTION, PUBLIC SAFE | mobile/.env.example |
| FILESYSTEM_DISK | OPTIONAL | backend/.env.docker.example, backend/.env.example, backend/.env.production.example, backend/.env.showcase.example |
| FRONTEND_MONITORING_LOG_CHANNEL | OPTIONAL | backend/.env.docker.example, backend/.env.example, backend/.env.production.example |
| FRONTEND_MONITORING_LOG_DAYS | OPTIONAL | backend/.env.docker.example, backend/.env.example, backend/.env.production.example |
| FRONTEND_MONITORING_LOG_LEVEL | OPTIONAL | backend/.env.docker.example, backend/.env.example, backend/.env.production.example |
| FRONTEND_PORT | OPTIONAL | .env.example |
| FRONTEND_URL | REQUIRED PRODUCTION | backend/.env.docker.example, backend/.env.example, backend/.env.production.example, backend/.env.showcase.example |
| GOOGLE_CLIENT_ID | OPTIONAL | backend/.env.example, backend/.env.production.example, backend/.env.showcase.example |
| GOOGLE_CLIENT_SECRET | OPTIONAL, SECRET | backend/.env.example, backend/.env.production.example, backend/.env.showcase.example |
| GOOGLE_FRONTEND_REDIRECT | OPTIONAL | backend/.env.example, backend/.env.production.example, backend/.env.showcase.example |
| GOOGLE_LOGIN_REDIRECT | OPTIONAL | backend/.env.example, backend/.env.production.example, backend/.env.showcase.example |
| GOOGLE_REDIRECT_URI | OPTIONAL | backend/.env.example, backend/.env.production.example, backend/.env.showcase.example |
| JWT_REFRESH_TTL | OPTIONAL | backend/.env.docker.example |
| JWT_SECRET | OPTIONAL, SECRET | backend/.env.docker.example |
| JWT_TTL | OPTIONAL | backend/.env.docker.example |
| LAN_HOST | OPTIONAL | .env.example |
| LEGACY_SQLITE_DATABASE | OPTIONAL | backend/.env.example |
| LEGAL_ADDRESS | REQUIRED PRODUCTION | backend/.env.docker.example, backend/.env.example, backend/.env.production.example, backend/.env.showcase.example |
| LEGAL_ENTITY_NAME | REQUIRED PRODUCTION | backend/.env.docker.example, backend/.env.example, backend/.env.production.example, backend/.env.showcase.example |
| LEGAL_ICE | REQUIRED PRODUCTION | backend/.env.docker.example, backend/.env.example, backend/.env.production.example, backend/.env.showcase.example |
| LEGAL_STATUS | REQUIRED PRODUCTION | backend/.env.docker.example, backend/.env.example, backend/.env.production.example, backend/.env.showcase.example |
| LOG_CHANNEL | OPTIONAL | backend/.env.docker.example, backend/.env.example, backend/.env.production.example |
| LOG_DEPRECATIONS_CHANNEL | OPTIONAL | backend/.env.docker.example, backend/.env.example, backend/.env.production.example |
| LOG_LEVEL | OPTIONAL | backend/.env.docker.example, backend/.env.example, backend/.env.production.example |
| LOG_STACK | OPTIONAL | backend/.env.docker.example, backend/.env.example, backend/.env.production.example |
| MAIL_FROM_ADDRESS | OPTIONAL | backend/.env.docker.example, backend/.env.example, backend/.env.production.example, backend/.env.showcase.example |
| MAIL_FROM_NAME | OPTIONAL | backend/.env.docker.example, backend/.env.example, backend/.env.production.example, backend/.env.showcase.example |
| MAIL_HOST | OPTIONAL | backend/.env.docker.example, backend/.env.example, backend/.env.production.example, backend/.env.showcase.example |
| MAIL_MAILER | OPTIONAL | backend/.env.docker.example, backend/.env.example, backend/.env.production.example, backend/.env.showcase.example |
| MAIL_PASSWORD | OPTIONAL, SECRET | backend/.env.docker.example, backend/.env.example, backend/.env.production.example, backend/.env.showcase.example |
| MAIL_PORT | OPTIONAL | backend/.env.docker.example, backend/.env.example, backend/.env.production.example, backend/.env.showcase.example |
| MAIL_SCHEME | OPTIONAL | backend/.env.docker.example, backend/.env.example, backend/.env.production.example, backend/.env.showcase.example |
| MAIL_TIMEOUT | OPTIONAL | backend/.env.example, backend/.env.production.example |
| MAIL_USERNAME | OPTIONAL | backend/.env.docker.example, backend/.env.example, backend/.env.production.example, backend/.env.showcase.example |
| MEDIA_BACKUP_DISK | OPTIONAL | backend/.env.docker.example, backend/.env.example, backend/.env.production.example |
| MEDIA_BACKUP_ENABLED | OPTIONAL | backend/.env.docker.example, backend/.env.example, backend/.env.production.example, backend/.env.showcase.example |
| MEDIA_BACKUP_KEEP_DAYS | OPTIONAL | backend/.env.docker.example, backend/.env.example, backend/.env.production.example |
| MEDIA_BACKUP_SCHEDULE | OPTIONAL | backend/.env.docker.example, backend/.env.example, backend/.env.production.example |
| MEDIA_FILESYSTEM_DISK | OPTIONAL | backend/.env.docker.example, backend/.env.example, backend/.env.production.example, backend/.env.showcase.example |
| MEDIA_MONGODB_BUCKET | OPTIONAL | backend/.env.example, backend/.env.production.example |
| MEDIA_MONGODB_DATABASE | OPTIONAL | backend/.env.example, backend/.env.production.example |
| MEDIA_MONGODB_ENABLED | OPTIONAL | backend/.env.docker.example, backend/.env.example, backend/.env.production.example, backend/.env.showcase.example |
| MEDIA_MONGODB_URI | OPTIONAL, SECRET | backend/.env.docker.example, backend/.env.example, backend/.env.production.example |
| MEDIA_QUARANTINE_DISK | OPTIONAL | backend/.env.docker.example, backend/.env.example, backend/.env.production.example |
| MEDIA_SCAN_DRIVER | OPTIONAL | backend/.env.docker.example, backend/.env.example, backend/.env.production.example |
| MEDIA_SCAN_ENABLED | OPTIONAL | backend/.env.docker.example, backend/.env.example, backend/.env.production.example, backend/.env.showcase.example |
| MEDIA_SCAN_MAX_ATTEMPTS | OPTIONAL | backend/.env.docker.example, backend/.env.example, backend/.env.production.example |
| MEDIA_SCAN_MAX_BYTES | OPTIONAL | backend/.env.docker.example, backend/.env.example, backend/.env.production.example |
| MEDIA_SCAN_REQUIRED_IN_PRODUCTION | OPTIONAL | backend/.env.docker.example, backend/.env.example, backend/.env.production.example, backend/.env.showcase.example |
| MEDIA_SCAN_TIMEOUT_SECONDS | OPTIONAL | backend/.env.docker.example, backend/.env.example, backend/.env.production.example |
| MEDIA_SCAN_UNIQUE_LOCK_STORE | OPTIONAL | backend/.env.docker.example, backend/.env.example, backend/.env.production.example |
| MEDIA_STORAGE_DRIVER | OPTIONAL | backend/.env.docker.example, backend/.env.example, backend/.env.production.example, backend/.env.showcase.example |
| MEMCACHED_HOST | OPTIONAL | backend/.env.example, backend/.env.production.example |
| MONITORING_LOG_CHANNEL | OPTIONAL | backend/.env.docker.example, backend/.env.example, backend/.env.production.example |
| MONITORING_LOG_DAYS | OPTIONAL | backend/.env.docker.example, backend/.env.example, backend/.env.production.example |
| MONITORING_LOG_LEVEL | OPTIONAL | backend/.env.docker.example, backend/.env.example, backend/.env.production.example |
| MYSQL_ATTR_SSL_CA | OPTIONAL | backend/.env.production.example, backend/.env.showcase.example |
| ORANGE_SMS_BASE_URL | OPTIONAL | backend/.env.example, backend/.env.production.example |
| ORANGE_SMS_SENDER | OPTIONAL | backend/.env.example, backend/.env.production.example |
| ORANGE_SMS_TOKEN | OPTIONAL, SECRET | backend/.env.example, backend/.env.production.example |
| PAYMENT_ACTIVE_TTL_MINUTES | OPTIONAL | backend/.env.docker.example, backend/.env.example, backend/.env.production.example |
| PAYMENT_COMMISSION_RATE | OPTIONAL | backend/.env.docker.example, backend/.env.example, backend/.env.production.example |
| PAYMENT_CURRENCY | OPTIONAL | backend/.env.docker.example, backend/.env.example, backend/.env.production.example |
| PAYMENT_DEFAULT_PROVIDER | OPTIONAL | backend/.env.docker.example, backend/.env.example, backend/.env.production.example |
| PAYMENTS | OPTIONAL | backend/.env.example |
| PHP_CLI_SERVER_WORKERS | OPTIONAL | backend/.env.example |
| PILOT_METRICS | OPTIONAL | backend/.env.example |
| PORT | OPTIONAL | backend/.env.showcase.example |
| PRIVACY_CONTACT_EMAIL | REQUIRED PRODUCTION | backend/.env.docker.example, backend/.env.example, backend/.env.production.example, backend/.env.showcase.example |
| PRIVATE_STORAGE_PATH | OPTIONAL | backend/.env.example, backend/.env.production.example, backend/.env.showcase.example |
| PROFESSIONAL_VERIFICATION_DOCUMENT_RETENTION_DAYS | OPTIONAL | backend/.env.example, backend/.env.production.example |
| PROFESSIONAL_VERIFICATIONS_DISK | OPTIONAL | backend/.env.example, backend/.env.production.example |
| PUBLIC_STORAGE_URL | OPTIONAL | backend/.env.example, backend/.env.production.example, backend/.env.showcase.example |
| QUEUE_CONNECTION | OPTIONAL | backend/.env.docker.example, backend/.env.example, backend/.env.production.example, backend/.env.showcase.example |
| QUEUE_FAILED_DRIVER | OPTIONAL | backend/.env.docker.example, backend/.env.production.example |
| REDIS_CACHE_DB | OPTIONAL | backend/.env.docker.example, backend/.env.production.example |
| REDIS_CLIENT | OPTIONAL | backend/.env.docker.example, backend/.env.example, backend/.env.production.example |
| REDIS_DB | OPTIONAL | backend/.env.docker.example, backend/.env.production.example |
| REDIS_HOST | OPTIONAL | backend/.env.docker.example, backend/.env.example, backend/.env.production.example |
| REDIS_PASSWORD | OPTIONAL, SECRET | .env.example, backend/.env.docker.example, backend/.env.example, backend/.env.production.example |
| REDIS_PORT | OPTIONAL | backend/.env.docker.example, backend/.env.example, backend/.env.production.example |
| REDIS_SCHEME | OPTIONAL | backend/.env.docker.example, backend/.env.production.example |
| REVERB_ALLOWED_ORIGINS | OPTIONAL | backend/.env.docker.example, backend/.env.example |
| REVERB_APP_ACCEPT_CLIENT_EVENTS_FROM | OPTIONAL | backend/.env.docker.example, backend/.env.example, backend/.env.production.example |
| REVERB_APP_ACTIVITY_TIMEOUT | OPTIONAL | backend/.env.docker.example, backend/.env.example, backend/.env.production.example |
| REVERB_APP_ID | OPTIONAL | .env.example, backend/.env.docker.example, backend/.env.example, backend/.env.example, backend/.env.production.example |
| REVERB_APP_KEY | OPTIONAL, SECRET | .env.example, backend/.env.docker.example, backend/.env.example, backend/.env.example, backend/.env.production.example |
| REVERB_APP_MAX_MESSAGE_SIZE | OPTIONAL | backend/.env.docker.example, backend/.env.example, backend/.env.production.example |
| REVERB_APP_PING_INTERVAL | OPTIONAL | backend/.env.docker.example, backend/.env.example, backend/.env.production.example |
| REVERB_APP_RATE_LIMIT_DECAY_SECONDS | OPTIONAL | backend/.env.docker.example, backend/.env.example, backend/.env.production.example |
| REVERB_APP_RATE_LIMIT_MAX_ATTEMPTS | OPTIONAL | backend/.env.docker.example, backend/.env.example, backend/.env.production.example |
| REVERB_APP_RATE_LIMIT_TERMINATE | OPTIONAL | backend/.env.docker.example, backend/.env.example, backend/.env.production.example |
| REVERB_APP_RATE_LIMITING_ENABLED | OPTIONAL | backend/.env.docker.example, backend/.env.example, backend/.env.production.example |
| REVERB_APP_SECRET | OPTIONAL, SECRET | .env.example, backend/.env.docker.example, backend/.env.example, backend/.env.example, backend/.env.production.example |
| REVERB_HOST | OPTIONAL | backend/.env.docker.example, backend/.env.example, backend/.env.example, backend/.env.production.example |
| REVERB_PORT | OPTIONAL | backend/.env.docker.example, backend/.env.example, backend/.env.example, backend/.env.production.example |
| REVERB_PULSE_INGEST_INTERVAL | OPTIONAL | backend/.env.docker.example, backend/.env.example, backend/.env.production.example |
| REVERB_SCHEME | OPTIONAL | backend/.env.docker.example, backend/.env.example, backend/.env.example, backend/.env.production.example |
| REVERB_SERVER_HOST | OPTIONAL | backend/.env.docker.example, backend/.env.example, backend/.env.production.example |
| REVERB_SERVER_PORT | OPTIONAL | backend/.env.docker.example, backend/.env.example, backend/.env.production.example |
| REVERB_TELESCOPE_INGEST_INTERVAL | OPTIONAL | backend/.env.docker.example, backend/.env.example, backend/.env.production.example |
| SANCTUM_EXPIRATION | OPTIONAL | backend/.env.example, backend/.env.production.example |
| SANCTUM_STATEFUL_DOMAINS | OPTIONAL | backend/.env.docker.example, backend/.env.example, backend/.env.production.example, backend/.env.showcase.example |
| SENTRY_DSN | OPTIONAL | .env.example, backend/.env.docker.example, backend/.env.example, backend/.env.production.example |
| SENTRY_ENVIRONMENT | OPTIONAL | .env.example, backend/.env.docker.example, backend/.env.example, backend/.env.production.example |
| SESSION_CONNECTION | OPTIONAL | backend/.env.docker.example, backend/.env.example, backend/.env.production.example |
| SESSION_DOMAIN | OPTIONAL | backend/.env.docker.example, backend/.env.example, backend/.env.production.example, backend/.env.showcase.example |
| SESSION_DRIVER | OPTIONAL | backend/.env.docker.example, backend/.env.example, backend/.env.production.example, backend/.env.showcase.example |
| SESSION_ENCRYPT | OPTIONAL | backend/.env.docker.example, backend/.env.example, backend/.env.production.example, backend/.env.showcase.example |
| SESSION_LIFETIME | OPTIONAL | backend/.env.docker.example, backend/.env.example, backend/.env.production.example |
| SESSION_PATH | OPTIONAL | backend/.env.docker.example, backend/.env.example, backend/.env.production.example |
| SESSION_SAME_SITE | OPTIONAL | backend/.env.docker.example, backend/.env.example, backend/.env.production.example, backend/.env.showcase.example |
| SESSION_SECURE_COOKIE | REQUIRED PRODUCTION | backend/.env.docker.example, backend/.env.example, backend/.env.production.example, backend/.env.showcase.example |
| SMS_CONNECT_TIMEOUT_SECONDS | OPTIONAL | backend/.env.example, backend/.env.production.example |
| SMS_DRIVER | OPTIONAL | backend/.env.docker.example, backend/.env.example, backend/.env.production.example, backend/.env.showcase.example |
| SMS_OTP_LOCK_MINUTES | OPTIONAL | backend/.env.docker.example, backend/.env.example, backend/.env.production.example |
| SMS_OTP_MAX_ATTEMPTS | OPTIONAL | backend/.env.docker.example, backend/.env.example, backend/.env.production.example |
| SMS_OTP_RESEND_COOLDOWN_SECONDS | OPTIONAL | backend/.env.docker.example, backend/.env.example, backend/.env.production.example |
| SMS_OTP_TTL | OPTIONAL | backend/.env.docker.example, backend/.env.example, backend/.env.production.example |
| SMS_TIMEOUT_SECONDS | OPTIONAL | backend/.env.example, backend/.env.production.example |
| SONAR_DB_NAME | OPTIONAL | .env.example |
| SONAR_DB_PASSWORD | OPTIONAL, SECRET | .env.example |
| SONAR_DB_USERNAME | OPTIONAL | .env.example |
| SONAR_HOST_URL | OPTIONAL | .env.example |
| SONAR_TOKEN | OPTIONAL, SECRET | .env.example |
| STARTUP_PILOT | OPTIONAL | backend/.env.example |
| TRUSTED_PROXIES | REQUIRED PRODUCTION | backend/.env.docker.example, backend/.env.example, backend/.env.production.example, backend/.env.showcase.example |
| TWILIO_AUTH_TOKEN | OPTIONAL, SECRET | backend/.env.example, backend/.env.production.example |
| TWILIO_FROM | OPTIONAL | backend/.env.example, backend/.env.production.example |
| TWILIO_SID | OPTIONAL | backend/.env.example, backend/.env.production.example |
| VITE_ANIMAL_LISTINGS_PUBLIC | OPTIONAL, PUBLIC SAFE | frontend/.env.example |
| VITE_API_URL | OPTIONAL, PUBLIC SAFE | frontend/.env.example, frontend/.env.production.example |
| VITE_APP_NAME | OPTIONAL, PUBLIC SAFE | backend/.env.docker.example, backend/.env.example, backend/.env.production.example, frontend/.env.example, frontend/.env.production.example |
| VITE_BRAND_NAME | OPTIONAL, PUBLIC SAFE | frontend/.env.example |
| VITE_BUILD_SOURCEMAPS | OPTIONAL, PUBLIC SAFE | frontend/.env.production.example |
| VITE_GOOGLE_AUTH_ENABLED | OPTIONAL, PUBLIC SAFE | frontend/.env.example, frontend/.env.production.example |
| VITE_MONITORING_ENABLED | OPTIONAL, PUBLIC SAFE | frontend/.env.example, frontend/.env.production.example |
| VITE_MONITORING_ENDPOINT | OPTIONAL, PUBLIC SAFE | frontend/.env.example, frontend/.env.production.example |
| VITE_NOTIFICATIONS_POLL_MS | OPTIONAL, PUBLIC SAFE | frontend/.env.example, frontend/.env.production.example |
| VITE_PAYMENTS | OPTIONAL, PUBLIC SAFE | frontend/.env.example |
| VITE_REALTIME_ENABLED | OPTIONAL, PUBLIC SAFE | frontend/.env.example, frontend/.env.production.example |
| VITE_REVERB_APP_KEY | OPTIONAL, PUBLIC SAFE | frontend/.env.example, frontend/.env.production.example |
| VITE_REVERB_HOST | OPTIONAL, PUBLIC SAFE | frontend/.env.example, frontend/.env.production.example |
| VITE_REVERB_PORT | OPTIONAL, PUBLIC SAFE | frontend/.env.example, frontend/.env.production.example |
| VITE_REVERB_SCHEME | OPTIONAL, PUBLIC SAFE | frontend/.env.example, frontend/.env.production.example |
| VITE_SENTRY_DSN | OPTIONAL, PUBLIC SAFE | .env.example, frontend/.env.example, frontend/.env.production.example |
| VITE_SITE_URL | OPTIONAL, PUBLIC SAFE | frontend/.env.example, frontend/.env.production.example |
| VITE_STARTUP_PILOT | OPTIONAL, PUBLIC SAFE | frontend/.env.example |
| VITE_STORAGE_URL | OPTIONAL, PUBLIC SAFE | frontend/.env.example, frontend/.env.production.example |
| YAZOO_ACCOUNT_DELETION_PROCESSING_LEASE_SECONDS | OPTIONAL | backend/.env.docker.example, backend/.env.example, backend/.env.production.example |
| YAZOO_ACCOUNT_DELETION_RETRY_BATCH_SIZE | OPTIONAL | backend/.env.docker.example, backend/.env.example, backend/.env.production.example |
| YAZOO_ACCOUNT_DELETION_RETRY_MAX_ATTEMPTS | OPTIONAL | backend/.env.docker.example, backend/.env.example, backend/.env.production.example |
| YAZOO_ACCOUNT_DELETION_UNIQUE_LOCK_STORE | OPTIONAL | backend/.env.docker.example, backend/.env.example, backend/.env.production.example, backend/.env.showcase.example |
| YAZOO_DATABASE2_TEST_ACCOUNT_PASSWORD | DEMO ONLY, SECRET | backend/.env.example, backend/.env.production.example |
| YAZOO_DATABASE2_TEST_DATA_BOOTSTRAP_CONFIRMATION | DEMO ONLY | backend/.env.example, backend/.env.production.example |
| YAZOO_DATABASE2_TEST_DATA_BOOTSTRAP_ENABLED | DEMO ONLY | backend/.env.example, backend/.env.production.example |
| YAZOO_DATABASE2_TEST_DATA_IMAGES_PATH | DEMO ONLY | backend/.env.example, backend/.env.production.example |
| YAZOO_DEPLOYMENT_PROFILE | REQUIRED PRODUCTION | backend/.env.example, backend/.env.production.example, backend/.env.showcase.example |
| YAZOO_EXPECTED_DB_HOST | OPTIONAL | backend/.env.example, backend/.env.production.example, backend/.env.showcase.example |
| YAZOO_EXPECTED_DB_NAME | OPTIONAL | backend/.env.example, backend/.env.production.example, backend/.env.showcase.example |
| YAZOO_EXPECTED_DB_PORT | OPTIONAL | backend/.env.example, backend/.env.production.example, backend/.env.showcase.example |
| YAZOO_FULLTEXT_SEARCH_ENABLED | OPTIONAL | backend/.env.showcase.example |
| YAZOO_MIGRATION_LOCK_SECONDS | OPTIONAL | backend/.env.production.example |
| YAZOO_PERSISTENT_STORAGE_PATH | OPTIONAL | backend/.env.example, backend/.env.production.example, backend/.env.showcase.example |
| YAZOO_PROTECTED_DB_NAMES | OPTIONAL | backend/.env.example, backend/.env.production.example, backend/.env.showcase.example |
| YAZOO_QUEUE_HEARTBEAT_TTL_SECONDS | OPTIONAL | backend/.env.production.example |
| YAZOO_RELEASE_ADMIN_BOOTSTRAP_CONFIRMATION | DEMO ONLY | backend/.env.example, backend/.env.production.example |
| YAZOO_RELEASE_ADMIN_BOOTSTRAP_ENABLED | DEMO ONLY | backend/.env.example, backend/.env.production.example |
| YAZOO_RELEASE_ADMIN_EMAIL | OPTIONAL | backend/.env.example, backend/.env.production.example |
| YAZOO_RELEASE_ADMIN_MFA_RECOVERY_CODES | OPTIONAL, SECRET | backend/.env.example, backend/.env.production.example |
| YAZOO_RELEASE_ADMIN_MFA_SECRET | OPTIONAL, SECRET | backend/.env.example, backend/.env.production.example |
| YAZOO_RELEASE_ADMIN_NAME | OPTIONAL | backend/.env.example, backend/.env.production.example |
| YAZOO_RELEASE_ADMIN_PASSWORD | OPTIONAL, SECRET | backend/.env.example, backend/.env.production.example |
| YAZOO_REQUIRE_EXPECTED_DATABASE | OPTIONAL | backend/.env.example, backend/.env.production.example, backend/.env.showcase.example |
| YAZOO_REQUIRE_PERSISTENT_STORAGE | OPTIONAL | backend/.env.docker.example, backend/.env.example, backend/.env.production.example, backend/.env.showcase.example |
| YAZOO_REQUIRE_REVERB_HEALTH | OPTIONAL | backend/.env.example, backend/.env.showcase.example |
| YAZOO_REQUIRE_SCHEDULER_HEARTBEAT | OPTIONAL | backend/.env.docker.example, backend/.env.example, backend/.env.production.example, backend/.env.showcase.example |
| YAZOO_RESET_RUNTIME_STATE | OPTIONAL | backend/.env.example |
| YAZOO_RUN_MIGRATIONS | OPTIONAL | backend/.env.production.example, backend/.env.showcase.example |
| YAZOO_RUN_PRODUCTION_PREFLIGHT | OPTIONAL | backend/.env.docker.example, backend/.env.example, backend/.env.production.example, backend/.env.showcase.example |
| YAZOO_RUN_QUEUE_WORKER | OPTIONAL | backend/.env.production.example, backend/.env.showcase.example |
| YAZOO_RUN_RELEASE_ADMIN_BOOTSTRAP | DEMO ONLY | backend/.env.example, backend/.env.production.example |
| YAZOO_RUN_SCHEDULER | OPTIONAL | backend/.env.production.example, backend/.env.showcase.example |
| YAZOO_RUN_SHOWCASE_BOOTSTRAP | DEMO ONLY | backend/.env.example, backend/.env.showcase.example |
| YAZOO_RUNTIME_OPTIMIZE | OPTIONAL | backend/.env.production.example, backend/.env.showcase.example |
| YAZOO_SCHEDULER_HEARTBEAT_TTL_SECONDS | OPTIONAL | backend/.env.production.example |
| YAZOO_SHOWCASE_APP_HOST | DEMO ONLY | backend/.env.example, backend/.env.showcase.example |
| YAZOO_SHOWCASE_BOOTSTRAP_ENABLED | DEMO ONLY | backend/.env.example, backend/.env.showcase.example |
| YAZOO_SHOWCASE_CONFIRMATION | DEMO ONLY | backend/.env.example, backend/.env.showcase.example |
| YAZOO_SHOWCASE_DATABASE_HOST | DEMO ONLY | backend/.env.example, backend/.env.showcase.example |
| YAZOO_SHOWCASE_DATABASE_NAME | DEMO ONLY | backend/.env.example, backend/.env.showcase.example |
| YAZOO_SHOWCASE_IMAGES_PATH | DEMO ONLY | backend/.env.example, backend/.env.showcase.example |
| YAZOO_SHOWCASE_MFA_RECOVERY_CODES | DEMO ONLY, SECRET | backend/.env.example, backend/.env.showcase.example |
| YAZOO_SHOWCASE_MFA_SECRET | DEMO ONLY, SECRET | backend/.env.example, backend/.env.showcase.example |
| YAZOO_SHOWCASE_PASSWORD | DEMO ONLY, SECRET | backend/.env.example, backend/.env.showcase.example |
| YAZOO_SHOWCASE_UPLOADS_ENABLED | DEMO ONLY | backend/.env.example, backend/.env.showcase.example |

Production : CMI OFF sans contrat et configuration complète ; pas de HTTP/local dans le profil mobile distribué ; aucune donnée juridique fictive ; Redis/queue/Reverb/scanner/mail/SMS et backups selon services activés. Les examples ne sont pas une configuration prête à déployer. Ne pas imprimer les valeurs effectives.

## Matrice des responsabilités et validations production

L'inventaire ci-dessus reste exhaustif pour les examples. Component se déduit du chemin d'example : backend=API, frontend=Web, mobile=natif, racine=infra Compose. SECRET signifie injection par l'exploitant via secret store ; toutes les variables VITE_* et EXPO_PUBLIC_* sont visibles dans le bundle. Une app key Reverb client est publique ; REVERB_APP_SECRET reste serveur.

| VARIABLE | COMPONENT | SECRET/PUBLIC | REQUIRED/OPTIONAL | OWNER MUST PROVIDE | VALIDATION |
|---|---|---|---|---|---|
| APP_ENV, APP_DEBUG, YAZOO_DEPLOYMENT_PROFILE | API | PUBLIC config | REQUIRED | production, false, production | Preflight refuse autre environnement/debug |
| APP_KEY | API | SECRET | REQUIRED | Clé aléatoire générée sur cible | Longueur/cipher valides ; placeholders refusés |
| DB_DATABASE, DB_USERNAME, DB_PASSWORD | API/infra | Password SECRET ; autres config | REQUIRED | Base/compte réels et secret non par défaut | Identités non placeholders ; password >=12, non faible |
| DB_HOST, DB_PORT, YAZOO_EXPECTED_DB_* | API/infra | Config privée | REQUIRED selon cible | Cible réelle ; expected guard si activé | DatabaseTargetGuard ; ports locaux SQL3306/MariaDB3307 conservés |
| APP_URL, FRONTEND_URL | API | PUBLIC | REQUIRED | Domaines HTTPS contrôlés | URL sans credentials/query/fragment, IP locale/example refusée |
| SANCTUM_STATEFUL_DOMAINS, CORS_ALLOWED_ORIGINS, TRUSTED_PROXIES | API/infra | PUBLIC config | REQUIRED selon ingress | Domaines exacts et proxies bornés | Pas wildcard credentialed CORS ni proxy global |
| SESSION_SECURE_COOKIE, SESSION_HTTP_ONLY | API | PUBLIC config | REQUIRED | true | Cookies sécurisés imposés |
| LEGAL_ENTITY_NAME, LEGAL_STATUS, LEGAL_ADDRESS, LEGAL_ICE, DATA_CONTROLLER_NAME | API/legal | PUBLIC | REQUIRED | Informations réelles validées | Blank, TODO, angle placeholders et valeurs examples refusés |
| PRIVACY_CONTACT_EMAIL, CONTACT_RECIPIENT | API/legal | PUBLIC | REQUIRED | Boîtes réellement suivies | Valeurs non placeholders ; validation humaine du contact |
| DATA_RETENTION_DAYS, DATA_REQUEST_RESPONSE_DAYS | API/legal | PUBLIC config | REQUIRED | Durées validées par responsable/conseil | Entiers positifs ; cartographie TO VALIDATE jusqu'à revue |
| MAIL_HOST, MAIL_USERNAME, MAIL_PASSWORD, MAIL_FROM_ADDRESS, MAIL_MAILER | API | Password SECRET ; autres config | REQUIRED production | Transport et compte SMTP réels | Pas log/array ; configuration non placeholder |
| CACHE_STORE, REDIS_*, YAZOO_RUN_QUEUE_WORKER, YAZOO_RUN_SCHEDULER | API/infra | REDIS_PASSWORD SECRET | REQUIRED selon architecture | Service et supervision réels | Lock partagé, queue worker asynchrone, scheduler production |
| MEDIA_SCAN_*, YAZOO_PERSISTENT_STORAGE_PATH, YAZOO_REQUIRE_PERSISTENT_STORAGE | API/infra | Config privée | REQUIRED selon politique | Scanner/stockage/support réels | Availability scanner, lock partagé et droits chemin au preflight complet |
| ADMIN_MFA_ENFORCED, ADMIN_BOOTSTRAP_ENABLED | API | PUBLIC config | REQUIRED | true, false ; admin MFA provisionné | Pas bootstrap permanent ; admin TOTP/recovery au preflight complet |
| CMI_ENABLED, CMI_MODE, CMI_CLIENT_ID, CMI_STORE_KEY, CMI_*_URL | API/payment | STORE_KEY SECRET | OPTIONAL ; ensemble REQUIRED si activé | Contrat, homologation et valeurs provider | OFF par défaut ; mode prod, valeurs complètes/non placeholders, clé >=12 |
| AWS_*, MONGODB_*, SMS_*, TWILIO_*, GOOGLE_*, REVERB_* | API/infra | Mots de passe/tokens/secrets SECRET | OPTIONAL ; REQUIRED si service activé | Compte, endpoints, région et contrats réels | Guards provider + preflight ; pays/sous-traitants à valider |
| VITE_API_URL, VITE_SITE_URL, VITE_STORAGE_URL, VITE_* flags | Web | PUBLIC | REQUIRED selon cible ; flags OPTIONAL | Origine/reverse proxy et fonctionnalités validées | Build ; audit legal ; aucun secret dans bundle |
| EXPO_PUBLIC_API_URL | Mobile/EAS | PUBLIC | REQUIRED preview/production | HTTPS réelle | app.config et Gradle refusent HTTP/local/IP/example |
| YAZOO_UPLOAD_STORE_FILE, YAZOO_UPLOAD_STORE_PASSWORD, YAZOO_UPLOAD_KEY_ALIAS, YAZOO_UPLOAD_KEY_PASSWORD | Android local | SECRET | REQUIRED signature locale ; OPTIONAL avec EAS remote | Keystore et valeurs réelles hors Git | Pas clé debug/default ; chemin existe ; aucun fallback |
| EAS credentials, project association, Play account | EAS/Play | SECRET/account | REQUIRED publication | Propriétaire | EAS remote credentials ; build réel à effectuer après provisioning |
| SENTRY_*, APPINSIGHTS_*, SONAR_* | Monitoring/CI | Tokens serveur SECRET ; DSN client PUBLIC | OPTIONAL | Choix explicite de service et accès | Ne bloque pas logiciel désactivé ; privacy et pays à revoir si activé |

Pour chaque autre variable OPTIONAL de l'inventaire : propriétaire=exploitant du composant, fournir uniquement si le service est activé ; validation=types/config provider et test de readiness de la cible. Les examples seuls ne prouvent ni CONFIGURATION READY ni INFRASTRUCTURE READY. Preflight configuration-only valide la syntaxe sans requêtes métier ; preflight complet valide aussi admin, MFA et accès storage. Health/ready, TLS, sauvegarde/restauration et supervision sont à valider sur l'infrastructure réelle après injection, sans modification de code.
