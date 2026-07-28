#!/usr/bin/env pwsh
[CmdletBinding(SupportsShouldProcess)]
param(
    [string] $SubscriptionId = "",
    [Parameter(Mandatory)][string] $ResourceGroup,
    [Parameter(Mandatory)][string] $Location,
    [Parameter(Mandatory)][string] $AppServicePlanName,
    [Parameter(Mandatory)][string] $BackendWebAppName,
    [Parameter(Mandatory)][string] $FrontendWebAppName,
    [Parameter(Mandatory)][string] $BackendImage,
    [Parameter(Mandatory)][string] $FrontendImage,
    [SecureString] $AppKey,
    [Parameter(Mandatory)][string] $FrontendUrl,
    [Parameter(Mandatory)][string] $DbHost,
    [string] $DbDatabase = "yazoo",
    [Parameter(Mandatory)][string] $DbUsername,
    [SecureString] $DbPassword,
    [Parameter(Mandatory)][string] $RedisHost,
    [SecureString] $RedisPassword,
    [string] $RedisPort = "6380",
    [string] $RedisScheme = "tls",
    [string] $GoogleClientId = "",
    [SecureString] $GoogleClientSecret,
    [string] $GoogleRedirectUri = "",
    [string] $GoogleFrontendRedirect = "",
    [Parameter(Mandatory)][string] $ContactRecipient,
    [Parameter(Mandatory)][string] $LegalStatus,
    [Parameter(Mandatory)][string] $LegalAddress,
    [Parameter(Mandatory)][string] $LegalIce,
    [Parameter(Mandatory)][string] $PrivacyContactEmail,
    [Parameter(Mandatory)][string] $MailHost,
    [Parameter(Mandatory)][string] $MailPort,
    [Parameter(Mandatory)][string] $MailUsername,
    [SecureString] $MailPassword,
    [string] $MailEncryption = "tls",
    [Parameter(Mandatory)][string] $MailFromAddress,
    [string] $MailFromName = "YaZoo",
    [switch] $AllowInitialConfiguration
)

$ErrorActionPreference = "Stop"

$immutableImagePattern = ':[0-9a-fA-F]{40}$'
foreach ($image in @($BackendImage, $FrontendImage)) {
    if ($image -notmatch $immutableImagePattern) {
        throw "Container images must use an immutable full 40-character Git SHA tag."
    }
}

function Format-SafeArguments {
    param([string[]] $Arguments)

    $secretNames = @(
        "APP_KEY",
        "DB_PASSWORD",
        "REDIS_PASSWORD",
        "GOOGLE_CLIENT_SECRET",
        "MAIL_PASSWORD"
    )

    return ($Arguments | ForEach-Object {
        $argument = $_
        $secretName = $secretNames | Where-Object { $argument.StartsWith("${_}=", [System.StringComparison]::OrdinalIgnoreCase) } | Select-Object -First 1
        if ($secretName) {
            return "$secretName=<redacted>"
        }

        if ($argument -match '\s') {
            return '"<value-with-spaces>"'
        }

        return $argument
    }) -join " "
}

function Invoke-NativeCommand {
    param(
        [Parameter(Mandatory)][string] $FilePath,
        [Parameter(Mandatory)][string[]] $Arguments,
        [switch] $PassThru
    )

    Write-Host ("Running: {0} {1}" -f $FilePath, (Format-SafeArguments $Arguments))

    if ($WhatIfPreference) {
        return $null
    }

    $output = & $FilePath @Arguments 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "$FilePath failed with exit code $LASTEXITCODE. Review Azure CLI diagnostics without exposing command secrets."
    }

    if ($PassThru) {
        return $output
    }

    return $null
}

function Test-WebAppExists {
    param([string] $Name)

    if ($WhatIfPreference) {
        return $false
    }

    & az webapp show --resource-group $ResourceGroup --name $Name --only-show-errors --output none 2>$null
    return $LASTEXITCODE -eq 0
}

function ConvertFrom-SecureValue {
    param([SecureString] $Value)

    if (-not $Value) {
        return ""
    }

    $pointer = [IntPtr]::Zero
    try {
        $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($Value)
        return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
    } finally {
        if ($pointer -ne [IntPtr]::Zero) {
            [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
        }
    }
}

if (-not $AllowInitialConfiguration -and -not $WhatIfPreference) {
    throw "This script is for initial configuration only. Use deploy.yml for routine releases, or pass -AllowInitialConfiguration after explicit approval."
}

if (-not $AllowInitialConfiguration) {
    Write-Host "WhatIf mode: initial configuration is being simulated; -AllowInitialConfiguration was not granted."
} else {
    Write-Warning "Initial configuration only: routine production releases must use .github/workflows/deploy.yml."
    foreach ($requiredSecret in @{
        AppKey = $AppKey
        DbPassword = $DbPassword
        RedisPassword = $RedisPassword
        MailPassword = $MailPassword
    }.GetEnumerator()) {
        if (-not $requiredSecret.Value) {
            throw "$($requiredSecret.Key) must be supplied as a SecureString for initial configuration."
        }
    }
}

if ($SubscriptionId) {
    Invoke-NativeCommand az @("account", "set", "--subscription", $SubscriptionId)
}

$appKeyValue = ConvertFrom-SecureValue $AppKey
$dbPasswordValue = ConvertFrom-SecureValue $DbPassword
$redisPasswordValue = ConvertFrom-SecureValue $RedisPassword
$googleClientSecretValue = ConvertFrom-SecureValue $GoogleClientSecret
$mailPasswordValue = ConvertFrom-SecureValue $MailPassword

try {
$frontendUri = [Uri] $FrontendUrl
if ($frontendUri.Scheme -ne "https" -or -not $frontendUri.Host) {
    throw "FrontendUrl must be an absolute HTTPS URL."
}

$frontendHost = $frontendUri.Host
if (-not $GoogleRedirectUri) {
    $GoogleRedirectUri = "https://$BackendWebAppName.azurewebsites.net/api/auth/google/callback"
}
if (-not $GoogleFrontendRedirect) {
    $GoogleFrontendRedirect = "$FrontendUrl/feed"
}

Invoke-NativeCommand az @("group", "create", "--name", $ResourceGroup, "--location", $Location, "--only-show-errors", "--output", "none")
Invoke-NativeCommand az @(
    "appservice", "plan", "create",
    "--resource-group", $ResourceGroup,
    "--name", $AppServicePlanName,
    "--location", $Location,
    "--is-linux",
    "--sku", "B1",
    "--only-show-errors",
    "--output", "none"
)

foreach ($app in @(
    @{ Name = $BackendWebAppName; Image = $BackendImage },
    @{ Name = $FrontendWebAppName; Image = $FrontendImage }
)) {
    if (-not (Test-WebAppExists $app.Name)) {
        Invoke-NativeCommand az @(
            "webapp", "create",
            "--resource-group", $ResourceGroup,
            "--plan", $AppServicePlanName,
            "--name", $app.Name,
            "--deployment-container-image-name", $app.Image,
            "--only-show-errors",
            "--output", "none"
        )
    }

    Invoke-NativeCommand az @(
        "webapp", "update",
        "--resource-group", $ResourceGroup,
        "--name", $app.Name,
        "--set", "httpsOnly=true",
        "--only-show-errors",
        "--output", "none"
    )
    Invoke-NativeCommand az @(
        "webapp", "config", "container", "set",
        "--resource-group", $ResourceGroup,
        "--name", $app.Name,
        "--docker-custom-image-name", $app.Image,
        "--docker-registry-server-url", "https://index.docker.io",
        "--only-show-errors",
        "--output", "none"
    )
}

Invoke-NativeCommand az @(
    "webapp", "config", "set",
    "--resource-group", $ResourceGroup,
    "--name", $BackendWebAppName,
    "--generic-configurations", '{"healthCheckPath":"/health/ready"}',
    "--only-show-errors",
    "--output", "none"
)

$backendSettings = @(
    "WEBSITES_PORT=8080",
    "WEBSITES_CONTAINER_START_TIME_LIMIT=1800",
    "WEBSITE_HEALTHCHECK_MAXPINGFAILURES=3",
    "YAZOO_RUN_MIGRATIONS=false",
    "YAZOO_RUN_PRODUCTION_PREFLIGHT=true",
    "YAZOO_RUN_QUEUE_WORKER=true",
    "YAZOO_RUN_SCHEDULER=true",
    "YAZOO_RUNTIME_OPTIMIZE=true",
    "APP_NAME=YaZoo",
    "APP_ENV=production",
    "APP_KEY=$appKeyValue",
    "APP_DEBUG=false",
    "APP_URL=https://$BackendWebAppName.azurewebsites.net",
    "APP_FORCE_HTTPS=true",
    "ADMIN_BOOTSTRAP_ENABLED=false",
    "LOG_CHANNEL=stack",
    "LOG_STACK=stderr",
    "LOG_LEVEL=info",
    "DB_CONNECTION=mysql",
    "DB_HOST=$DbHost",
    "DB_PORT=3306",
    "DB_DATABASE=$DbDatabase",
    "DB_USERNAME=$DbUsername",
    "DB_PASSWORD=$dbPasswordValue",
    "MYSQL_ATTR_SSL_CA=/etc/ssl/certs/ca-certificates.crt",
    "CACHE_STORE=redis",
    "QUEUE_CONNECTION=redis",
    "SESSION_DRIVER=redis",
    "SESSION_CONNECTION=default",
    "SESSION_ENCRYPT=true",
    "SESSION_SECURE_COOKIE=true",
    "SESSION_SAME_SITE=none",
    "SESSION_DOMAIN=null",
    "REDIS_CLIENT=phpredis",
    "REDIS_SCHEME=$RedisScheme",
    "REDIS_HOST=$RedisHost",
    "REDIS_PORT=$RedisPort",
    "REDIS_PASSWORD=$redisPasswordValue",
    "REDIS_DB=0",
    "REDIS_CACHE_DB=1",
    "FRONTEND_URL=$FrontendUrl",
    "SANCTUM_STATEFUL_DOMAINS=$frontendHost",
    "CORS_ALLOWED_ORIGINS=$FrontendUrl",
    "GOOGLE_CLIENT_ID=$GoogleClientId",
    "GOOGLE_CLIENT_SECRET=$googleClientSecretValue",
    "GOOGLE_REDIRECT_URI=$GoogleRedirectUri",
    "GOOGLE_FRONTEND_REDIRECT=$GoogleFrontendRedirect",
    "FILESYSTEM_DISK=public",
    "MEDIA_STORAGE_DRIVER=filesystem",
    "MEDIA_MONGODB_ENABLED=false",
    "MAIL_MAILER=smtp",
    "MAIL_HOST=$MailHost",
    "MAIL_PORT=$MailPort",
    "MAIL_USERNAME=$MailUsername",
    "MAIL_PASSWORD=$mailPasswordValue",
    "MAIL_ENCRYPTION=$MailEncryption",
    "MAIL_FROM_ADDRESS=$MailFromAddress",
    "MAIL_FROM_NAME=$MailFromName",
    "CONTACT_RECIPIENT=$ContactRecipient",
    "LEGAL_STATUS=$LegalStatus",
    "LEGAL_ADDRESS=$LegalAddress",
    "LEGAL_ICE=$LegalIce",
    "PRIVACY_CONTACT_EMAIL=$PrivacyContactEmail",
    "CMI_ENABLED=false"
)

Invoke-NativeCommand az (@(
    "webapp", "config", "appsettings", "set",
    "--resource-group", $ResourceGroup,
    "--name", $BackendWebAppName,
    "--settings"
) + $backendSettings + @("--only-show-errors", "--output", "none"))

Invoke-NativeCommand az @(
    "webapp", "config", "appsettings", "set",
    "--resource-group", $ResourceGroup,
    "--name", $FrontendWebAppName,
    "--settings", "WEBSITES_PORT=80",
    "--only-show-errors",
    "--output", "none"
)

Invoke-NativeCommand az @("webapp", "restart", "--resource-group", $ResourceGroup, "--name", $BackendWebAppName, "--only-show-errors")
Invoke-NativeCommand az @("webapp", "restart", "--resource-group", $ResourceGroup, "--name", $FrontendWebAppName, "--only-show-errors")

Write-Host "Azure App Service container configuration completed."
Write-Host "Backend health: https://$BackendWebAppName.azurewebsites.net/health/ready"
Write-Host "Frontend health: https://$FrontendWebAppName.azurewebsites.net/"
} finally {
    $appKeyValue = $null
    $dbPasswordValue = $null
    $redisPasswordValue = $null
    $googleClientSecretValue = $null
    $mailPasswordValue = $null
}
