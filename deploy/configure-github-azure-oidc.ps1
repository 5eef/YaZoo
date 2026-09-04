#!/usr/bin/env pwsh
[CmdletBinding()]
param(
    [string] $SubscriptionId = '0c2b0918-f196-4a63-a235-1d7674aff317',
    [string] $ResourceGroup = 'yazoo-rg',
    [string] $BackendWebAppName = 'yazoo-api',
    [string] $FrontendWebAppName = 'yazoo',
    [string] $MysqlServerName = 'yazoo-mysql-0c2b09',
    [string] $Repository = '5eef/YaZoo',
    [string] $GitHubEnvironment = 'production',
    [string] $ManagedIdentityName = 'yazoo-github-actions',
    [string] $Confirmation = '',
    [switch] $Execute
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$expectedSubscriptionId = '0c2b0918-f196-4a63-a235-1d7674aff317'
$expectedResourceGroup = 'yazoo-rg'
$expectedBackendWebAppName = 'yazoo-api'
$expectedFrontendWebAppName = 'yazoo'
$expectedMysqlServerName = 'yazoo-mysql-0c2b09'
$expectedRepository = '5eef/YaZoo'
$expectedEnvironment = 'production'
$expectedManagedIdentityName = 'yazoo-github-actions'
$expectedConfirmation = '5eef/YaZoo@yazoo-rg/production'
$federatedCredentialName = 'github-yazoo-production'
$federatedSubject = 'repo:5eef/YaZoo:environment:production'

function Format-SafeArguments {
    param([string[]] $Arguments)

    $redactNext = $false
    return ($Arguments | ForEach-Object {
        if ($redactNext) {
            $redactNext = $false
            return '<redacted>'
        }

        if ($_ -eq '--body') {
            $redactNext = $true
            return $_
        }

        if ($_ -match '\s') {
            return '"<value-with-spaces>"'
        }

        return $_
    }) -join ' '
}

function Invoke-NativeCommand {
    param(
        [Parameter(Mandatory)][string] $FilePath,
        [Parameter(Mandatory)][string[]] $Arguments,
        [switch] $Capture
    )

    Write-Host ('Running: {0} {1}' -f $FilePath, (Format-SafeArguments $Arguments))
    $output = (& $FilePath @Arguments 2>&1 | Out-String).Trim()
    if ($LASTEXITCODE -ne 0) {
        throw "$FilePath failed with exit code $LASTEXITCODE."
    }

    if ($Capture) {
        return $output
    }

    if ($output) {
        Write-Host $output
    }
}

function ConvertFrom-NativeJson {
    param(
        [Parameter(Mandatory)][string] $FilePath,
        [Parameter(Mandatory)][string[]] $Arguments
    )

    $json = Invoke-NativeCommand $FilePath $Arguments -Capture
    if ([string]::IsNullOrWhiteSpace($json)) {
        return $null
    }

    return $json | ConvertFrom-Json
}

function Get-AzureValue {
    param([Parameter(Mandatory)][string[]] $Arguments)

    $value = Invoke-NativeCommand az ($Arguments + @('--only-show-errors', '--output', 'tsv')) -Capture
    if ([string]::IsNullOrWhiteSpace($value)) {
        throw 'An expected Azure value is missing.'
    }

    return $value.Trim()
}

function Ensure-RoleAssignment {
    param(
        [Parameter(Mandatory)][string] $PrincipalObjectId,
        [Parameter(Mandatory)][string] $Role,
        [Parameter(Mandatory)][string] $Scope
    )

    $existing = Invoke-NativeCommand az @(
        'role', 'assignment', 'list',
        '--assignee-object-id', $PrincipalObjectId,
        '--role', $Role,
        '--scope', $Scope,
        '--query', '[0].id',
        '--only-show-errors',
        '--output', 'tsv'
    ) -Capture

    if (-not [string]::IsNullOrWhiteSpace($existing)) {
        Write-Host "Role already present: $Role."
        return
    }

    for ($attempt = 1; $attempt -le 6; $attempt++) {
        Write-Host "Assigning role $Role (attempt $attempt/6)."
        $output = (& az role assignment create `
            --assignee-object-id $PrincipalObjectId `
            --assignee-principal-type ServicePrincipal `
            --role $Role `
            --scope $Scope `
            --only-show-errors `
            --output none 2>&1 | Out-String).Trim()
        if ($LASTEXITCODE -eq 0) {
            return
        }

        if ($attempt -lt 6 -and $output -match '(?i)(PrincipalNotFound|does not exist in the directory)') {
            Start-Sleep -Seconds 10
            continue
        }

        throw "Azure role assignment failed for $Role."
    }
}

$exactTargets = @(
    ($SubscriptionId -eq $expectedSubscriptionId),
    ($ResourceGroup -eq $expectedResourceGroup),
    ($BackendWebAppName -eq $expectedBackendWebAppName),
    ($FrontendWebAppName -eq $expectedFrontendWebAppName),
    ($MysqlServerName -eq $expectedMysqlServerName),
    ($Repository -eq $expectedRepository),
    ($GitHubEnvironment -eq $expectedEnvironment),
    ($ManagedIdentityName -eq $expectedManagedIdentityName)
)
if ($exactTargets -contains $false) {
    throw 'OIDC configuration is restricted to the approved YaZoo production targets.'
}

Write-Host 'YaZoo GitHub/Azure OIDC plan:'
Write-Host "  Subscription: $SubscriptionId"
Write-Host "  Resource group: $ResourceGroup"
Write-Host "  Repository/environment: $Repository / $GitHubEnvironment"
Write-Host "  User-assigned managed identity: $ManagedIdentityName"
Write-Host "  Web RBAC: Website Contributor on $BackendWebAppName and $FrontendWebAppName"
Write-Host "  Database RBAC: Reader on $MysqlServerName"
Write-Host '  Long-lived client secret: none'

if (-not $Execute) {
    Write-Host 'Dry-run only: no Azure or GitHub mutation was performed.'
    Write-Host "Re-run with -Execute -Confirmation '$expectedConfirmation' after explicit approval."
    return
}

if ($Confirmation -cne $expectedConfirmation) {
    throw "Confirmation must exactly match '$expectedConfirmation'."
}

foreach ($command in @('az', 'gh')) {
    if (-not (Get-Command $command -ErrorAction SilentlyContinue)) {
        throw "$command is required."
    }
}

Invoke-NativeCommand az @('account', 'set', '--subscription', $SubscriptionId, '--only-show-errors')
$account = ConvertFrom-NativeJson az @(
    'account', 'show',
    '--query', '{subscriptionId:id,tenantId:tenantId}',
    '--only-show-errors',
    '--output', 'json'
)
if ($account.subscriptionId -ne $SubscriptionId -or [string]::IsNullOrWhiteSpace($account.tenantId)) {
    throw 'The active Azure account does not match the approved subscription or tenant.'
}

$groupId = Get-AzureValue @('group', 'show', '--name', $ResourceGroup, '--query', 'id')
$groupLocation = Get-AzureValue @('group', 'show', '--name', $ResourceGroup, '--query', 'location')
$backendId = Get-AzureValue @('webapp', 'show', '--resource-group', $ResourceGroup, '--name', $BackendWebAppName, '--query', 'id')
$frontendId = Get-AzureValue @('webapp', 'show', '--resource-group', $ResourceGroup, '--name', $FrontendWebAppName, '--query', 'id')
$mysqlId = Get-AzureValue @('mysql', 'flexible-server', 'show', '--resource-group', $ResourceGroup, '--name', $MysqlServerName, '--query', 'id')
if (-not $backendId.StartsWith($groupId, [StringComparison]::OrdinalIgnoreCase) -or
    -not $frontendId.StartsWith($groupId, [StringComparison]::OrdinalIgnoreCase) -or
    -not $mysqlId.StartsWith($groupId, [StringComparison]::OrdinalIgnoreCase)) {
    throw 'An Azure target is outside the approved resource group.'
}

Invoke-NativeCommand gh @('auth', 'status', '--hostname', 'github.com')
$resolvedRepository = Invoke-NativeCommand gh @(
    'repo', 'view', $Repository,
    '--json', 'nameWithOwner',
    '--jq', '.nameWithOwner'
) -Capture
if ($resolvedRepository.Trim() -cne $Repository) {
    throw 'The authenticated GitHub repository does not match the approved target.'
}
Invoke-NativeCommand gh @('api', "repos/$Repository/environments/$GitHubEnvironment", '--silent')

$identityResult = ConvertFrom-NativeJson az @(
    'identity', 'list',
    '--resource-group', $ResourceGroup,
    '--query', "[?name=='$ManagedIdentityName'].{clientId:clientId,id:id,location:location,name:name,principalId:principalId,tenantId:tenantId}",
    '--only-show-errors',
    '--output', 'json'
)
$identities = @()
if ($null -ne $identityResult) {
    $identities = @($identityResult)
}
if ($identities.Count -gt 1) {
    throw 'Multiple managed identities share the approved name; manual review is required.'
}

if ($identities.Count -eq 0) {
    $identity = ConvertFrom-NativeJson az @(
        'identity', 'create',
        '--resource-group', $ResourceGroup,
        '--name', $ManagedIdentityName,
        '--location', $groupLocation,
        '--query', '{clientId:clientId,id:id,location:location,name:name,principalId:principalId,tenantId:tenantId}',
        '--only-show-errors',
        '--output', 'json'
    )
    Write-Host 'Created the user-assigned managed identity.'
} else {
    $identity = $identities[0]
    Write-Host 'Reusing the existing user-assigned managed identity.'
}
if ([string]::IsNullOrWhiteSpace($identity.clientId) -or
    [string]::IsNullOrWhiteSpace($identity.principalId) -or
    [string]::IsNullOrWhiteSpace($identity.tenantId)) {
    throw 'The managed identity is missing a client, principal, or tenant identifier.'
}
if ($identity.tenantId -ne $account.tenantId) {
    throw 'The managed identity belongs to an unexpected tenant.'
}

$federatedCredentialResult = ConvertFrom-NativeJson az @(
    'identity', 'federated-credential', 'list',
    '--identity-name', $ManagedIdentityName,
    '--resource-group', $ResourceGroup,
    '--query', "[?name=='$federatedCredentialName'].{name:name,subject:subject,issuer:issuer}",
    '--only-show-errors',
    '--output', 'json'
)
$federatedCredentials = @()
if ($null -ne $federatedCredentialResult) {
    $federatedCredentials = @($federatedCredentialResult)
}
if ($federatedCredentials.Count -gt 1) {
    throw 'Multiple matching federated credentials require manual review.'
}
if ($federatedCredentials.Count -eq 1) {
    $credential = $federatedCredentials[0]
    if ($credential.subject -cne $federatedSubject -or
        $credential.issuer -cne 'https://token.actions.githubusercontent.com') {
        throw 'The existing federated credential does not match the approved GitHub subject.'
    }
    Write-Host 'Reusing the existing federated credential.'
} else {
    Invoke-NativeCommand az @(
        'identity', 'federated-credential', 'create',
        '--name', $federatedCredentialName,
        '--identity-name', $ManagedIdentityName,
        '--resource-group', $ResourceGroup,
        '--issuer', 'https://token.actions.githubusercontent.com',
        '--subject', $federatedSubject,
        '--audiences', 'api://AzureADTokenExchange',
        '--only-show-errors',
        '--output', 'none'
    )
    Write-Host 'Created the GitHub federated credential.'
}

Ensure-RoleAssignment -PrincipalObjectId $identity.principalId -Role 'Website Contributor' -Scope $backendId
Ensure-RoleAssignment -PrincipalObjectId $identity.principalId -Role 'Website Contributor' -Scope $frontendId
Ensure-RoleAssignment -PrincipalObjectId $identity.principalId -Role 'Reader' -Scope $mysqlId

$variables = @{
    AZURE_CLIENT_ID = [string] $identity.clientId
    AZURE_TENANT_ID = [string] $account.tenantId
    AZURE_SUBSCRIPTION_ID = $SubscriptionId
}
foreach ($entry in $variables.GetEnumerator()) {
    Invoke-NativeCommand gh @(
        'variable', 'set', $entry.Key,
        '--repo', $Repository,
        '--env', $GitHubEnvironment,
        '--body', $entry.Value
    )

    $stored = Invoke-NativeCommand gh @(
        'variable', 'get', $entry.Key,
        '--repo', $Repository,
        '--env', $GitHubEnvironment,
        '--json', 'value',
        '--jq', '.value'
    ) -Capture
    if ($stored.Trim() -cne $entry.Value) {
        throw "GitHub variable $($entry.Key) did not verify."
    }
}

Write-Host 'OIDC configuration completed and verified.'
Write-Host 'No client secret was created or stored.'
