[CmdletBinding()]
param(
    [string]$ProjectRoot = (Split-Path -Parent $PSScriptRoot),
    [string]$OutputDirectory = '',
    [string]$ArchiveName = 'yazoo-indh-source.zip'
)

$ErrorActionPreference = 'Stop'

if ([string]::IsNullOrWhiteSpace($OutputDirectory)) {
    $OutputDirectory = Join-Path $ProjectRoot 'exports\indh'
}

$resolvedProjectRoot = [System.IO.Path]::GetFullPath($ProjectRoot)
$resolvedOutputDirectory = [System.IO.Path]::GetFullPath($OutputDirectory)

if (-not (Test-Path -LiteralPath $resolvedProjectRoot -PathType Container)) {
    throw "Project root does not exist: $resolvedProjectRoot"
}

if ([System.IO.Path]::GetExtension($ArchiveName) -ne '.zip' -or
    [System.IO.Path]::GetFileName($ArchiveName) -ne $ArchiveName) {
    throw 'ArchiveName must be a simple .zip file name.'
}

New-Item -ItemType Directory -Path $resolvedOutputDirectory -Force | Out-Null
$archivePath = Join-Path $resolvedOutputDirectory $ArchiveName

if (Test-Path -LiteralPath $archivePath) {
    throw "Refusing to overwrite existing archive: $archivePath"
}

$allowedRoots = @(
    '.azure/',
    '.github/',
    'backend/',
    'deploy/',
    'docs/',
    'frontend/',
    'infra/',
    'scripts/'
)
$allowedTopLevelFiles = @(
    '.dockerignore',
    '.env.example',
    '.gitattributes',
    '.gitignore',
    'AGENTS.md',
    'LICENSE',
    'README.md',
    'docker-compose.yml',
    'policies.json',
    'sonar-project.properties'
)
$allowedExtensions = @(
    '.blade.php', '.css', '.dockerignore', '.env.example', '.example',
    '.gitattributes', '.gitignore', '.html', '.ini', '.js', '.jsx', '.json',
    '.lock', '.md', '.mjs', '.php', '.png', '.ps1', '.py', '.sh', '.svg',
    '.ts', '.tsx', '.txt', '.webp', '.xml', '.yaml', '.yml'
)
$forbiddenSegments = @(
    '/.git/',
    '/.scannerwork/',
    '/.tmp',
    '/backups/',
    '/cache/',
    '/coverage/',
    '/dist/',
    '/exports/',
    '/logs/',
    '/node_modules/',
    '/storage/app/private/',
    '/storage/framework/',
    '/test-results/',
    '/tmp-',
    '/vendor/'
)
$forbiddenFilePatterns = @(
    '(^|/)\.env($|\.)',
    '(^|/).*\.(bak|backup|db|dump|key|pem|pfx|sqlite|sqlite3|sql|tmp|zip)$',
    '(^|/)(credentials|secrets?|tokens?)(\.|/|$)',
    '(^|/)(id_rsa|id_ed25519)(\.|$)',
    '(^|/).*professional.*document',
    '(^|/)private[-_]?media'
)

function Convert-ToRelativePath {
    param([string]$Path)

    $rootWithSeparator = $resolvedProjectRoot.TrimEnd('\', '/') + [System.IO.Path]::DirectorySeparatorChar
    $rootUri = [System.Uri]::new($rootWithSeparator)
    $pathUri = [System.Uri]::new([System.IO.Path]::GetFullPath($Path))

    return [System.Uri]::UnescapeDataString(
        $rootUri.MakeRelativeUri($pathUri).ToString()
    ).Replace('\', '/')
}

function Test-IsForbiddenPath {
    param([string]$RelativePath)

    $normalized = '/' + $RelativePath.TrimStart('/')

    if ($RelativePath -match '(^|/)\.env($|\.)' -and
        $RelativePath -notmatch '(^|/)\.env(\.[^/]+)?\.example$' -and
        $RelativePath -notmatch '(^|/)\.env\.example$') {
        return $true
    }

    foreach ($segment in $forbiddenSegments) {
        if ($normalized.IndexOf($segment, [System.StringComparison]::OrdinalIgnoreCase) -ge 0) {
            return $true
        }
    }

    foreach ($pattern in $forbiddenFilePatterns) {
        if ($RelativePath -match $pattern) {
            if ($RelativePath -match '(^|/)\.env(\.[^/]+)?\.example$' -or
                $RelativePath -match '(^|/)\.env\.example$') {
                continue
            }

            return $true
        }
    }

    return $false
}

function Test-IsAllowedPath {
    param([string]$RelativePath)

    if (Test-IsForbiddenPath $RelativePath) {
        return $false
    }

    $isTopLevelAllowed = $allowedTopLevelFiles -contains $RelativePath
    $isAllowedRoot = $false

    foreach ($root in $allowedRoots) {
        if ($RelativePath.StartsWith($root, [System.StringComparison]::OrdinalIgnoreCase)) {
            $isAllowedRoot = $true
            break
        }
    }

    if (-not $isTopLevelAllowed -and -not $isAllowedRoot) {
        return $false
    }

    foreach ($extension in $allowedExtensions) {
        if ($RelativePath.EndsWith($extension, [System.StringComparison]::OrdinalIgnoreCase)) {
            return $true
        }
    }

    return $false
}

$gitDirectory = Join-Path $resolvedProjectRoot '.git'

if (Test-Path -LiteralPath $gitDirectory) {
    $trackedFiles = & git -C $resolvedProjectRoot ls-files

    if ($LASTEXITCODE -ne 0) {
        throw 'Unable to enumerate tracked files with git.'
    }

    $candidateFiles = $trackedFiles |
        ForEach-Object { Join-Path $resolvedProjectRoot $_ } |
        Where-Object { Test-Path -LiteralPath $_ -PathType Leaf }
} else {
    $candidateFiles = Get-ChildItem -LiteralPath $resolvedProjectRoot -File -Recurse |
        Select-Object -ExpandProperty FullName
}

$includedFiles = $candidateFiles |
    ForEach-Object {
        [PSCustomObject]@{
            FullPath = [System.IO.Path]::GetFullPath($_)
            RelativePath = Convert-ToRelativePath ([System.IO.Path]::GetFullPath($_))
        }
    } |
    Where-Object { Test-IsAllowedPath $_.RelativePath } |
    Sort-Object RelativePath -Unique

if ($includedFiles.Count -eq 0) {
    throw 'No eligible source files were found for the INDH export.'
}

$stagingRoot = Join-Path $resolvedOutputDirectory ('.staging-' + [guid]::NewGuid().ToString('N'))
$stagingRoot = [System.IO.Path]::GetFullPath($stagingRoot)

if (-not $stagingRoot.StartsWith($resolvedOutputDirectory + [System.IO.Path]::DirectorySeparatorChar)) {
    throw 'Unsafe staging path.'
}

try {
    New-Item -ItemType Directory -Path $stagingRoot | Out-Null

    foreach ($file in $includedFiles) {
        $destination = Join-Path $stagingRoot $file.RelativePath
        $destinationDirectory = Split-Path -Parent $destination
        New-Item -ItemType Directory -Path $destinationDirectory -Force | Out-Null
        Copy-Item -LiteralPath $file.FullPath -Destination $destination
    }

    $manifestPath = Join-Path $stagingRoot 'INDH_EXPORT_MANIFEST.txt'
    @(
        'YaZoo INDH source export manifest'
        "File count: $($includedFiles.Count)"
        ''
        $includedFiles.RelativePath
    ) | Set-Content -LiteralPath $manifestPath -Encoding utf8

    Compress-Archive -Path (Join-Path $stagingRoot '*') -DestinationPath $archivePath

    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $zip = [System.IO.Compression.ZipFile]::OpenRead($archivePath)

    try {
        $entryNames = $zip.Entries |
            Where-Object { -not [string]::IsNullOrWhiteSpace($_.Name) } |
            ForEach-Object { $_.FullName.Replace('\', '/') }

        foreach ($entryName in $entryNames) {
            if (Test-IsForbiddenPath $entryName) {
                throw "Forbidden file detected after ZIP creation: $entryName"
            }
        }

        if ($entryNames -notcontains 'INDH_EXPORT_MANIFEST.txt') {
            throw 'The generated ZIP does not contain its manifest.'
        }
    } finally {
        $zip.Dispose()
    }
} catch {
    if (Test-Path -LiteralPath $archivePath) {
        Remove-Item -LiteralPath $archivePath -Force
    }

    throw
} finally {
    if (Test-Path -LiteralPath $stagingRoot) {
        Remove-Item -LiteralPath $stagingRoot -Recurse -Force
    }
}

Write-Output $archivePath
