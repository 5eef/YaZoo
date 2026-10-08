[CmdletBinding()]
param(
    [switch] $Quiet,
    [switch] $SkipFreshMySqlBackup
)

$ErrorActionPreference = 'Stop'
. "$PSScriptRoot\BackupCommon.ps1"

$repoRoot = Get-YazooRepoRoot
$backupRoot = Ensure-BackupLayout $repoRoot
$snapshotDir = Join-Path $backupRoot 'snapshots'
$timestamp = Get-Date -Format 'yyyy-MM-dd_HH-mm'
$workDir = Join-Path $snapshotDir "_work_$timestamp"
$snapshotFile = Join-Path $snapshotDir "yazoo_snapshot_$timestamp.zip"

if (Test-Path -LiteralPath $workDir) {
    throw "Snapshot work directory already exists: $workDir"
}
if (Test-Path -LiteralPath $snapshotFile) {
    throw "Refusing to overwrite existing snapshot file: $snapshotFile"
}

New-Item -ItemType Directory -Path $workDir | Out-Null

try {
    New-Item -ItemType Directory -Path (Join-Path $workDir 'mysql') | Out-Null
    New-Item -ItemType Directory -Path (Join-Path $workDir 'redis') | Out-Null
    New-Item -ItemType Directory -Path (Join-Path $workDir 'storage') | Out-Null
    New-Item -ItemType Directory -Path (Join-Path $workDir 'config') | Out-Null

    if (-not $SkipFreshMySqlBackup) {
        $mysqlBackup = & "$PSScriptRoot\backup-mysql.ps1" -NoCleanup -Quiet:$Quiet | Select-Object -Last 1
    } else {
        $latest = Get-LatestMySqlBackup $repoRoot
        if (-not $latest) {
            throw 'No existing MySQL backup found for snapshot.'
        }
        $mysqlBackup = $latest.FullName
    }

    Copy-Item -LiteralPath $mysqlBackup -Destination (Join-Path $workDir 'mysql') -Force

    $redisContainer = Get-DockerContainer -Service 'redis' -FallbackName 'yazoo-redis-1' -AdditionalFallbackNames @('yazoo_v2-redis-1') -RepoRoot $repoRoot
    Assert-ContainerRunning $redisContainer
    & docker exec $redisContainer sh -lc 'REDISCLI_AUTH="$REDIS_PASSWORD" redis-cli SAVE >/dev/null'
    if ($LASTEXITCODE -ne 0) {
        throw 'Redis SAVE failed.'
    }
    & docker cp "${redisContainer}:/data/dump.rdb" (Join-Path $workDir 'redis\dump.rdb')
    if ($LASTEXITCODE -ne 0) {
        throw 'Failed to copy Redis dump.rdb.'
    }

    $appContainer = Get-DockerContainer -Service 'app' -FallbackName 'yazoo-app-1' -AdditionalFallbackNames @('yazoo_v2-app-1') -RepoRoot $repoRoot
    Assert-ContainerRunning $appContainer
    & docker cp "${appContainer}:/var/www/html/storage/app/public" (Join-Path $workDir 'storage\public')
    if ($LASTEXITCODE -ne 0) {
        throw 'Public media backup failed; refusing to create an incomplete recovery snapshot.'
    }
    & docker cp "${appContainer}:/var/www/html/storage/app/private" (Join-Path $workDir 'storage\private')
    if ($LASTEXITCODE -ne 0) {
        throw 'Private media backup failed; refusing to create an incomplete recovery snapshot.'
    }

    foreach ($relativePath in @(
        'docker-compose.yml',
        '.dockerignore',
        '.gitignore',
        'backend\.env.production.example'
    )) {
        $source = Join-Path $repoRoot $relativePath
        if (Test-Path -LiteralPath $source) {
            Copy-Item -LiteralPath $source -Destination (Join-Path $workDir 'config') -Force
        }
    }

    if (Test-Path -LiteralPath (Join-Path $repoRoot 'infra\nginx')) {
        Copy-Item -LiteralPath (Join-Path $repoRoot 'infra\nginx') -Destination (Join-Path $workDir 'config\nginx') -Recurse -Force
    }

    Compress-Archive -Path (Join-Path $workDir '*') -DestinationPath $snapshotFile -Force
    $snapshotItem = Get-Item -LiteralPath $snapshotFile
    if ($snapshotItem.Length -lt 1024) {
        throw "Snapshot file is unexpectedly small ($($snapshotItem.Length) bytes)."
    }

    Write-BackupLog -Message "Snapshot created: $($snapshotItem.Name), size=$($snapshotItem.Length) bytes" -LogName 'snapshot.log' -Quiet:$Quiet
    Write-Output $snapshotFile
} finally {
    if (Test-Path -LiteralPath $workDir) {
        Assert-PathInside -Root $snapshotDir -Path $workDir
        Remove-Item -LiteralPath $workDir -Recurse -Force
    }
}
