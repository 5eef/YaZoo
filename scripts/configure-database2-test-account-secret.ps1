[CmdletBinding()]
param(
    [string] $Environment = 'production',
    [string] $Repository = '5eef/YaZoo',
    [switch] $UseRepositoryScope,
    [string] $EnrollmentBundlePath = (Join-Path $env:LOCALAPPDATA 'YaZoo\database2-test-accounts.dpapi')
)

$ErrorActionPreference = 'Stop'

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

    if (
        $Name -notmatch '^[A-Z0-9_]+$' -or
        $Environment -notmatch '^[a-zA-Z0-9_-]+$' -or
        $Repository -notmatch '^[a-zA-Z0-9_.-]+/[a-zA-Z0-9_.-]+$'
    ) {
        throw 'Unsafe GitHub secret name, environment, or repository.'
    }

    if ($UseRepositoryScope) {
        $startInfo = [Diagnostics.ProcessStartInfo]::new()
        $startInfo.FileName = 'gh'
        $startInfo.UseShellExecute = $false
        $startInfo.RedirectStandardInput = $true
        $startInfo.RedirectStandardOutput = $true
        $startInfo.RedirectStandardError = $true
        $startInfo.Arguments = "secret set $Name --repo $Repository"
        $process = [Diagnostics.Process]::new()
        $process.StartInfo = $startInfo
        if (-not $process.Start()) {
            throw "Unable to start GitHub CLI repository secret writer for $Name."
        }
        $process.StandardInput.Write($Value)
        $process.StandardInput.Close()
        $standardOutput = $process.StandardOutput.ReadToEnd()
        $errorOutput = $process.StandardError.ReadToEnd()
        $process.WaitForExit()
        if ($process.ExitCode -ne 0) {
            throw "GitHub rejected repository secret ${Name}: $errorOutput"
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
            Write-Warning "The GitHub environment-secret endpoint is unavailable. Falling back to an encrypted repository secret."

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

            Write-Warning "Secret $Name was stored at repository scope because the production environment endpoint remained unavailable."
            return
        }

        $delaySeconds = $attempt * 5
        Write-Warning "GitHub is temporarily unavailable (attempt $attempt/5). Retrying in $delaySeconds seconds."
        Start-Sleep -Seconds $delaySeconds
    }
}

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
    throw 'GitHub CLI (gh) is required.'
}

& gh auth status
if ($LASTEXITCODE -ne 0) {
    throw 'Authenticate GitHub CLI before configuring the DATABASE #2 test account secret.'
}

$password = New-YazooPassword
Set-YazooGitHubSecret 'YAZOO_DATABASE2_TEST_ACCOUNT_PASSWORD' $password

$bundleDirectory = Split-Path -Parent $EnrollmentBundlePath
New-Item -ItemType Directory -Path $bundleDirectory -Force | Out-Null
$bundle = [ordered]@{
    environment = $Environment
    purpose = 'DATABASE #2 shared non-admin test account password'
    password = $password
    created_at = [DateTimeOffset]::Now.ToString('o')
} | ConvertTo-Json -Compress
$bundleSecure = ConvertTo-SecureString $bundle -AsPlainText -Force
ConvertFrom-SecureString $bundleSecure | Set-Content -LiteralPath $EnrollmentBundlePath -Encoding ASCII

Write-Host 'GitHub now contains YAZOO_DATABASE2_TEST_ACCOUNT_PASSWORD for the release workflow.'
if ($UseRepositoryScope) {
    Write-Warning 'The secret is stored at repository scope. Move it to the production environment when that GitHub endpoint is available again.'
}
Write-Host 'The generated password was not printed or copied to the clipboard.'
Write-Host "Its DPAPI-encrypted enrollment bundle is stored at: $EnrollmentBundlePath"

$bundle = $null
$password = $null
