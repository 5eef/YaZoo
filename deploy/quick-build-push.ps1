#!/usr/bin/env pwsh
[CmdletBinding(SupportsShouldProcess)]
param(
    [Parameter(Mandatory)][string] $DockerHubUser,
    [string] $DockerHubRepository = '',
    [ValidateSet('backend', 'frontend')][string] $App = 'backend',
    [Parameter(Mandatory)][ValidatePattern('^[0-9a-f]{40}$')][string] $Tag,
    [string] $FrontendApiUrl = 'https://yazoo-api.azurewebsites.net/api',
    [string] $FrontendStorageUrl = 'https://yazoo-api.azurewebsites.net/storage',
    [switch] $AlsoTagLatest,
    [switch] $SkipDockerHubLogin
)

$ErrorActionPreference = 'Stop'

function Invoke-NativeCommand {
    param([string] $FilePath, [string[]] $Arguments)

    Write-Host ("Running: {0} {1}" -f $FilePath, ($Arguments -join ' '))
    if ($WhatIfPreference) {
        return
    }

    & $FilePath @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "$FilePath failed with exit code $LASTEXITCODE."
    }
}

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Set-Location $repoRoot

$imageName = if ($DockerHubRepository) {
    $DockerHubRepository
} elseif ($App -eq 'frontend') {
    'yazoo-frontend'
} else {
    'yazoo-api'
}
$immutableImage = "$DockerHubUser/${imageName}:$Tag"
$buildArguments = @(
    'build',
    '--build-arg', "APP_VERSION=$Tag",
    '-t', $immutableImage,
    '-f', "$App/Dockerfile"
)

if ($App -eq 'frontend') {
    $buildArguments += @(
        '--build-arg', "VITE_API_URL=$FrontendApiUrl",
        '--build-arg', "VITE_STORAGE_URL=$FrontendStorageUrl"
    )
}
if ($AlsoTagLatest) {
    $buildArguments += @('-t', "$DockerHubUser/${imageName}:latest")
}
$buildArguments += '.'

Invoke-NativeCommand docker $buildArguments

if (-not $SkipDockerHubLogin) {
    Invoke-NativeCommand docker @('login', '--username', $DockerHubUser)
}

Invoke-NativeCommand docker @('push', $immutableImage)
if ($AlsoTagLatest) {
    Invoke-NativeCommand docker @('push', "$DockerHubUser/${imageName}:latest")
}

Write-Host "Immutable image pushed: $immutableImage"
