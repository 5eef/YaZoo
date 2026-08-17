[CmdletBinding()]
param(
    [ValidateSet('Password', 'MfaSecret', 'AuthenticatorUri', 'RecoveryCodes')]
    [string] $Field = 'Password',
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

if (-not (Test-Path -LiteralPath $EnrollmentBundlePath -PathType Leaf)) {
    throw "Encrypted release-admin enrollment bundle not found: $EnrollmentBundlePath"
}

$encrypted = (Get-Content -LiteralPath $EnrollmentBundlePath -Raw).Trim()
$secureBundle = ConvertTo-SecureString $encrypted
$plainBundle = ConvertFrom-YazooSecureString $secureBundle

try {
    $bundle = $plainBundle | ConvertFrom-Json
    $value = switch ($Field) {
        'Password' { $bundle.password }
        'MfaSecret' { $bundle.mfa_secret }
        'AuthenticatorUri' { $bundle.authenticator_uri }
        'RecoveryCodes' { $bundle.recovery_codes -join [Environment]::NewLine }
    }

    if ([string]::IsNullOrWhiteSpace($value)) {
        throw "Credential field '$Field' is empty."
    }

    Set-Clipboard -Value $value
    Write-Host "$Field copied to the Windows clipboard. Its value was not printed."
}
finally {
    $value = $null
    $bundle = $null
    $plainBundle = $null
}
