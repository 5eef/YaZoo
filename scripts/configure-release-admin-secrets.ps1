[CmdletBinding()]
param(
    [string] $Environment = 'production',
    [string] $AdministratorName,
    [string] $AdministratorEmail,
    [switch] $GenerateCredentials,
    [string] $EnrollmentBundlePath = (Join-Path $env:LOCALAPPDATA 'YaZoo\release-admin-enrollment.dpapi')
)

$ErrorActionPreference = 'Stop'

function ConvertFrom-YazooSecureString {
    param([Parameter(Mandatory)] [SecureString] $Value)

    $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($Value)
    try {
        return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
    }
    finally {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
    }
}

function New-YazooMfaSecret {
    $alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
    $bytes = New-Object byte[] 32
    $random = [Security.Cryptography.RandomNumberGenerator]::Create()
    try {
        $random.GetBytes($bytes)
        return -join ($bytes | ForEach-Object { $alphabet[$_ % $alphabet.Length] })
    }
    finally {
        [Array]::Clear($bytes, 0, $bytes.Length)
        $random.Dispose()
    }
}

function New-YazooRecoveryCode {
    $bytes = New-Object byte[] 5
    $random = [Security.Cryptography.RandomNumberGenerator]::Create()
    try {
        $random.GetBytes($bytes)
        return ([BitConverter]::ToString($bytes)).Replace('-', '')
    }
    finally {
        [Array]::Clear($bytes, 0, $bytes.Length)
        $random.Dispose()
    }
}

function New-YazooPassword {
    $alphabet = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%_-+='
    $random = [Security.Cryptography.RandomNumberGenerator]::Create()
    try {
        do {
            $bytes = New-Object byte[] 24
            $random.GetBytes($bytes)
            $candidate = -join ($bytes | ForEach-Object { $alphabet[$_ % $alphabet.Length] })
        } until (
            $candidate -cmatch '[a-z]' -and
            $candidate -cmatch '[A-Z]' -and
            $candidate -match '[0-9]' -and
            $candidate -match '[^a-zA-Z0-9]'
        )

        return $candidate
    }
    finally {
        if ($bytes) {
            [Array]::Clear($bytes, 0, $bytes.Length)
        }
        $random.Dispose()
    }
}

function Set-YazooGitHubSecret {
    param(
        [Parameter(Mandatory)] [string] $Name,
        [Parameter(Mandatory)] [string] $Value
    )

    $startInfo = [Diagnostics.ProcessStartInfo]::new()
    $startInfo.FileName = 'gh'
    $startInfo.UseShellExecute = $false
    $startInfo.RedirectStandardInput = $true
    $startInfo.RedirectStandardOutput = $true
    $startInfo.RedirectStandardError = $true
    if ($Name -notmatch '^[A-Z0-9_]+$' -or $Environment -notmatch '^[a-zA-Z0-9_-]+$') {
        throw 'Unsafe GitHub secret name or environment.'
    }
    $startInfo.Arguments = "secret set $Name --env $Environment"

    $process = [Diagnostics.Process]::new()
    $process.StartInfo = $startInfo
    if (-not $process.Start()) {
        throw "Unable to start GitHub CLI for $Name."
    }
    $process.StandardInput.Write($Value)
    $process.StandardInput.Close()
    $process.WaitForExit()
    $errorOutput = $process.StandardError.ReadToEnd()

    if ($process.ExitCode -ne 0) {
        throw "GitHub rejected secret ${Name}: $errorOutput"
    }
}

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
    throw 'GitHub CLI (gh) is required.'
}

& gh auth status
if ($LASTEXITCODE -ne 0) {
    throw 'Authenticate GitHub CLI before configuring release secrets.'
}

if ($GenerateCredentials) {
    $adminName = $AdministratorName.Trim()
    $adminEmail = $AdministratorEmail.Trim().ToLowerInvariant()
    $password = New-YazooPassword
    $passwordConfirmation = $password
}
else {
    $adminName = (Read-Host 'Release administrator name').Trim()
    $adminEmail = (Read-Host 'Release administrator email').Trim().ToLowerInvariant()
    $passwordSecure = Read-Host 'Release administrator password (16+ chars, upper/lower/number/symbol)' -AsSecureString
    $passwordConfirmationSecure = Read-Host 'Confirm release administrator password' -AsSecureString
    $password = ConvertFrom-YazooSecureString $passwordSecure
    $passwordConfirmation = ConvertFrom-YazooSecureString $passwordConfirmationSecure
}

if ([string]::IsNullOrWhiteSpace($adminName)) {
    throw 'Administrator name is required.'
}
if ($adminEmail -notmatch '^[^\s@]+@[^\s@]+\.[^\s@]+$') {
    throw 'Administrator email is invalid.'
}
if ($password -cne $passwordConfirmation) {
    throw 'Password confirmation does not match.'
}
if (
    $password.Length -lt 16 -or
    $password -cnotmatch '[a-z]' -or
    $password -cnotmatch '[A-Z]' -or
    $password -notmatch '[0-9]' -or
    $password -notmatch '[^a-zA-Z0-9]'
) {
    throw 'Administrator password does not satisfy the production policy.'
}

$mfaSecret = New-YazooMfaSecret
$recoveryCodes = 1..8 | ForEach-Object { New-YazooRecoveryCode }
$recoveryCodesSetting = $recoveryCodes -join ','

Set-YazooGitHubSecret 'YAZOO_RELEASE_ADMIN_NAME' $adminName
Set-YazooGitHubSecret 'YAZOO_RELEASE_ADMIN_EMAIL' $adminEmail
Set-YazooGitHubSecret 'YAZOO_RELEASE_ADMIN_PASSWORD' $password
Set-YazooGitHubSecret 'YAZOO_RELEASE_ADMIN_MFA_SECRET' $mfaSecret
Set-YazooGitHubSecret 'YAZOO_RELEASE_ADMIN_MFA_RECOVERY_CODES' $recoveryCodesSetting

$issuer = [Uri]::EscapeDataString('YaZoo')
$label = [Uri]::EscapeDataString("YaZoo:$adminEmail")
$otpAuthUri = "otpauth://totp/${label}?secret=${mfaSecret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30"

Write-Host ''
Write-Host "GitHub environment '$Environment' now contains the five guarded release-admin secrets."
if ($GenerateCredentials) {
    $bundleDirectory = Split-Path -Parent $EnrollmentBundlePath
    New-Item -ItemType Directory -Path $bundleDirectory -Force | Out-Null
    $bundle = [ordered]@{
        environment = $Environment
        administrator_name = $adminName
        administrator_email = $adminEmail
        password = $password
        mfa_secret = $mfaSecret
        authenticator_uri = $otpAuthUri
        recovery_codes = $recoveryCodes
        created_at = [DateTimeOffset]::Now.ToString('o')
    } | ConvertTo-Json -Compress
    $bundleSecure = ConvertTo-SecureString $bundle -AsPlainText -Force
    ConvertFrom-SecureString $bundleSecure | Set-Content -LiteralPath $EnrollmentBundlePath -Encoding ASCII
    Set-Clipboard -Value $password

    Write-Host 'Generated credentials were not printed.'
    Write-Host "The password is in the Windows clipboard. The MFA enrollment bundle is DPAPI-encrypted at: $EnrollmentBundlePath"
}
else {
    Write-Warning 'Store the following MFA enrollment material now. It is shown once and is not written to the repository.'
    Write-Host "MFA secret: $mfaSecret"
    Write-Host "Authenticator URI: $otpAuthUri"
    Write-Host 'Recovery codes:'
    $recoveryCodes | ForEach-Object { Write-Host "  $_" }
}

$bundle = $null
$password = $null
$passwordConfirmation = $null
