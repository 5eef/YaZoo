#!/usr/bin/env pwsh
[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$repositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$resetScriptPath = Join-Path $repositoryRoot 'deploy/azure-showcase-reset.ps1'
$tokens = $null
$parseErrors = $null
[void] [Management.Automation.Language.Parser]::ParseFile(
    $resetScriptPath,
    [ref] $tokens,
    [ref] $parseErrors
)

if ($parseErrors.Count -gt 0) {
    throw "azure-showcase-reset.ps1 contains $($parseErrors.Count) PowerShell parse error(s)."
}

$source = [IO.File]::ReadAllText($resetScriptPath)
$requiredFragments = @(
    '"--database=$DatabaseName"',
    "CONCAT('migrations=', COUNT(*))"
)

foreach ($fragment in $requiredFragments) {
    if ($source.IndexOf($fragment, [StringComparison]::Ordinal) -lt 0) {
        throw "azure-showcase-reset.ps1 is missing required MySQL verification fragment: $fragment"
    }
}

if ($source.IndexOf('CONCAT("migrations=", COUNT(*))', [StringComparison]::Ordinal) -ge 0) {
    throw 'azure-showcase-reset.ps1 uses double-quoted SQL literals that are not stable through Windows Docker argument serialization.'
}

Write-Output 'azure-showcase-reset-guards=ok'
