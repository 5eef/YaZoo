[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$testRoot = Join-Path ([System.IO.Path]::GetTempPath()) ('yazoo-indh-test-' + [guid]::NewGuid().ToString('N'))
$testRoot = [System.IO.Path]::GetFullPath($testRoot)
$expectedTempRoot = [System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath())

if (-not $testRoot.StartsWith($expectedTempRoot)) {
    throw 'Unsafe test directory.'
}

try {
    New-Item -ItemType Directory -Path (Join-Path $testRoot 'backend\app') -Force | Out-Null
    New-Item -ItemType Directory -Path (Join-Path $testRoot 'frontend\src') -Force | Out-Null
    New-Item -ItemType Directory -Path (Join-Path $testRoot 'frontend\node_modules') -Force | Out-Null
    New-Item -ItemType Directory -Path (Join-Path $testRoot 'backend\storage\app\private') -Force | Out-Null
    New-Item -ItemType Directory -Path (Join-Path $testRoot 'exports') -Force | Out-Null

    Set-Content -LiteralPath (Join-Path $testRoot 'README.md') -Value '# Fixture'
    Set-Content -LiteralPath (Join-Path $testRoot 'backend\app\Example.php') -Value '<?php'
    Set-Content -LiteralPath (Join-Path $testRoot 'frontend\src\main.js') -Value 'export {}'
    Set-Content -LiteralPath (Join-Path $testRoot '.env') -Value 'SECRET_SHOULD_NOT_BE_READ'
    Set-Content -LiteralPath (Join-Path $testRoot 'frontend\node_modules\ignored.js') -Value 'ignored'
    Set-Content -LiteralPath (Join-Path $testRoot 'backend\storage\app\private\document.pdf') -Value 'private'
    Set-Content -LiteralPath (Join-Path $testRoot 'backup.sql') -Value 'private'

    $outputDirectory = Join-Path $testRoot 'exports\indh'
    $archivePath = & (Join-Path $PSScriptRoot 'export-indh.ps1') `
        -ProjectRoot $testRoot `
        -OutputDirectory $outputDirectory `
        -ArchiveName 'fixture.zip'

    if (-not (Test-Path -LiteralPath $archivePath -PathType Leaf)) {
        throw 'Expected archive was not created.'
    }

    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $zip = [System.IO.Compression.ZipFile]::OpenRead($archivePath)

    try {
        $entries = @($zip.Entries | ForEach-Object { $_.FullName.Replace('\', '/') })
        $required = @(
            'README.md',
            'backend/app/Example.php',
            'frontend/src/main.js',
            'INDH_EXPORT_MANIFEST.txt'
        )

        foreach ($requiredEntry in $required) {
            if ($entries -notcontains $requiredEntry) {
                throw "Missing required fixture entry: $requiredEntry"
            }
        }

        foreach ($forbiddenFragment in @('.env', 'node_modules', 'storage/app/private', '.sql')) {
            if ($entries -match [regex]::Escape($forbiddenFragment)) {
                throw "Forbidden fixture entry was exported: $forbiddenFragment"
            }
        }
    } finally {
        $zip.Dispose()
    }

    $collisionWasRejected = $false

    try {
        & (Join-Path $PSScriptRoot 'export-indh.ps1') `
            -ProjectRoot $testRoot `
            -OutputDirectory $outputDirectory `
            -ArchiveName 'fixture.zip' | Out-Null
    } catch {
        $collisionWasRejected = $true
    }

    if (-not $collisionWasRejected) {
        throw 'Existing archive collision was not rejected.'
    }

    Write-Output 'INDH export self-test passed.'
} finally {
    if (Test-Path -LiteralPath $testRoot) {
        Remove-Item -LiteralPath $testRoot -Recurse -Force
    }
}
