[CmdletBinding()]
param(
    [ValidateSet('Start', 'Backend', 'Frontend')]
    [string] $Mode = 'Start',

    [ValidateRange(1024, 65535)]
    [int] $BackendPort = 8001,

    [ValidateRange(1024, 65535)]
    [int] $FrontendPort = 5173,

    [string] $ImagesPath = '',

    [switch] $CheckOnly
)

$ErrorActionPreference = 'Stop'

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$backendPath = Join-Path $projectRoot 'backend'
$frontendPath = Join-Path $projectRoot 'frontend'
$backendUrl = "http://127.0.0.1:$BackendPort"
$frontendUrl = "http://127.0.0.1:$FrontendPort"

function Set-YazooBackendEnvironment {
    $env:APP_ENV = 'local'
    $env:APP_URL = $backendUrl
    $env:FRONTEND_URL = $frontendUrl
    $env:CORS_ALLOWED_ORIGINS = "$frontendUrl,http://localhost:$FrontendPort"
    $env:APP_FORCE_HTTPS = 'false'
    $env:CACHE_STORE = 'file'
    $env:SESSION_DRIVER = 'file'
    $env:QUEUE_CONNECTION = 'sync'
    $env:MEDIA_STORAGE_DRIVER = 'filesystem'
    $env:SESSION_SECURE_COOKIE = 'false'
    $env:SESSION_SAME_SITE = 'lax'
    $env:SANCTUM_STATEFUL_DOMAINS = "127.0.0.1:$FrontendPort,127.0.0.1:$BackendPort,localhost:$FrontendPort,localhost:$BackendPort"
}

function Test-YazooPortInUse {
    param([int] $Port)

    $client = [System.Net.Sockets.TcpClient]::new()

    try {
        $connection = $client.ConnectAsync('127.0.0.1', $Port)

        if (-not $connection.Wait(500)) {
            return $false
        }

        return $client.Connected
    }
    catch {
        return $false
    }
    finally {
        $client.Dispose()
    }
}

function Wait-YazooHttpEndpoint {
    param(
        [string] $Uri,
        [hashtable] $Headers = @{}
    )

    foreach ($attempt in 1..30) {
        try {
            return Invoke-WebRequest -UseBasicParsing -Uri $Uri -Headers $Headers -TimeoutSec 3
        }
        catch {
            Start-Sleep -Milliseconds 500
        }
    }

    throw "Le service local ne repond pas : $Uri"
}

if ($Mode -eq 'Backend') {
    $Host.UI.RawUI.WindowTitle = 'YaZoo - API locale'
    Set-YazooBackendEnvironment
    Set-Location -LiteralPath $backendPath
    & php artisan serve --host=127.0.0.1 "--port=$BackendPort" --no-reload
    exit $LASTEXITCODE
}

if ($Mode -eq 'Frontend') {
    $Host.UI.RawUI.WindowTitle = 'YaZoo - Frontend local'
    $env:VITE_API_URL = "$backendUrl/api"
    $env:VITE_GOOGLE_AUTH_ENABLED = 'false'
    $env:VITE_MONITORING_ENABLED = 'false'
    $env:VITE_REALTIME_ENABLED = 'false'
    Set-Location -LiteralPath $frontendPath
    & npm.cmd run dev -- --host 127.0.0.1 --port $FrontendPort --strictPort
    exit $LASTEXITCODE
}

if ([string]::IsNullOrWhiteSpace($ImagesPath)) {
    $desktopPath = Split-Path $projectRoot -Parent
    $ImagesPath = Join-Path $desktopPath 'imgs'
}

$ImagesPath = [System.IO.Path]::GetFullPath($ImagesPath)

Write-Host "Controle de securite de l'environnement local YaZoo..." -ForegroundColor Cyan
Set-YazooBackendEnvironment
Set-Location -LiteralPath $backendPath

& php artisan config:clear
if ($LASTEXITCODE -ne 0) {
    throw 'Impossible de supprimer le cache de configuration Laravel.'
}

& php artisan yazoo:seed-marketplace-demo "--images=$ImagesPath" --dry-run
if ($LASTEXITCODE -ne 0) {
    throw "Le controle local ou le controle des 21 images a echoue. Aucun serveur n'a ete demarre."
}

& php artisan migrate:status
if ($LASTEXITCODE -ne 0) {
    throw 'Laravel ne peut pas lire les migrations de yazoo_local.'
}

if ($CheckOnly) {
    Write-Host "Controle local reussi. Aucun serveur n'a ete demarre." -ForegroundColor Green
    exit 0
}

$backendIsRunning = Test-YazooPortInUse -Port $BackendPort
$frontendIsRunning = Test-YazooPortInUse -Port $FrontendPort

if ($backendIsRunning -or $frontendIsRunning) {
    if (-not ($backendIsRunning -and $frontendIsRunning)) {
        throw 'Un seul service YaZoo est actif. Fermez les anciens terminaux YaZoo, puis relancez ce script.'
    }

    $existingApiResponse = Wait-YazooHttpEndpoint -Uri "$backendUrl/api/marketplace/public-preview" -Headers @{
        Origin = $frontendUrl
    }

    if ($existingApiResponse.Headers.'Access-Control-Allow-Origin' -ne $frontendUrl) {
        throw 'Les ports sont occupes par une configuration incompatible. Fermez les anciens serveurs YaZoo.'
    }

    $null = Wait-YazooHttpEndpoint -Uri $frontendUrl
    Write-Host 'YaZoo local est deja actif avec la bonne configuration.' -ForegroundColor Green
    Write-Host "Frontend : $frontendUrl"
    Write-Host "API      : $backendUrl/api"
    exit 0
}

$commonArguments = @(
    '-NoProfile',
    '-ExecutionPolicy', 'Bypass',
    '-NoExit',
    '-File', $PSCommandPath
)

Start-Process -FilePath 'powershell.exe' -ArgumentList ($commonArguments + @(
    '-Mode', 'Backend',
    '-BackendPort', $BackendPort,
    '-FrontendPort', $FrontendPort
))

Start-Process -FilePath 'powershell.exe' -ArgumentList ($commonArguments + @(
    '-Mode', 'Frontend',
    '-BackendPort', $BackendPort,
    '-FrontendPort', $FrontendPort
))

$apiResponse = Wait-YazooHttpEndpoint -Uri "$backendUrl/api/marketplace/public-preview" -Headers @{
    Origin = $frontendUrl
}

if ($apiResponse.Headers.'Access-Control-Allow-Origin' -ne $frontendUrl) {
    throw "Le CORS local est incorrect : $($apiResponse.Headers.'Access-Control-Allow-Origin')"
}

$null = Wait-YazooHttpEndpoint -Uri $frontendUrl

Write-Host ''
Write-Host 'YaZoo local est pret.' -ForegroundColor Green
Write-Host "Frontend : $frontendUrl"
Write-Host "API      : $backendUrl/api"
Write-Host 'Utilisez Ctrl+C dans chaque terminal YaZoo pour arreter les services.'
