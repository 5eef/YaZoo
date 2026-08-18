[CmdletBinding()]
param(
    [string] $SubscriptionId = '0c2b0918-f196-4a63-a235-1d7674aff317',
    [string] $ResourceGroup = 'yazoo-rg',
    [string] $BackendWebApp = 'yazoo-api',
    [string] $FrontendWebApp = 'yazoo',
    [string] $MySqlServer = 'yazoo-mysql-0c2b09',
    [string] $ExpectedDatabaseHost = 'yazoo-mysql-0c2b09.mysql.database.azure.com',
    [string] $ExpectedDatabasePort = '3306',
    [string] $ExpectedDatabaseName = 'yazoo_azure_test',
    [string] $ProtectedDatabaseName = 'yazoo',
    [string] $ReleaseSha = 'f9357660bb3e8d17ad09474d318000c0d7758e04',
    [string] $BackendUrl = 'https://yazoo-api.azurewebsites.net',
    [string] $FrontendUrl = 'https://yazoo.azurewebsites.net',
    [string] $Database2BundlePath = (Join-Path $env:LOCALAPPDATA 'YaZoo\database2-test-accounts.dpapi'),
    [string] $AdministratorBundlePath = (Join-Path $env:LOCALAPPDATA 'YaZoo\release-admin-enrollment.dpapi'),
    [string] $ProductionProfileBundlePath = (Join-Path $env:LOCALAPPDATA 'YaZoo\production-profile.dpapi')
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version 2

$BackendImage = "5eef/yazoo-api:$ReleaseSha"
$FrontendImage = "5eef/yazoo-frontend:$ReleaseSha"
$Confirmation = "$ExpectedDatabaseHost/$ExpectedDatabaseName"
$TransientSettingNames = @(
    'YAZOO_DATABASE2_TEST_DATA_BOOTSTRAP_CONFIRMATION',
    'YAZOO_DATABASE2_TEST_ACCOUNT_PASSWORD',
    'YAZOO_RELEASE_ADMIN_BOOTSTRAP_CONFIRMATION',
    'YAZOO_RELEASE_ADMIN_NAME',
    'YAZOO_RELEASE_ADMIN_EMAIL',
    'YAZOO_RELEASE_ADMIN_PASSWORD',
    'YAZOO_RELEASE_ADMIN_MFA_SECRET',
    'YAZOO_RELEASE_ADMIN_MFA_RECOVERY_CODES'
)

function Invoke-AzText {
    param([Parameter(Mandatory)] [string[]] $Arguments)

    $output = & az @Arguments --only-show-errors 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw 'An Azure CLI validation operation failed.'
    }

    return (($output | ForEach-Object { [string] $_ }) -join "`n").Trim()
}

function Invoke-AzQuiet {
    param([Parameter(Mandatory)] [string[]] $Arguments)

    $output = & az @Arguments --only-show-errors 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw 'An Azure CLI deployment operation failed.'
    }

    $output = $null
}

function Read-DpapiBundle {
    param([Parameter(Mandatory)] [string] $Path)

    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
        throw "Required encrypted bundle is missing: $Path"
    }

    $cipher = (Get-Content -Raw -LiteralPath $Path).Trim()
    $secure = ConvertTo-SecureString $cipher
    $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    try {
        $json = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
        return ($json | ConvertFrom-Json)
    }
    finally {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
        $json = $null
        $secure = $null
        $cipher = $null
    }
}

function Protect-JsonBundle {
    param(
        [Parameter(Mandatory)] [object] $Value,
        [Parameter(Mandatory)] [string] $Path
    )

    $directory = Split-Path -Parent $Path
    if (-not (Test-Path -LiteralPath $directory -PathType Container)) {
        [void] [IO.Directory]::CreateDirectory($directory)
    }

    $json = $Value | ConvertTo-Json -Compress
    $secure = ConvertTo-SecureString $json -AsPlainText -Force
    $cipher = ConvertFrom-SecureString $secure
    [IO.File]::WriteAllText($Path, $cipher + [Environment]::NewLine, [Text.Encoding]::ASCII)
    $json = $null
    $secure = $null
    $cipher = $null
}

function Decode-Utf8Base64 {
    param([Parameter(Mandatory)] [string] $Value)

    return [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($Value))
}

function Get-AppSettingsMap {
    param([Parameter(Mandatory)] [string] $WebApp)

    $json = Invoke-AzText -Arguments @(
        'webapp', 'config', 'appsettings', 'list',
        '--resource-group', $ResourceGroup,
        '--name', $WebApp,
        '--output', 'json'
    )
    $items = $json | ConvertFrom-Json
    $map = @{}
    foreach ($item in $items) {
        $map[[string] $item.name] = [string] $item.value
    }

    return $map
}

function Set-AppSettings {
    param(
        [Parameter(Mandatory)] [string] $WebApp,
        [Parameter(Mandatory)] [hashtable] $Settings
    )

    if ($Settings.Count -eq 0) {
        return
    }

    $arguments = @(
        'webapp', 'config', 'appsettings', 'set',
        '--resource-group', $ResourceGroup,
        '--name', $WebApp,
        '--settings'
    )
    foreach ($entry in $Settings.GetEnumerator()) {
        $arguments += "{0}={1}" -f $entry.Key, $entry.Value
    }
    $arguments += @('--output', 'none')
    Invoke-AzQuiet -Arguments $arguments
}

function Remove-AppSettings {
    param(
        [Parameter(Mandatory)] [string] $WebApp,
        [Parameter(Mandatory)] [string[]] $Names
    )

    if ($Names.Count -eq 0) {
        return
    }

    $arguments = @(
        'webapp', 'config', 'appsettings', 'delete',
        '--resource-group', $ResourceGroup,
        '--name', $WebApp,
        '--setting-names'
    ) + $Names + @('--output', 'none')
    Invoke-AzQuiet -Arguments $arguments
}

function Set-ContainerImage {
    param(
        [Parameter(Mandatory)] [string] $WebApp,
        [Parameter(Mandatory)] [string] $Image
    )

    Invoke-AzQuiet -Arguments @(
        'webapp', 'config', 'container', 'set',
        '--resource-group', $ResourceGroup,
        '--name', $WebApp,
        '--docker-custom-image-name', $Image,
        '--docker-registry-server-url', 'https://index.docker.io',
        '--output', 'none'
    )
}

function Wait-Backend {
    param([Parameter(Mandatory)] [string] $Version)

    for ($attempt = 1; $attempt -le 24; $attempt++) {
        try {
            $live = Invoke-RestMethod -Uri "$BackendUrl/health/live" -TimeoutSec 10
            $ready = Invoke-RestMethod -Uri "$BackendUrl/health/ready" -TimeoutSec 10
            if ([string] $live.version -eq $Version -and [string] $ready.status -eq 'ok') {
                return $true
            }
        }
        catch {
            # App Service may return transient 404/5xx while replacing the container.
        }

        Write-Host "Backend readiness attempt $attempt/24 is not ready yet."
        Start-Sleep -Seconds 15
    }

    return $false
}

function Wait-Frontend {
    param([Parameter(Mandatory)] [string] $Version)

    for ($attempt = 1; $attempt -le 24; $attempt++) {
        try {
            $result = Invoke-RestMethod -Uri "$FrontendUrl/version.json" -TimeoutSec 10
            if ([string] $result.version -eq $Version) {
                $response = Invoke-WebRequest -Uri "$FrontendUrl/" -TimeoutSec 10 -UseBasicParsing
                if ([int] $response.StatusCode -eq 200) {
                    return $true
                }
            }
        }
        catch {
            # App Service may return transient 404/5xx while replacing the container.
        }

        Write-Host "Frontend readiness attempt $attempt/24 is not ready yet."
        Start-Sleep -Seconds 15
    }

    return $false
}

function Restore-AppSettings {
    param(
        [Parameter(Mandatory)] [string] $WebApp,
        [Parameter(Mandatory)] [hashtable] $Before,
        [Parameter(Mandatory)] [string[]] $ChangedNames
    )

    $restore = @{}
    $remove = @()
    foreach ($name in $ChangedNames) {
        if ($Before.ContainsKey($name)) {
            $restore[$name] = $Before[$name]
        }
        else {
            $remove += $name
        }
    }

    Set-AppSettings -WebApp $WebApp -Settings $restore
    Remove-AppSettings -WebApp $WebApp -Names $remove
}

if (-not (Get-Command az -ErrorAction SilentlyContinue)) {
    throw 'Azure CLI is required.'
}

$plan = Get-Content -Raw -LiteralPath (Join-Path $PSScriptRoot '..\.azure\deployment-plan.md')
if ($plan -notmatch '(?m)^> \*\*Status:\*\* Validated\s*$' -or $plan -notmatch '(?m)^## Section 7: Validation Proof\s*$') {
    throw 'The Azure deployment plan is not validated or has no validation proof.'
}

if ($ExpectedDatabaseName -eq $ProtectedDatabaseName) {
    throw 'DATABASE #1 is protected and cannot be selected.'
}
if ($ReleaseSha -notmatch '^[0-9a-f]{40}$') {
    throw 'ReleaseSha must be an exact Git SHA.'
}

Write-Host '[1/8] Validating Azure subscription, MySQL backup, and DATABASE #2.'
$account = (Invoke-AzText -Arguments @('account', 'show', '--output', 'json')) | ConvertFrom-Json
if ([string] $account.id -ne $SubscriptionId -or [string] $account.state -ne 'Enabled') {
    throw 'The selected Azure subscription does not match the approved deployment plan.'
}

$server = (Invoke-AzText -Arguments @(
    'mysql', 'flexible-server', 'show',
    '--resource-group', $ResourceGroup,
    '--name', $MySqlServer,
    '--output', 'json'
)) | ConvertFrom-Json
if ([string] $server.state -ne 'Ready' -or [int] $server.backup.backupRetentionDays -lt 7) {
    throw 'Azure MySQL is not ready or its backup retention is below seven days.'
}
$database = (Invoke-AzText -Arguments @(
    'mysql', 'flexible-server', 'db', 'show',
    '--resource-group', $ResourceGroup,
    '--server-name', $MySqlServer,
    '--database-name', $ExpectedDatabaseName,
    '--output', 'json'
)) | ConvertFrom-Json
if ([string] $database.name -ne $ExpectedDatabaseName) {
    throw 'DATABASE #2 identity validation failed.'
}

Write-Host '[2/8] Loading encrypted local credentials and clipboard SMTP secret.'
$database2Bundle = Read-DpapiBundle -Path $Database2BundlePath
$administratorBundle = Read-DpapiBundle -Path $AdministratorBundlePath
$clipboardPassword = [string] (Get-Clipboard -Raw)
if ([string]::IsNullOrWhiteSpace($clipboardPassword) -or $clipboardPassword -match '[\r\n]') {
    throw 'The clipboard does not contain a valid one-line SMTP password.'
}
$smtpPassword = $clipboardPassword.Trim()
$compactPassword = $smtpPassword -replace '\s', ''
if ($compactPassword -match '^[A-Za-z0-9]{16}$') {
    $smtpPassword = $compactPassword
}
elseif ($smtpPassword.Length -lt 8) {
    throw 'The clipboard SMTP password is unexpectedly short.'
}

if (([string] $database2Bundle.password).Length -lt 20) {
    throw 'The DATABASE #2 test password bundle is invalid.'
}
if (
    ([string] $administratorBundle.password).Length -lt 16 -or
    ([string] $administratorBundle.mfa_secret) -notmatch '^[A-Z2-7]{32,64}$' -or
    @($administratorBundle.recovery_codes).Count -ne 8
) {
    throw 'The release administrator bundle is invalid.'
}

$legalStatus = Decode-Utf8Base64 'UHJvamV0IMOpdHVkaWFudCBZYVpvbyAtIGVudmlyb25uZW1lbnQgZGUgZMOpbW9uc3RyYXRpb24gc2FucyBhY3Rpdml0w6kgY29tbWVyY2lhbGU='
$legalIce = Decode-Utf8Base64 'Tm9uIGFwcGxpY2FiZSAtIHByb2pldCDDqXR1ZGlhbnQgbm9uIGNvbW1lcmNpYWw='
$profileBundle = [ordered]@{
    environment = 'production'
    legal_status = $legalStatus
    legal_address = 'Sefrou - Maroc'
    legal_ice = $legalIce
    privacy_contact_email = 'bough.youssef@gmail.com'
    contact_recipient = 'bough.youssef@gmail.com'
    mail_host = 'smtp.gmail.com'
    mail_port = '587'
    mail_username = 'bough.youssef@gmail.com'
    mail_password = $smtpPassword
    mail_from_address = 'bough.youssef@gmail.com'
    created_at = [DateTimeOffset]::Now.ToString('o')
}
Protect-JsonBundle -Value $profileBundle -Path $ProductionProfileBundlePath

Write-Host '[3/8] Recording rollback state and validating protected DATABASE #1.'
$backendBefore = Get-AppSettingsMap -WebApp $BackendWebApp
$frontendBefore = Get-AppSettingsMap -WebApp $FrontendWebApp
$backendImageBefore = Invoke-AzText -Arguments @(
    'webapp', 'config', 'show', '--resource-group', $ResourceGroup,
    '--name', $BackendWebApp, '--query', 'linuxFxVersion', '--output', 'tsv'
)
$frontendImageBefore = Invoke-AzText -Arguments @(
    'webapp', 'config', 'show', '--resource-group', $ResourceGroup,
    '--name', $FrontendWebApp, '--query', 'linuxFxVersion', '--output', 'tsv'
)
$backendImageBefore = $backendImageBefore -replace '^DOCKER\|', ''
$frontendImageBefore = $frontendImageBefore -replace '^DOCKER\|', ''

if (-not $backendBefore.ContainsKey('DB_DATABASE') -or @($ProtectedDatabaseName, $ExpectedDatabaseName) -notcontains $backendBefore['DB_DATABASE']) {
    throw 'The current backend database is neither the protected baseline nor the approved DATABASE #2.'
}
if (-not $backendBefore.ContainsKey('WEBSITES_ENABLE_APP_SERVICE_STORAGE') -or $backendBefore['WEBSITES_ENABLE_APP_SERVICE_STORAGE'].ToLowerInvariant() -ne 'true') {
    throw 'Persistent App Service storage is not enabled.'
}

$deploymentSettings = @{
    APP_VERSION = $ReleaseSha
    YAZOO_RUN_PRODUCTION_PREFLIGHT = 'true'
    YAZOO_RUN_MIGRATIONS = 'true'
    YAZOO_RUN_QUEUE_WORKER = 'true'
    YAZOO_RUN_SCHEDULER = 'true'
    YAZOO_RUN_DATABASE2_TEST_DATA_BOOTSTRAP = 'true'
    YAZOO_DATABASE2_TEST_DATA_BOOTSTRAP_ENABLED = 'true'
    YAZOO_DATABASE2_TEST_DATA_BOOTSTRAP_CONFIRMATION = $Confirmation
    YAZOO_DATABASE2_TEST_ACCOUNT_PASSWORD = [string] $database2Bundle.password
    YAZOO_DATABASE2_TEST_DATA_IMAGES_PATH = '/var/www/html/database/seeders/assets/marketplace'
    YAZOO_RUN_RELEASE_ADMIN_BOOTSTRAP = 'true'
    YAZOO_RELEASE_ADMIN_BOOTSTRAP_ENABLED = 'true'
    YAZOO_RELEASE_ADMIN_BOOTSTRAP_CONFIRMATION = $Confirmation
    YAZOO_RELEASE_ADMIN_NAME = [string] $administratorBundle.administrator_name
    YAZOO_RELEASE_ADMIN_EMAIL = [string] $administratorBundle.administrator_email
    YAZOO_RELEASE_ADMIN_PASSWORD = [string] $administratorBundle.password
    YAZOO_RELEASE_ADMIN_MFA_SECRET = [string] $administratorBundle.mfa_secret
    YAZOO_RELEASE_ADMIN_MFA_RECOVERY_CODES = (@($administratorBundle.recovery_codes) -join ',')
    LEGAL_STATUS = $legalStatus
    LEGAL_ADDRESS = 'Sefrou - Maroc'
    LEGAL_ICE = $legalIce
    PRIVACY_CONTACT_EMAIL = 'bough.youssef@gmail.com'
    CONTACT_RECIPIENT = 'bough.youssef@gmail.com'
    MAIL_MAILER = 'smtp'
    MAIL_HOST = 'smtp.gmail.com'
    MAIL_PORT = '587'
    MAIL_USERNAME = 'bough.youssef@gmail.com'
    MAIL_PASSWORD = $smtpPassword
    MAIL_FROM_ADDRESS = 'bough.youssef@gmail.com'
    MAIL_FROM_NAME = 'YaZoo'
    DB_HOST = $ExpectedDatabaseHost
    DB_PORT = $ExpectedDatabasePort
    DB_DATABASE = $ExpectedDatabaseName
    YAZOO_REQUIRE_EXPECTED_DATABASE = 'true'
    YAZOO_EXPECTED_DB_HOST = $ExpectedDatabaseHost
    YAZOO_EXPECTED_DB_PORT = $ExpectedDatabasePort
    YAZOO_EXPECTED_DB_NAME = $ExpectedDatabaseName
    YAZOO_PROTECTED_DB_NAMES = $ProtectedDatabaseName
    YAZOO_REQUIRE_PERSISTENT_STORAGE = 'true'
    YAZOO_PERSISTENT_STORAGE_PATH = '/home/site/yazoo-storage'
    ADMIN_MFA_ENFORCED = 'true'
    ADMIN_BOOTSTRAP_ENABLED = 'false'
}
$frontendSettings = @{ WEBSITES_PORT = '8080' }
$backendChangedNames = @($deploymentSettings.Keys)
$frontendChangedNames = @($frontendSettings.Keys)
$backendChanged = $false
$frontendChanged = $false

try {
    Write-Host '[4/8] Stopping backend and applying the guarded DATABASE #2 release settings.'
    Invoke-AzQuiet -Arguments @('webapp', 'stop', '--resource-group', $ResourceGroup, '--name', $BackendWebApp, '--output', 'none')
    Set-AppSettings -WebApp $BackendWebApp -Settings $deploymentSettings
    Set-ContainerImage -WebApp $BackendWebApp -Image $BackendImage
    $backendChanged = $true
    Invoke-AzQuiet -Arguments @('webapp', 'start', '--resource-group', $ResourceGroup, '--name', $BackendWebApp, '--output', 'none')

    Write-Host '[5/8] Waiting for migrations, DB2 dataset, administrator MFA, and backend health.'
    if (-not (Wait-Backend -Version $ReleaseSha)) {
        throw 'The backend did not become healthy after the guarded bootstrap.'
    }

    Write-Host '[6/8] Disabling one-time operations and removing temporary credentials.'
    Set-AppSettings -WebApp $BackendWebApp -Settings @{
        APP_VERSION = $ReleaseSha
        YAZOO_RUN_MIGRATIONS = 'false'
        YAZOO_RUN_DATABASE2_TEST_DATA_BOOTSTRAP = 'false'
        YAZOO_DATABASE2_TEST_DATA_BOOTSTRAP_ENABLED = 'false'
        YAZOO_RUN_RELEASE_ADMIN_BOOTSTRAP = 'false'
        YAZOO_RELEASE_ADMIN_BOOTSTRAP_ENABLED = 'false'
    }
    Remove-AppSettings -WebApp $BackendWebApp -Names $TransientSettingNames
    Invoke-AzQuiet -Arguments @('webapp', 'restart', '--resource-group', $ResourceGroup, '--name', $BackendWebApp, '--output', 'none')
    if (-not (Wait-Backend -Version $ReleaseSha)) {
        throw 'The backend failed after disabling one-time startup operations.'
    }

    Write-Host '[7/8] Deploying and verifying the frontend SHA image.'
    Set-ContainerImage -WebApp $FrontendWebApp -Image $FrontendImage
    Set-AppSettings -WebApp $FrontendWebApp -Settings $frontendSettings
    $frontendChanged = $true
    Invoke-AzQuiet -Arguments @('webapp', 'restart', '--resource-group', $ResourceGroup, '--name', $FrontendWebApp, '--output', 'none')
    if (-not (Wait-Frontend -Version $ReleaseSha)) {
        throw 'The frontend did not expose the expected release SHA.'
    }

    Write-Host '[8/8] Deployment health checks passed.'
    [pscustomobject]@{
        status = 'deployed'
        version = $ReleaseSha
        database_host = $ExpectedDatabaseHost
        database_port = $ExpectedDatabasePort
        database_name = $ExpectedDatabaseName
        backend_url = $BackendUrl
        frontend_url = $FrontendUrl
        profile_bundle = $ProductionProfileBundlePath
    } | ConvertTo-Json
}
catch {
    $deploymentFailure = $_.Exception.Message
    Write-Warning 'Deployment failed. Restoring previous images and App Service settings without rolling back DATABASE #2 migrations.'
    try {
        if ($backendChanged) {
            Restore-AppSettings -WebApp $BackendWebApp -Before $backendBefore -ChangedNames $backendChangedNames
            Set-ContainerImage -WebApp $BackendWebApp -Image $backendImageBefore
            Invoke-AzQuiet -Arguments @('webapp', 'start', '--resource-group', $ResourceGroup, '--name', $BackendWebApp, '--output', 'none')
            Invoke-AzQuiet -Arguments @('webapp', 'restart', '--resource-group', $ResourceGroup, '--name', $BackendWebApp, '--output', 'none')
        }
        if ($frontendChanged) {
            Restore-AppSettings -WebApp $FrontendWebApp -Before $frontendBefore -ChangedNames $frontendChangedNames
            Set-ContainerImage -WebApp $FrontendWebApp -Image $frontendImageBefore
            Invoke-AzQuiet -Arguments @('webapp', 'restart', '--resource-group', $ResourceGroup, '--name', $FrontendWebApp, '--output', 'none')
        }
    }
    catch {
        Write-Error 'Automatic App Service rollback also failed; inspect both applications immediately.'
    }

    throw $deploymentFailure
}
finally {
    $smtpPassword = $null
    $clipboardPassword = $null
    $compactPassword = $null
    $database2Bundle = $null
    $administratorBundle = $null
    $profileBundle = $null
}
