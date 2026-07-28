#!/usr/bin/env pwsh
[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$repositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$global:YazooAzureCalls = @()

function global:az {
    $global:YazooAzureCalls += , @($args)
    $global:LASTEXITCODE = 0
}

try {
    & (Join-Path $repositoryRoot 'deploy/azure-setup.ps1') `
        -SubscriptionId '00000000-0000-0000-0000-000000000001' `
        -ResourceGroup 'validation-resource-group' `
        -Location 'validation-region' `
        -AppServicePlanName 'validation-plan' `
        -BackendWebAppName 'validation-backend' `
        -FrontendWebAppName 'validation-frontend' `
        -MysqlServerName 'validation-mysql' `
        -MysqlDatabase 'validation-database' `
        -MysqlAdminUser 'validation-admin' `
        -KeyVaultName 'validation-vault' `
        -VnetName 'validation-vnet' `
        -AppSubnetName 'validation-app-subnet' `
        -MysqlSubnetName 'validation-mysql-subnet' `
        -MysqlPrivateDnsZone 'validation.mysql.database.azure.com' `
        -ProvisioningPrincipalObjectId '00000000-0000-0000-0000-000000000000' `
        -BackendImage '5eef/yazoo-api:0000000000000000000000000000000000000000' `
        -FrontendImage '5eef/yazoo-frontend:0000000000000000000000000000000000000000'

    if ($global:YazooAzureCalls.Count -eq 0) {
        throw 'Inspection mode did not inspect any Azure resource.'
    }

    $mutatingVerb = '\b(create|update|set|add|delete|remove|restart|start|stop)\b'
    foreach ($call in $global:YazooAzureCalls) {
        $rendered = $call -join ' '
        if ($rendered -match $mutatingVerb) {
            throw "azure-setup.ps1 attempted a mutating command without -AllowCreateResources: $rendered"
        }
        if ($rendered -notmatch '--subscription 00000000-0000-0000-0000-000000000001') {
            throw "azure-setup.ps1 did not scope an inspection command to the requested subscription: $rendered"
        }
    }

    $global:YazooAzureCalls = @()
    $initialConfigurationRejected = $false
    try {
        & (Join-Path $repositoryRoot 'deploy/azure-dockerhub-deploy.ps1') `
            -ResourceGroup 'validation-resource-group' `
            -Location 'validation-region' `
            -AppServicePlanName 'validation-plan' `
            -BackendWebAppName 'validation-backend' `
            -FrontendWebAppName 'validation-frontend' `
            -BackendImage '5eef/yazoo-api:0000000000000000000000000000000000000000' `
            -FrontendImage '5eef/yazoo-frontend:0000000000000000000000000000000000000000' `
            -FrontendUrl 'https://frontend.invalid' `
            -DbHost 'mysql.invalid' `
            -DbUsername 'validation-user' `
            -RedisHost 'redis.invalid' `
            -ContactRecipient 'contact@invalid.test' `
            -LegalStatus 'validation-only' `
            -LegalAddress 'validation-only' `
            -LegalIce 'validation-only' `
            -PrivacyContactEmail 'privacy@invalid.test' `
            -MailHost 'smtp.invalid' `
            -MailPort '587' `
            -MailUsername 'validation-user' `
            -MailFromAddress 'noreply@invalid.test'
    } catch {
        if ($_.Exception.Message -notmatch 'initial configuration only') {
            throw
        }
        $initialConfigurationRejected = $true
    }

    if (-not $initialConfigurationRejected) {
        throw 'azure-dockerhub-deploy.ps1 did not require -AllowInitialConfiguration.'
    }
    if ($global:YazooAzureCalls.Count -ne 0) {
        throw 'azure-dockerhub-deploy.ps1 called Azure before explicit initial-configuration approval.'
    }

    Write-Output 'azure-script-guards=ok'
} finally {
    Remove-Item Function:\global:az -ErrorAction SilentlyContinue
    Remove-Variable YazooAzureCalls -Scope Global -ErrorAction SilentlyContinue
}
