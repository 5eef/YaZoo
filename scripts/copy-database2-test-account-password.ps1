[CmdletBinding()]
param(
    [string] $EnrollmentBundlePath = (Join-Path $env:LOCALAPPDATA 'YaZoo\database2-test-accounts.dpapi')
)

$ErrorActionPreference = 'Stop'

if (-not (Test-Path -LiteralPath $EnrollmentBundlePath -PathType Leaf)) {
    throw "DATABASE #2 test-account enrollment bundle not found: $EnrollmentBundlePath"
}

$encrypted = Get-Content -Raw -LiteralPath $EnrollmentBundlePath
$secure = ConvertTo-SecureString $encrypted
$pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
try {
    $json = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
    $bundle = $json | ConvertFrom-Json
    if ([string]::IsNullOrWhiteSpace([string] $bundle.password)) {
        throw 'DATABASE #2 test-account bundle does not contain a password.'
    }

    Set-Clipboard -Value ([string] $bundle.password)
    Write-Host 'DATABASE #2 test-account password copied to the Windows clipboard.'
}
finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
    $json = $null
    $bundle = $null
}
