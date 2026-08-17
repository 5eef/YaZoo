[CmdletBinding()]
param(
    [string] $Environment = 'production',
    [string] $Repository = 'Seef590/YaZoo',
    [switch] $UseRepositoryScope
)

$ErrorActionPreference = 'Stop'
$script:YazooUseRepositorySecrets = $UseRepositoryScope.IsPresent

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

function Set-YazooGitHubSecret {
    param(
        [Parameter(Mandatory)] [string] $Name,
        [Parameter(Mandatory)] [string] $Value
    )

    if (
        $Name -notmatch '^[A-Z0-9_]+$' -or
        $Environment -notmatch '^[a-zA-Z0-9_-]+$' -or
        $Repository -notmatch '^[a-zA-Z0-9_.-]+/[a-zA-Z0-9_.-]+$'
    ) {
        throw 'Unsafe GitHub secret name, environment, or repository.'
    }

    if ($script:YazooUseRepositorySecrets) {
        $repositoryStartInfo = [Diagnostics.ProcessStartInfo]::new()
        $repositoryStartInfo.FileName = 'gh'
        $repositoryStartInfo.UseShellExecute = $false
        $repositoryStartInfo.RedirectStandardInput = $true
        $repositoryStartInfo.RedirectStandardOutput = $true
        $repositoryStartInfo.RedirectStandardError = $true
        $repositoryStartInfo.Arguments = "secret set $Name --repo $Repository"
        $repositoryProcess = [Diagnostics.Process]::new()
        $repositoryProcess.StartInfo = $repositoryStartInfo
        if (-not $repositoryProcess.Start()) {
            throw "Unable to start GitHub CLI repository fallback for $Name."
        }
        $repositoryProcess.StandardInput.Write($Value)
        $repositoryProcess.StandardInput.Close()
        $repositoryOutput = $repositoryProcess.StandardOutput.ReadToEnd()
        $repositoryError = $repositoryProcess.StandardError.ReadToEnd()
        $repositoryProcess.WaitForExit()
        if ($repositoryProcess.ExitCode -ne 0) {
            throw "GitHub rejected repository fallback secret ${Name}: $repositoryError"
        }
        return
    }

    for ($attempt = 1; $attempt -le 5; $attempt++) {
        $startInfo = [Diagnostics.ProcessStartInfo]::new()
        $startInfo.FileName = 'gh'
        $startInfo.UseShellExecute = $false
        $startInfo.RedirectStandardInput = $true
        $startInfo.RedirectStandardOutput = $true
        $startInfo.RedirectStandardError = $true
        $startInfo.Arguments = "secret set $Name --env $Environment --repo $Repository"

        $process = [Diagnostics.Process]::new()
        $process.StartInfo = $startInfo
        if (-not $process.Start()) {
            throw "Unable to start GitHub CLI for $Name."
        }

        $process.StandardInput.Write($Value)
        $process.StandardInput.Close()
        $standardOutput = $process.StandardOutput.ReadToEnd()
        $errorOutput = $process.StandardError.ReadToEnd()
        $process.WaitForExit()
        if ($process.ExitCode -eq 0) {
            return
        }

        $combinedOutput = "$standardOutput`n$errorOutput"
        $isTransient = $combinedOutput -match 'HTTP (429|500|502|503|504)' -or
            $combinedOutput -match 'No server is currently available' -or
            $combinedOutput -match 'temporarily unavailable'
        if (-not $isTransient) {
            throw "GitHub rejected secret ${Name} after $attempt attempt(s): $errorOutput"
        }

        if ($attempt -eq 5) {
            Write-Warning 'The GitHub environment-secret endpoint is unavailable. Falling back to encrypted repository secrets.'

            $startInfo.Arguments = "secret set $Name --repo $Repository"
            $fallbackProcess = [Diagnostics.Process]::new()
            $fallbackProcess.StartInfo = $startInfo
            if (-not $fallbackProcess.Start()) {
                throw "Unable to start GitHub CLI repository fallback for $Name."
            }

            $fallbackProcess.StandardInput.Write($Value)
            $fallbackProcess.StandardInput.Close()
            $fallbackOutput = $fallbackProcess.StandardOutput.ReadToEnd()
            $fallbackError = $fallbackProcess.StandardError.ReadToEnd()
            $fallbackProcess.WaitForExit()
            if ($fallbackProcess.ExitCode -ne 0) {
                throw "GitHub rejected repository fallback secret ${Name}: $fallbackError"
            }

            $script:YazooUseRepositorySecrets = $true
            Write-Warning "Secret $Name was stored at repository scope because the production environment endpoint remained unavailable."
            return
        }

        $delaySeconds = $attempt * 5
        Write-Warning "GitHub is temporarily unavailable (attempt $attempt/5). Retrying in $delaySeconds seconds."
        Start-Sleep -Seconds $delaySeconds
    }
}

function Read-YazooRequiredValue {
    param([Parameter(Mandatory)] [string] $Prompt)

    $value = (Read-Host $Prompt).Trim()
    if ([string]::IsNullOrWhiteSpace($value) -or $value -match '[\r\n]') {
        throw "$Prompt is required and must use one line."
    }

    return $value
}

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
    throw 'GitHub CLI (gh) is required.'
}

& gh auth status
if ($LASTEXITCODE -ne 0) {
    throw 'Authenticate GitHub CLI before configuring production secrets.'
}

$values = [ordered]@{
    YAZOO_PRODUCTION_LEGAL_STATUS = Read-YazooRequiredValue 'Official legal status'
    YAZOO_PRODUCTION_LEGAL_ADDRESS = Read-YazooRequiredValue 'Official legal address'
    YAZOO_PRODUCTION_LEGAL_ICE = Read-YazooRequiredValue 'Official ICE identifier'
    YAZOO_PRODUCTION_PRIVACY_CONTACT_EMAIL = Read-YazooRequiredValue 'Privacy contact email'
    YAZOO_PRODUCTION_CONTACT_RECIPIENT = Read-YazooRequiredValue 'Contact form recipient email'
    YAZOO_PRODUCTION_MAIL_HOST = Read-YazooRequiredValue 'SMTP host'
    YAZOO_PRODUCTION_MAIL_PORT = Read-YazooRequiredValue 'SMTP port'
    YAZOO_PRODUCTION_MAIL_USERNAME = Read-YazooRequiredValue 'SMTP username'
    YAZOO_PRODUCTION_MAIL_FROM_ADDRESS = Read-YazooRequiredValue 'SMTP from email'
}

$mailPasswordSecure = Read-Host 'SMTP password or provider app password' -AsSecureString
$mailPassword = ConvertFrom-YazooSecureString $mailPasswordSecure

if ($values.YAZOO_PRODUCTION_LEGAL_STATUS -match 'example\.com' -or $values.YAZOO_PRODUCTION_LEGAL_ADDRESS -match 'example\.com' -or $values.YAZOO_PRODUCTION_LEGAL_ICE -match 'example\.com') {
    throw 'Legal production values must not use placeholders.'
}
foreach ($emailName in @(
    'YAZOO_PRODUCTION_PRIVACY_CONTACT_EMAIL',
    'YAZOO_PRODUCTION_CONTACT_RECIPIENT',
    'YAZOO_PRODUCTION_MAIL_FROM_ADDRESS'
)) {
    if ($values[$emailName] -notmatch '^[^\s@]+@[^\s@]+\.[^\s@]+$') {
        throw "$emailName is not a valid email address."
    }
}
if ($values.YAZOO_PRODUCTION_MAIL_PORT -notmatch '^[0-9]+$' -or [int] $values.YAZOO_PRODUCTION_MAIL_PORT -lt 1 -or [int] $values.YAZOO_PRODUCTION_MAIL_PORT -gt 65535) {
    throw 'SMTP port must be between 1 and 65535.'
}
if ([string]::IsNullOrWhiteSpace($mailPassword)) {
    throw 'SMTP password is required.'
}

$values.YAZOO_PRODUCTION_MAIL_PASSWORD = $mailPassword
foreach ($entry in $values.GetEnumerator()) {
    Set-YazooGitHubSecret $entry.Key ([string] $entry.Value)
}

$mailPassword = $null
$values.Clear()
Write-Host 'GitHub now contains the guarded production legal and SMTP secrets for the release workflow.'
if ($script:YazooUseRepositorySecrets) {
    Write-Warning 'The secrets are stored at repository scope. Move them to the production environment when that GitHub endpoint is available again.'
}
