#!/usr/bin/env pwsh
[CmdletBinding()]
param(
    [string] $SubscriptionId = '0c2b0918-f196-4a63-a235-1d7674aff317',
    [string] $ResourceGroup = 'yazoo-rg',
    [string] $ServerName = 'yazoo-mysql-0c2b09',
    [string] $DatabaseName = 'yazoo',
    [string] $WebAppName = 'yazoo-api',
    [string] $DockerHubRepository = '5eef/yazoo-api',
    [Parameter(Mandatory)][string] $ImagesPath,
    [Parameter(Mandatory)][string] $Confirmation,
    [string] $ImageTag = '',
    [string] $BackupDirectory = '',
    [string] $ExistingValidatedBaseImage = '',
    [switch] $Execute
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$expectedSubscriptionId = '0c2b0918-f196-4a63-a235-1d7674aff317'
$expectedResourceGroup = 'yazoo-rg'
$expectedServerName = 'yazoo-mysql-0c2b09'
$expectedDatabaseName = 'yazoo'
$expectedWebAppName = 'yazoo-api'
$expectedConfirmation = 'yazoo-mysql-0c2b09/yazoo@yazoo-api'
$expectedDatabaseHost = 'yazoo-mysql-0c2b09.mysql.database.azure.com'
$expectedAppUrl = 'https://yazoo-api.azurewebsites.net'
$mysqlClientImage = 'mysql:8.4.10'

function Format-SafeArguments {
    param([string[]] $Arguments)

    $secretPrefixes = @(
        'DB_PASSWORD=',
        'YAZOO_SHOWCASE_PASSWORD=',
        'YAZOO_SHOWCASE_MFA_SECRET=',
        'YAZOO_SHOWCASE_MFA_RECOVERY_CODES='
    )

    return ($Arguments | ForEach-Object {
        $argument = $_
        if ($secretPrefixes | Where-Object { $argument.StartsWith($_, [StringComparison]::OrdinalIgnoreCase) }) {
            return (($argument -split '=', 2)[0] + '=<redacted>')
        }

        if ($argument -match '\s') {
            return '"<value-with-spaces>"'
        }

        return $argument
    }) -join ' '
}

function Invoke-NativeCommand {
    param(
        [Parameter(Mandatory)][string] $FilePath,
        [Parameter(Mandatory)][string[]] $Arguments,
        [switch] $Capture
    )

    Write-Host ('Running: {0} {1}' -f $FilePath, (Format-SafeArguments $Arguments))

    if ($Capture) {
        $output = (& $FilePath @Arguments 2>&1 | Out-String).Trim()
        if ($LASTEXITCODE -ne 0) {
            throw "$FilePath failed with exit code $LASTEXITCODE."
        }

        return $output
    }

    & $FilePath @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "$FilePath failed with exit code $LASTEXITCODE."
    }
}

function Test-DockerManifestExists {
    param([Parameter(Mandatory)][string] $Image)

    $previousErrorActionPreference = $ErrorActionPreference
    try {
        # Windows PowerShell can promote native stderr to a terminating error when
        # ErrorActionPreference is Stop. A missing manifest is an expected result
        # here, so capture it before deciding whether it is safe to push.
        $ErrorActionPreference = 'Continue'
        $manifestOutput = (& docker manifest inspect $Image 2>&1 | Out-String).Trim()
        $manifestExitCode = $LASTEXITCODE
    } finally {
        $ErrorActionPreference = $previousErrorActionPreference
    }

    if ($manifestExitCode -eq 0) {
        return $true
    }

    if ($manifestOutput -match '(?i)(no such manifest|manifest unknown)') {
        return $false
    }

    throw "Unable to verify whether Docker Hub tag '$Image' already exists. Refusing to push."
}

function Protect-LocalDirectory {
    param([Parameter(Mandatory)][string] $Path)

    if (-not (Test-Path -LiteralPath $Path)) {
        New-Item -ItemType Directory -Path $Path -Force | Out-Null
    }

    $identity = [Security.Principal.WindowsIdentity]::GetCurrent().Name
    $acl = New-Object Security.AccessControl.DirectorySecurity
    $acl.SetAccessRuleProtection($true, $false)
    $rule = New-Object Security.AccessControl.FileSystemAccessRule(
        $identity,
        [Security.AccessControl.FileSystemRights]::FullControl,
        [Security.AccessControl.InheritanceFlags]'ContainerInherit, ObjectInherit',
        [Security.AccessControl.PropagationFlags]::None,
        [Security.AccessControl.AccessControlType]::Allow
    )
    $acl.AddAccessRule($rule)
    Set-Acl -LiteralPath $Path -AclObject $acl
}

function Get-AppSetting {
    param(
        [Parameter(Mandatory)][object[]] $Settings,
        [Parameter(Mandatory)][string] $Name
    )

    $setting = $Settings | Where-Object name -eq $Name | Select-Object -First 1
    if ($null -eq $setting) {
        return $null
    }

    return [string] $setting.value
}

function Resolve-AppSettingSecret {
    param([Parameter(Mandatory)][string] $SettingValue)

    if ($SettingValue -match '^@Microsoft\.KeyVault\(SecretUri=(https://[^)]+)\)$') {
        return Invoke-NativeCommand az @(
            'keyvault', 'secret', 'show',
            '--id', $Matches[1],
            '--query', 'value',
            '--output', 'tsv',
            '--only-show-errors'
        ) -Capture
    }

    return $SettingValue
}

function Wait-WebAppHealth {
    param(
        [Parameter(Mandatory)][string] $Url,
        [int] $TimeoutSeconds = 900
    )

    $deadline = [DateTimeOffset]::UtcNow.AddSeconds($TimeoutSeconds)
    do {
        try {
            $response = Invoke-WebRequest -Uri $Url -Method Get -TimeoutSec 15 -UseBasicParsing
            if ($response.StatusCode -eq 200) {
                Write-Host "Health check passed: $Url"
                return
            }
        } catch {
            Write-Host 'Health check pending...'
        }

        Start-Sleep -Seconds 15
    } while ([DateTimeOffset]::UtcNow -lt $deadline)

    throw "Health check timed out after $TimeoutSeconds seconds: $Url"
}

function Invoke-MySqlContainer {
    param(
        [Parameter(Mandatory)][string[]] $Command,
        [Parameter(Mandatory)][string] $DatabaseHost,
        [Parameter(Mandatory)][string] $DatabaseUser,
        [Parameter(Mandatory)][string] $DatabasePassword,
        [Parameter(Mandatory)][string] $Database,
        [string] $MountedBackupDirectory = ''
    )

    $previousPassword = $env:MYSQL_PWD
    $previousHost = $env:YAZOO_MYSQL_HOST
    $previousUser = $env:YAZOO_MYSQL_USER
    $previousDatabase = $env:YAZOO_MYSQL_DATABASE

    try {
        $env:MYSQL_PWD = $DatabasePassword
        $env:YAZOO_MYSQL_HOST = $DatabaseHost
        $env:YAZOO_MYSQL_USER = $DatabaseUser
        $env:YAZOO_MYSQL_DATABASE = $Database

        $arguments = @(
            'run', '--rm',
            '-e', 'MYSQL_PWD',
            '-e', 'YAZOO_MYSQL_HOST',
            '-e', 'YAZOO_MYSQL_USER',
            '-e', 'YAZOO_MYSQL_DATABASE'
        )

        if ($MountedBackupDirectory) {
            $arguments += @('-v', "${MountedBackupDirectory}:/backup")
        }

        $arguments += @($mysqlClientImage)
        $arguments += $Command
        Invoke-NativeCommand docker $arguments
    } finally {
        $env:MYSQL_PWD = $previousPassword
        $env:YAZOO_MYSQL_HOST = $previousHost
        $env:YAZOO_MYSQL_USER = $previousUser
        $env:YAZOO_MYSQL_DATABASE = $previousDatabase
    }
}

function Set-WebAppImage {
    param([Parameter(Mandatory)][string] $Image)

    $normalizedImage = $Image -replace '^DOCKER\|', ''
    Invoke-NativeCommand az @(
        'webapp', 'config', 'container', 'set',
        '--resource-group', $ResourceGroup,
        '--name', $WebAppName,
        '--docker-custom-image-name', $normalizedImage,
        '--docker-registry-server-url', 'https://index.docker.io',
        '--only-show-errors',
        '--output', 'none'
    )
}

function Set-WebAppSettings {
    param([Parameter(Mandatory)][string[]] $Settings)

    $arguments = @(
        'webapp', 'config', 'appsettings', 'set',
        '--resource-group', $ResourceGroup,
        '--name', $WebAppName,
        '--settings'
    ) + $Settings + @('--only-show-errors', '--output', 'none')
    Invoke-NativeCommand az $arguments
}

function Remove-WebAppSettings {
    param([Parameter(Mandatory)][string[]] $Names)

    $arguments = @(
        'webapp', 'config', 'appsettings', 'delete',
        '--resource-group', $ResourceGroup,
        '--name', $WebAppName,
        '--setting-names'
    ) + $Names + @('--only-show-errors', '--output', 'none')
    Invoke-NativeCommand az $arguments
}

foreach ($target in @(
    @{ Actual = $SubscriptionId; Expected = $expectedSubscriptionId; Label = 'SubscriptionId' },
    @{ Actual = $ResourceGroup; Expected = $expectedResourceGroup; Label = 'ResourceGroup' },
    @{ Actual = $ServerName; Expected = $expectedServerName; Label = 'ServerName' },
    @{ Actual = $DatabaseName; Expected = $expectedDatabaseName; Label = 'DatabaseName' },
    @{ Actual = $WebAppName; Expected = $expectedWebAppName; Label = 'WebAppName' }
)) {
    if ($target.Actual -cne $target.Expected) {
        throw "$($target.Label) must be exactly '$($target.Expected)'."
    }
}

if ($Execute -and $Confirmation -cne $expectedConfirmation) {
    throw "Confirmation must be exactly '$expectedConfirmation'."
}

$resolvedImagesPath = (Resolve-Path -LiteralPath $ImagesPath).Path
$pngFiles = @(Get-ChildItem -LiteralPath $resolvedImagesPath -File -Filter '*.png')
if ($pngFiles.Count -lt 21) {
    throw "ImagesPath must contain the 21 required PNG files; only $($pngFiles.Count) PNG files were found."
}
if ($pngFiles.Count -gt 21) {
    Write-Host "$($pngFiles.Count - 21) additional PNG files will be ignored; the Dockerfile copies only the approved 21 names."
}

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$gitCommit = (Invoke-NativeCommand git @('rev-parse', 'HEAD') -Capture).Trim()
if ($gitCommit -notmatch '^[0-9a-f]{40}$') {
    throw 'Unable to resolve a full Git commit for the image metadata.'
}

if (-not $ImageTag) {
    $ImageTag = 'showcase-{0}-{1}' -f (Get-Date -Format 'yyyyMMdd-HHmmss'), $gitCommit.Substring(0, 7)
}

if ($ImageTag -notmatch '^showcase-[0-9]{8}-[0-9]{6}-[0-9a-f]{7,40}$') {
    throw 'ImageTag must match showcase-YYYYMMDD-HHMMSS-<7-to-40-lowercase-git-sha>.'
}

$baseImage = if ($ExistingValidatedBaseImage) { $ExistingValidatedBaseImage } else { "yazoo-api-base:$ImageTag" }
$showcaseImage = "${DockerHubRepository}:$ImageTag"

if (-not $BackupDirectory) {
    $localAppData = [Environment]::GetFolderPath([Environment+SpecialFolder]::LocalApplicationData)
    $BackupDirectory = Join-Path $localAppData 'Temp\YaZoo-showcase-reset'
}

Write-Host 'Azure YaZoo showcase reset plan:'
Write-Host "  Subscription: $SubscriptionId"
Write-Host "  Target: $ResourceGroup/$ServerName/$DatabaseName -> $WebAppName"
Write-Host "  Media: PRESERVED"
Write-Host "  Image: $showcaseImage"
Write-Host "  Backup directory: $BackupDirectory"

if (-not $Execute) {
    Write-Host 'DRY RUN ONLY: no image push, Azure mutation, database deletion or file creation was performed.'
    Write-Host "Re-run with -Execute and -Confirmation '$expectedConfirmation' after validation."
    exit 0
}

Invoke-NativeCommand az @('account', 'set', '--subscription', $SubscriptionId, '--only-show-errors')
$activeSubscription = Invoke-NativeCommand az @('account', 'show', '--query', 'id', '--output', 'tsv', '--only-show-errors') -Capture
if ($activeSubscription.Trim() -ne $SubscriptionId) {
    throw 'Azure CLI active subscription does not match the approved subscription.'
}

$repoStatus = Invoke-NativeCommand git @('status', '--short') -Capture
if ($repoStatus -match '(^|\r?\n)( D|D |RD|DR) ') {
    throw 'Deleted workspace files detected; reset deployment is refused.'
}

Set-Location $repoRoot
if ($ExistingValidatedBaseImage) {
    Invoke-NativeCommand docker @('image', 'inspect', $ExistingValidatedBaseImage, '--format', '{{.Id}}')
    Write-Host "Using explicitly selected validated local base image: $ExistingValidatedBaseImage"
} else {
    Invoke-NativeCommand docker @(
        'build',
        '--quiet',
        '--build-arg', "APP_VERSION=$ImageTag",
        '--tag', $baseImage,
        '--file', 'backend/Dockerfile',
        '.'
    )
}
Invoke-NativeCommand docker @(
    'build',
    '--quiet',
    '--build-arg', "BASE_IMAGE=$baseImage",
    '--build-context', "showcase_images=$resolvedImagesPath",
    '--tag', $showcaseImage,
    '--file', 'backend/Dockerfile.showcase',
    '.'
)

if (Test-DockerManifestExists $showcaseImage) {
    throw "The Docker Hub tag already exists and will not be overwritten: $showcaseImage"
}

$validationPassword = 'Validation-Only-Password-2026!'
$previousShowcasePassword = $env:YAZOO_SHOWCASE_PASSWORD
try {
    $env:YAZOO_SHOWCASE_PASSWORD = $validationPassword
    Invoke-NativeCommand docker @(
        'run', '--rm',
        '--entrypoint', 'php',
        '-e', 'APP_ENV=production',
        '-e', "APP_URL=$expectedAppUrl",
        '-e', 'DB_CONNECTION=mysql',
        '-e', "DB_HOST=$expectedDatabaseHost",
        '-e', "DB_DATABASE=$expectedDatabaseName",
        '-e', 'DB_USERNAME=validation-only',
        '-e', 'YAZOO_SHOWCASE_BOOTSTRAP_ENABLED=true',
        '-e', "YAZOO_SHOWCASE_CONFIRMATION=$expectedConfirmation",
        '-e', 'YAZOO_SHOWCASE_PASSWORD',
        '-e', 'YAZOO_SHOWCASE_MFA_SECRET=JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP',
        '-e', 'YAZOO_SHOWCASE_MFA_RECOVERY_CODES=ABCDE12345,ABCDE12346,ABCDE12347,ABCDE12348,ABCDE12349,ABCDE1234A,ABCDE1234B,ABCDE1234C',
        $showcaseImage,
        'artisan', 'yazoo:bootstrap-azure-showcase',
        "--images=/opt/yazoo-showcase-images",
        "--confirmation=$expectedConfirmation",
        '--dry-run'
    )
} finally {
    $env:YAZOO_SHOWCASE_PASSWORD = $previousShowcasePassword
}

Invoke-NativeCommand docker @('push', '--quiet', $showcaseImage)
Invoke-NativeCommand docker @('pull', '--quiet', $showcaseImage)
$repoDigestsJson = Invoke-NativeCommand docker @(
    'image', 'inspect', $showcaseImage,
    '--format', '{{json .RepoDigests}}'
) -Capture
$repoDigests = @($repoDigestsJson | ConvertFrom-Json)
$deployImage = $repoDigests | Where-Object { $_ -like "$DockerHubRepository@sha256:*" } | Select-Object -First 1
if (-not $deployImage) {
    throw 'Docker Hub push completed but no immutable repository digest could be resolved.'
}
Write-Host "Immutable image digest resolved: $deployImage"

$appJson = Invoke-NativeCommand az @(
    'webapp', 'show',
    '--resource-group', $ResourceGroup,
    '--name', $WebAppName,
    '--output', 'json',
    '--only-show-errors'
) -Capture
$app = $appJson | ConvertFrom-Json
if ($app.name -cne $WebAppName -or $app.defaultHostName -cne 'yazoo-api.azurewebsites.net') {
    throw 'The resolved Web App does not match the approved target.'
}

$serverJson = Invoke-NativeCommand az @(
    'mysql', 'flexible-server', 'show',
    '--resource-group', $ResourceGroup,
    '--name', $ServerName,
    '--output', 'json',
    '--only-show-errors'
) -Capture
$server = $serverJson | ConvertFrom-Json
if ($server.name -cne $ServerName -or $server.fullyQualifiedDomainName -cne $expectedDatabaseHost) {
    throw 'The resolved MySQL server does not match the approved target.'
}
if ([int] $server.backup.backupRetentionDays -lt 7) {
    throw 'Azure MySQL backup retention is lower than the approved seven-day safety baseline.'
}

$databaseNamesJson = Invoke-NativeCommand az @(
    'mysql', 'flexible-server', 'db', 'list',
    '--resource-group', $ResourceGroup,
    '--server-name', $ServerName,
    '--query', '[].name',
    '--output', 'json',
    '--only-show-errors'
) -Capture
$databaseNames = @($databaseNamesJson | ConvertFrom-Json)
if ($DatabaseName -notin $databaseNames) {
    throw "The approved database '$DatabaseName' does not currently exist."
}

$settingsJson = Invoke-NativeCommand az @(
    'webapp', 'config', 'appsettings', 'list',
    '--resource-group', $ResourceGroup,
    '--name', $WebAppName,
    '--output', 'json',
    '--only-show-errors'
) -Capture
$settings = @($settingsJson | ConvertFrom-Json)
$databaseHost = Get-AppSetting $settings 'DB_HOST'
$database = Get-AppSetting $settings 'DB_DATABASE'
$databaseUser = Get-AppSetting $settings 'DB_USERNAME'
$databasePasswordSetting = Get-AppSetting $settings 'DB_PASSWORD'
$appUrl = Get-AppSetting $settings 'APP_URL'

if ($databaseHost -cne $expectedDatabaseHost -or $database -cne $DatabaseName -or $appUrl -cne $expectedAppUrl) {
    throw 'Web App database or URL settings do not match the approved target.'
}
if (-not $databaseUser -or -not $databasePasswordSetting) {
    throw 'Required database credentials are not configured on the Web App.'
}

$databasePassword = Resolve-AppSettingSecret $databasePasswordSetting
if (-not $databasePassword) {
    throw 'The database password could not be resolved without exposing it.'
}

$previousImage = Invoke-NativeCommand az @(
    'webapp', 'config', 'container', 'show',
    '--resource-group', $ResourceGroup,
    '--name', $WebAppName,
    '--query', "[?name=='DOCKER_CUSTOM_IMAGE_NAME'].value | [0]",
    '--output', 'tsv',
    '--only-show-errors'
) -Capture
if (-not $previousImage) {
    throw 'Unable to capture the current Web App image for rollback.'
}

$managedSettingNames = @(
    'APP_VERSION',
    'YAZOO_RUN_MIGRATIONS',
    'YAZOO_RESET_RUNTIME_STATE',
    'YAZOO_RUN_SHOWCASE_BOOTSTRAP',
    'YAZOO_SHOWCASE_BOOTSTRAP_ENABLED',
    'YAZOO_SHOWCASE_CONFIRMATION',
    'YAZOO_SHOWCASE_APP_HOST',
    'YAZOO_SHOWCASE_DATABASE_HOST',
    'YAZOO_SHOWCASE_DATABASE_NAME',
    'YAZOO_SHOWCASE_IMAGES_PATH',
    'YAZOO_SHOWCASE_PASSWORD',
    'YAZOO_SHOWCASE_MFA_SECRET',
    'YAZOO_SHOWCASE_MFA_RECOVERY_CODES'
)
$originalManagedSettings = @{}
foreach ($name in $managedSettingNames) {
    $value = Get-AppSetting $settings $name
    if ($null -ne $value) {
        $originalManagedSettings[$name] = $value
    }
}

Protect-LocalDirectory $BackupDirectory
$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$backupFileName = "yazoo-azure-before-showcase-reset-$timestamp.sql"
$backupFile = Join-Path $BackupDirectory $backupFileName
$credentialFile = Join-Path $BackupDirectory "yazoo-showcase-credentials-$timestamp.txt"
$firewallRuleName = "yazoo-showcase-reset-$timestamp"
$publicIp = (Invoke-RestMethod -Uri 'https://api.ipify.org' -TimeoutSec 20).Trim()
if ($publicIp -notmatch '^(?:\d{1,3}\.){3}\d{1,3}$') {
    throw 'Unable to resolve a valid IPv4 address for the temporary MySQL firewall rule.'
}

$showcasePasswordBytes = New-Object byte[] 24
$randomGenerator = [Security.Cryptography.RandomNumberGenerator]::Create()
$randomGenerator.GetBytes($showcasePasswordBytes)
$showcasePassword = [Convert]::ToBase64String($showcasePasswordBytes) + 'aA1!'
$showcaseMfaRecoveryCodes = @()
for ($index = 0; $index -lt 8; $index++) {
    $recoveryBytes = New-Object byte[] 5
    $randomGenerator.GetBytes($recoveryBytes)
    $showcaseMfaRecoveryCodes += [BitConverter]::ToString($recoveryBytes).Replace('-', '')
}
$randomGenerator.Dispose()
$showcaseMfaSecret = (Invoke-NativeCommand docker @(
    'run', '--rm',
    '--entrypoint', 'php',
    $showcaseImage,
    '-r', "require '/var/www/html/vendor/autoload.php'; echo App\Support\Totp::secret();"
) -Capture).Trim()
if ($showcaseMfaSecret -notmatch '^[A-Z2-7]{32,64}$') {
    throw 'Unable to generate valid MFA bootstrap material inside the application image.'
}
$showcaseMfaRecoveryCodesSetting = $showcaseMfaRecoveryCodes -join ','
$firewallCreated = $false
$firewallCleanupFailed = $false
$appStopped = $false
$databaseDeleted = $false
$databaseReset = $false
$deploymentSucceeded = $false

try {
    Invoke-NativeCommand az @(
        'mysql', 'flexible-server', 'firewall-rule', 'create',
        '--resource-group', $ResourceGroup,
        '--name', $ServerName,
        '--rule-name', $firewallRuleName,
        '--start-ip-address', $publicIp,
        '--end-ip-address', $publicIp,
        '--only-show-errors',
        '--output', 'none'
    )
    $firewallCreated = $true

    Invoke-MySqlContainer @(
        'mysql',
        '--ssl-mode=REQUIRED',
        '--connect-timeout=15',
        "--host=$databaseHost",
        "--user=$databaseUser",
        '--execute=SELECT 1'
    ) $databaseHost $databaseUser $databasePassword $DatabaseName

    Invoke-NativeCommand az @(
        'webapp', 'stop',
        '--resource-group', $ResourceGroup,
        '--name', $WebAppName,
        '--only-show-errors',
        '--output', 'none'
    )
    $appStopped = $true

    Invoke-MySqlContainer @(
        'mysqldump',
        '--ssl-mode=REQUIRED',
        '--single-transaction',
        '--quick',
        '--routines',
        '--triggers',
        '--events',
        '--no-tablespaces',
        '--set-gtid-purged=OFF',
        "--host=$databaseHost",
        "--user=$databaseUser",
        "--result-file=/backup/$backupFileName",
        $DatabaseName
    ) $databaseHost $databaseUser $databasePassword $DatabaseName $BackupDirectory

    $backup = Get-Item -LiteralPath $backupFile
    if ($backup.Length -lt 1024) {
        throw 'The logical backup is unexpectedly small; database deletion is refused.'
    }
    Write-Host "Logical backup verified: $backupFile ($($backup.Length) bytes)."

    Set-WebAppImage $deployImage
    Set-WebAppSettings @(
        "APP_VERSION=$ImageTag",
        'YAZOO_RUN_MIGRATIONS=true',
        'YAZOO_RESET_RUNTIME_STATE=true',
        'YAZOO_RUN_SHOWCASE_BOOTSTRAP=true',
        'YAZOO_SHOWCASE_BOOTSTRAP_ENABLED=true',
        "YAZOO_SHOWCASE_CONFIRMATION=$expectedConfirmation",
        'YAZOO_SHOWCASE_APP_HOST=yazoo-api.azurewebsites.net',
        "YAZOO_SHOWCASE_DATABASE_HOST=$expectedDatabaseHost",
        "YAZOO_SHOWCASE_DATABASE_NAME=$DatabaseName",
        'YAZOO_SHOWCASE_IMAGES_PATH=/opt/yazoo-showcase-images',
        "YAZOO_SHOWCASE_PASSWORD=$showcasePassword",
        "YAZOO_SHOWCASE_MFA_SECRET=$showcaseMfaSecret",
        "YAZOO_SHOWCASE_MFA_RECOVERY_CODES=$showcaseMfaRecoveryCodesSetting"
    )

    Invoke-NativeCommand az @(
        'mysql', 'flexible-server', 'db', 'delete',
        '--resource-group', $ResourceGroup,
        '--server-name', $ServerName,
        '--database-name', $DatabaseName,
        '--yes',
        '--only-show-errors'
    )
    $databaseDeleted = $true
    Invoke-NativeCommand az @(
        'mysql', 'flexible-server', 'db', 'create',
        '--resource-group', $ResourceGroup,
        '--server-name', $ServerName,
        '--database-name', $DatabaseName,
        '--charset', 'utf8mb4',
        '--collation', 'utf8mb4_unicode_ci',
        '--only-show-errors',
        '--output', 'none'
    )
    $databaseReset = $true

    Invoke-NativeCommand az @(
        'webapp', 'start',
        '--resource-group', $ResourceGroup,
        '--name', $WebAppName,
        '--only-show-errors',
        '--output', 'none'
    )
    $appStopped = $false
    Wait-WebAppHealth "$expectedAppUrl/health/live"

    Invoke-MySqlContainer @(
        'mysql',
        '--ssl-mode=REQUIRED',
        "--host=$databaseHost",
        "--user=$databaseUser",
        '--batch', '--skip-column-names',
        '--execute=SELECT CONCAT("migrations=", COUNT(*)) FROM migrations; SELECT CONCAT("users=", COUNT(*)) FROM users; SELECT CONCAT("posts=", COUNT(*)) FROM posts; SELECT CONCAT("comments=", COUNT(*)) FROM comments; SELECT CONCAT("services=", COUNT(*)) FROM service_listings; SELECT CONCAT("reservations=", COUNT(*)) FROM reservations; SELECT CONCAT("payments=", COUNT(*)) FROM payments;'
    ) $databaseHost $databaseUser $databasePassword $DatabaseName

    Set-WebAppSettings @(
        "APP_VERSION=$ImageTag",
        'YAZOO_RUN_MIGRATIONS=false',
        'YAZOO_RESET_RUNTIME_STATE=false',
        'YAZOO_RUN_SHOWCASE_BOOTSTRAP=false',
        'YAZOO_SHOWCASE_BOOTSTRAP_ENABLED=false'
    )
    Remove-WebAppSettings @(
        'YAZOO_SHOWCASE_PASSWORD',
        'YAZOO_SHOWCASE_MFA_SECRET',
        'YAZOO_SHOWCASE_MFA_RECOVERY_CODES'
    )
    Invoke-NativeCommand az @(
        'webapp', 'restart',
        '--resource-group', $ResourceGroup,
        '--name', $WebAppName,
        '--only-show-errors',
        '--output', 'none'
    )
    Wait-WebAppHealth "$expectedAppUrl/health/live"

    $credentialContents = @(
        'YaZoo showcase credentials',
        "URL=$expectedAppUrl",
        'All showcase accounts use the same password listed below.',
        "PASSWORD=$showcasePassword",
        'ADMIN_EMAIL=bough.youssef@gmail.com',
        "ADMIN_MFA_SECRET=$showcaseMfaSecret",
        "ADMIN_MFA_RECOVERY_CODES=$showcaseMfaRecoveryCodesSetting",
        'CLIENT_EMAIL=client.fes@yazoo.test',
        'SOCIAL_CLIENT_EMAIL=imane.client@yazoo.ma'
    ) -join [Environment]::NewLine
    [IO.File]::WriteAllText($credentialFile, $credentialContents, [Text.UTF8Encoding]::new($false))
    Protect-LocalDirectory $BackupDirectory

    $deploymentSucceeded = $true
    Write-Host "Showcase reset completed. Credentials stored locally at: $credentialFile"
    Write-Host "Backup retained locally at: $backupFile"
} catch {
    Write-Warning "Showcase reset failed: $($_.Exception.Message)"

    if ($databaseDeleted -and (Test-Path -LiteralPath $backupFile)) {
        Write-Warning 'Attempting automatic database rollback from the verified logical backup.'
        $currentDatabasesJson = Invoke-NativeCommand az @(
            'mysql', 'flexible-server', 'db', 'list',
            '--resource-group', $ResourceGroup,
            '--server-name', $ServerName,
            '--query', '[].name',
            '--output', 'json',
            '--only-show-errors'
        ) -Capture
        $currentDatabases = @($currentDatabasesJson | ConvertFrom-Json)
        if ($DatabaseName -notin $currentDatabases) {
            Invoke-NativeCommand az @(
                'mysql', 'flexible-server', 'db', 'create',
                '--resource-group', $ResourceGroup,
                '--server-name', $ServerName,
                '--database-name', $DatabaseName,
                '--charset', 'utf8mb4',
                '--collation', 'utf8mb4_unicode_ci',
                '--only-show-errors',
                '--output', 'none'
            )
        }

        Invoke-MySqlContainer @(
            'sh', '-c',
            'mysql --ssl-mode=REQUIRED --host="$YAZOO_MYSQL_HOST" --user="$YAZOO_MYSQL_USER" "$YAZOO_MYSQL_DATABASE" < "/backup/' + $backupFileName + '"'
        ) $databaseHost $databaseUser $databasePassword $DatabaseName $BackupDirectory
    }

    try {
        Set-WebAppImage $previousImage
        Remove-WebAppSettings $managedSettingNames
        if ($originalManagedSettings.Count -gt 0) {
            $restoreSettings = @($originalManagedSettings.GetEnumerator() | ForEach-Object { "$($_.Key)=$($_.Value)" })
            Set-WebAppSettings $restoreSettings
        }
        Invoke-NativeCommand az @(
            'webapp', 'start',
            '--resource-group', $ResourceGroup,
            '--name', $WebAppName,
            '--only-show-errors',
            '--output', 'none'
        )
        $appStopped = $false
    } catch {
        Write-Warning 'Automatic application rollback also failed. Keep the backup and inspect Azure logs before any further mutation.'
    }

    throw
} finally {
    if ($firewallCreated) {
        try {
            Invoke-NativeCommand az @(
                'mysql', 'flexible-server', 'firewall-rule', 'delete',
                '--resource-group', $ResourceGroup,
                '--name', $ServerName,
                '--rule-name', $firewallRuleName,
                '--yes',
                '--only-show-errors',
                '--output', 'none'
            )
        } catch {
            $firewallCleanupFailed = $true
            Write-Warning "Temporary firewall rule cleanup failed: $firewallRuleName"
        }
    }

    $databasePassword = $null
    $showcasePassword = $null
    $showcaseMfaSecret = $null
    $showcaseMfaRecoveryCodes = $null
    $showcaseMfaRecoveryCodesSetting = $null
    $validationPassword = $null
    $env:YAZOO_SHOWCASE_PASSWORD = $previousShowcasePassword
}

if (-not $deploymentSucceeded) {
    throw 'Showcase reset did not reach the verified terminal state.'
}
if ($firewallCleanupFailed) {
    throw "Showcase reset succeeded, but temporary firewall cleanup failed: $firewallRuleName"
}
