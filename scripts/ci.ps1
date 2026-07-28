param(
    [switch] $SkipSonar
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot

Push-Location "$Root\backend"
try {
    composer validate --strict
    composer install --no-interaction --prefer-dist --no-progress
    composer audit --no-interaction
    php artisan test
    composer test:coverage
} finally {
    Pop-Location
}

Push-Location "$Root\frontend"
try {
    npm ci
    npm audit --omit=dev
    npm audit
    npm run lint
    npm run typecheck
    npm run audit:i18n
    npm run test:coverage
    npm run build
    npm run test:e2e
} finally {
    Pop-Location
}

if (-not $SkipSonar) {
    & "$PSScriptRoot\run-sonar.ps1"
}
