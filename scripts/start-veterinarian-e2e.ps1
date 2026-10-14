param([string]$Image = 'yazoo-api:closure')
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$backendPath = Join-Path $projectRoot 'backend'
$neutralEnvironment = Join-Path $projectRoot 'output/veterinarian-isolated.env'
Set-Content -LiteralPath $neutralEnvironment -Encoding ascii -Value 'APP_ENV=testing'
$dockerArguments = @('run', '--rm', '--name', 'yazoo-veterinarian-e2e', '-p', '127.0.0.1:8000:8000',
    '--entrypoint', 'sh', '-v', "${backendPath}:/workspace", '-v', "${neutralEnvironment}:/workspace/.env:ro", '-w', '/workspace')
$testEnvironment = @(
    'APP_ENV=testing', 'APP_DEBUG=false', 'APP_KEY=base64:c49vk2fjl1WJZPUaxanThGkmCDU9hHDldPjseMgdaQc=',
    'APP_URL=http://127.0.0.1:8000', 'DB_CONNECTION=sqlite', 'DB_DATABASE=/tmp/yazoo-veterinarian-e2e.sqlite',
    'CACHE_STORE=array', 'SESSION_DRIVER=file', 'SESSION_SECURE_COOKIE=false', 'QUEUE_CONNECTION=sync', 'PHP_CLI_SERVER_WORKERS=4',
    'BROADCAST_CONNECTION=log', 'MAIL_MAILER=array', 'MEDIA_STORAGE_DRIVER=filesystem',
    'YAZOO_REQUIRE_EXPECTED_DATABASE=false', 'YAZOO_DEPLOYMENT_PROFILE=local',
    'YAZOO_REQUIRE_PERSISTENT_STORAGE=false', 'YAZOO_REQUIRE_SCHEDULER_HEARTBEAT=false',
    'SANCTUM_STATEFUL_DOMAINS=127.0.0.1:5173,127.0.0.1:8000', 'CORS_ALLOWED_ORIGINS=http://127.0.0.1:5173'
)
foreach ($setting in $testEnvironment) { $dockerArguments += @('-e', $setting) }
$dockerArguments += @($Image, '-c', 'php tests/Support/prepare-veterinarian-e2e.php && cd public && php -S 0.0.0.0:8000 ../vendor/laravel/framework/src/Illuminate/Foundation/resources/server.php')
& docker @dockerArguments
exit $LASTEXITCODE
