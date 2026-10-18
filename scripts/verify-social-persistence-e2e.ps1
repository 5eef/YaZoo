$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$evidencePath = Join-Path $projectRoot 'output/social-e2e'
New-Item -ItemType Directory -Path $evidencePath -Force | Out-Null
$before = & docker exec yazoo-social-api php tests/Support/social-e2e-proof.php
if ($LASTEXITCODE -ne 0) { throw 'Disposable persistence precheck failed.' }
$beforeText = $before -join "`n"
$beforeText | Set-Content -LiteralPath (Join-Path $evidencePath 'persistence-before.json') -Encoding utf8
& docker restart yazoo-social-s3 | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'Disposable S3 restart failed.' }
& docker restart yazoo-social-api | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'Disposable API restart failed.' }
$afterText = ''
for ($attempt = 0; $attempt -lt 6; $attempt++) {
    $after = & docker exec yazoo-social-api php tests/Support/social-e2e-proof.php
    if ($LASTEXITCODE -eq 0) { $afterText = $after -join "`n"; break }
    Start-Sleep -Seconds 2
}
if (-not $afterText) { throw 'Disposable persistence postcheck failed.' }
$afterText | Set-Content -LiteralPath (Join-Path $evidencePath 'persistence-after.json') -Encoding utf8
if ($beforeText -cne $afterText) { throw 'Counts or object bytes changed across the disposable restart.' }
$proof = $afterText | ConvertFrom-Json
Write-Output ('PASS_LOCAL: SQLite counts and {0} S3 object hashes survived both container restarts.' -f $proof.objects.Count)
$proof.counts | ConvertTo-Json -Compress
