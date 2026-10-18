param([string]$Image = 'yazoo-api:closure')
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$backendPath = Join-Path $projectRoot 'backend'
$neutralEnvironment = Join-Path $projectRoot 'output/social-e2e-neutral.env'
Set-Content -LiteralPath $neutralEnvironment -Encoding ascii -Value 'APP_ENV=testing'
$arguments = @('run', '-d', '--name', 'yazoo-social-api', '--network', 'yazoo-social-e2e',
    '-p', '127.0.0.1:8012:8000', '--entrypoint', 'sh',
    '-v', "${backendPath}:/workspace", '-v', "${neutralEnvironment}:/workspace/.env:ro",
    '-v', 'yazoo-social-state:/state', '-w', '/workspace')
$settings = @(
    'APP_ENV=testing', 'APP_DEBUG=false', 'APP_CONFIG_CACHE=/tmp/social-config.php',
    'APP_KEY=base64:c49vk2fjl1WJZPUaxanThGkmCDU9hHDldPjseMgdaQc=',
    'APP_URL=http://127.0.0.1:8012', 'DB_CONNECTION=sqlite', 'DB_DATABASE=/state/social-e2e.sqlite', 'DB_URL=',
    'CACHE_STORE=array', 'SESSION_DRIVER=file', 'SESSION_SECURE_COOKIE=false', 'QUEUE_CONNECTION=sync',
    'PHP_CLI_SERVER_WORKERS=4', 'BROADCAST_CONNECTION=log', 'MAIL_MAILER=array', 'SMS_DRIVER=disabled',
    'MEDIA_STORAGE_DRIVER=r2', 'PROFESSIONAL_VERIFICATIONS_DISK=r2',
    'R2_ENDPOINT=http://yazoo-social-s3:9090', 'R2_BUCKET=yazoo-social-test', 'R2_REGION=auto',
    'R2_ACCESS_KEY_ID=local-s3mock-only', 'R2_SECRET_ACCESS_KEY=local-s3mock-only',
    'ADMIN_MFA_ENFORCED=false', 'YAZOO_SHOWCASE_UPLOADS_ENABLED=false',
    'YAZOO_REQUIRE_EXPECTED_DATABASE=false', 'YAZOO_DEPLOYMENT_PROFILE=local',
    'YAZOO_REQUIRE_PERSISTENT_STORAGE=false', 'YAZOO_REQUIRE_SCHEDULER_HEARTBEAT=false',
    'YAZOO_REQUIRE_REVERB_HEALTH=false', 'YAZOO_RUN_SHOWCASE_BOOTSTRAP=false', 'YAZOO_RUN_MIGRATIONS=false',
    'CORS_ALLOWED_ORIGINS=http://127.0.0.1:5182', 'SANCTUM_STATEFUL_DOMAINS=127.0.0.1:5182,127.0.0.1:8012'
)
foreach ($setting in $settings) { $arguments += @('-e', $setting) }
$arguments += @($Image, '-c', 'php tests/Support/prepare-social-e2e.php && cd public && exec php -S 0.0.0.0:8000 ../vendor/laravel/framework/src/Illuminate/Foundation/resources/server.php')
& docker @arguments
if ($LASTEXITCODE -ne 0) { throw 'Isolated API container failed to start.' }
