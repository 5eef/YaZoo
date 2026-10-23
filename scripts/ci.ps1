param(
    [switch] $SkipSonar
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot

function Invoke-QualityGate {
    param([string] $Executable, [string[]] $GateArguments)
    & $Executable @GateArguments
    if ($LASTEXITCODE -ne 0) {
        throw "Quality gate failed: $Executable $($GateArguments -join ' ') (exit $LASTEXITCODE)"
    }
}

Push-Location "$Root\backend"
try {
    Invoke-QualityGate composer @('validate', '--strict')
    Invoke-QualityGate composer @('install', '--no-interaction', '--prefer-dist', '--no-progress')
    Invoke-QualityGate composer @('audit', '--no-interaction')
    Invoke-QualityGate php @('artisan', 'test')
    Invoke-QualityGate php @('vendor/bin/pint', '--test')
    Invoke-QualityGate composer @('test:coverage')
} finally {
    Pop-Location
}

Push-Location "$Root\frontend"
try {
    Invoke-QualityGate npm.cmd @('ci')
    Invoke-QualityGate npm.cmd @('audit', '--omit=dev')
    Invoke-QualityGate node @('../scripts/audit-dependency-policy.mjs', 'frontend')
    Invoke-QualityGate npm.cmd @('run', 'lint')
    Invoke-QualityGate npm.cmd @('run', 'typecheck')
    Invoke-QualityGate npm.cmd @('run', 'audit:i18n')
    Invoke-QualityGate npm.cmd @('run', 'test:coverage')
    Invoke-QualityGate npm.cmd @('run', 'build')
    Invoke-QualityGate npm.cmd @('run', 'audit:tailwind')
    Invoke-QualityGate npm.cmd @('run', 'test:e2e')
} finally {
    Pop-Location
}

Push-Location "$Root\mobile"
try {
    Invoke-QualityGate npm.cmd @('ci')
    Invoke-QualityGate npx.cmd @('expo', 'install', '--check')
    Invoke-QualityGate npx.cmd @('expo-doctor')
    Invoke-QualityGate npm.cmd @('run', 'lint')
    Invoke-QualityGate npm.cmd @('run', 'typecheck')
    Invoke-QualityGate npm.cmd @('test')
    Invoke-QualityGate npx.cmd @('expo', 'export', '--platform', 'android', '--source-maps')
    Invoke-QualityGate node @('../scripts/audit-dependency-policy.mjs', 'mobile')
} finally {
    Pop-Location
}

if (-not $SkipSonar) {
    & "$PSScriptRoot\run-sonar.ps1"
}
