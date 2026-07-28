#!/usr/bin/env pwsh
[CmdletBinding(SupportsShouldProcess)]
param(
    [string] $SubscriptionId = "",
    [string] $ResourceGroup = "yazoo-rg",
    [string] $Location = "germanywestcentral",
    [string] $BackendWebAppName = "yazoo-api",
    [string] $FrontendWebAppName = "yazoo",
    [string] $MysqlServerName = "yazoo-mysql",
    [string] $MysqlDatabase = "yazoo",
    [string] $MysqlAdminUser = "yazoo_admin",
    [SecureString] $MysqlAdminPassword,
    [string] $KeyVaultName = "yazoo-kv",
    [Parameter(Mandatory)][string] $ProvisioningPrincipalObjectId,
    [ValidateSet("User", "ServicePrincipal")][string] $ProvisioningPrincipalType = "ServicePrincipal",
    [string] $AppServicePlanName = "yazoo-linux-plan",
    [string] $VnetName = "yazoo-vnet",
    [string] $AppSubnetName = "appservice-integration",
    [string] $MysqlSubnetName = "mysql-private",
    [string] $MysqlPrivateDnsZone = "yazoo.private.mysql.database.azure.com",
    [Parameter(Mandatory)][string] $BackendImage,
    [Parameter(Mandatory)][string] $FrontendImage
)

$ErrorActionPreference = 'Stop'

$immutableImagePattern = ':[0-9a-fA-F]{40}$'
foreach ($image in @($BackendImage, $FrontendImage)) {
    if ($image -notmatch $immutableImagePattern) {
        throw "Container images must use an immutable full 40-character Git SHA tag."
    }
}

function Format-SafeArguments {
    param([string[]] $Arguments)

    $redactNext = $false
    return ($Arguments | ForEach-Object {
        if ($redactNext) {
            $redactNext = $false
            return "<redacted>"
        }

        if ($_ -in @("--admin-password", "--value", "--password")) {
            $redactNext = $true
            return $_
        }

        if ($_ -match '\s') {
            return '"<value-with-spaces>"'
        }

        return $_
    }) -join " "
}

function Invoke-NativeCommand {
    param(
        [Parameter(Mandatory)][string] $FilePath,
        [Parameter(Mandatory)][string[]] $Arguments,
        [switch] $PassThru
    )

    Write-Host ("Running: {0} {1}" -f $FilePath, (Format-SafeArguments $Arguments))
    if ($WhatIfPreference) {
        return $null
    }

    $output = & $FilePath @Arguments 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "$FilePath failed with exit code $LASTEXITCODE. Provisioning stopped."
    }

    if ($PassThru) {
        return $output
    }

    return $null
}

function Test-AzureResource {
    param([string[]] $Arguments)

    if ($WhatIfPreference) {
        return $false
    }

    & az @Arguments --only-show-errors --output none 2>$null
    return $LASTEXITCODE -eq 0
}

function Get-AzureValue {
    param([string[]] $Arguments)

    if ($WhatIfPreference) {
        return ""
    }

    $value = & az @Arguments --only-show-errors --output tsv 2>$null
    if ($LASTEXITCODE -ne 0) {
        throw "Azure CLI lookup failed. Provisioning stopped."
    }

    return ($value | Select-Object -First 1)
}

if ($SubscriptionId) {
    Invoke-NativeCommand az @("account", "set", "--subscription", $SubscriptionId)
}

if (-not $MysqlAdminPassword) {
    if ($WhatIfPreference) {
        $MysqlAdminPassword = ConvertTo-SecureString "what-if-placeholder" -AsPlainText -Force
    } else {
        $MysqlAdminPassword = Read-Host "MySQL administrator password" -AsSecureString
    }
}

$passwordPointer = [IntPtr]::Zero
$plainPassword = $null

try {
    $passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($MysqlAdminPassword)
    $plainPassword = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer)
    if ([string]::IsNullOrWhiteSpace($plainPassword)) {
        throw "A non-empty MySQL administrator password is required."
    }

    Invoke-NativeCommand az @("group", "create", "--name", $ResourceGroup, "--location", $Location, "--only-show-errors", "--output", "none")
    Invoke-NativeCommand az @(
        "appservice", "plan", "create",
        "--resource-group", $ResourceGroup,
        "--name", $AppServicePlanName,
        "--location", $Location,
        "--is-linux",
        "--sku", "B1",
        "--only-show-errors",
        "--output", "none"
    )

    if (-not (Test-AzureResource @("network", "vnet", "show", "--resource-group", $ResourceGroup, "--name", $VnetName))) {
        Invoke-NativeCommand az @(
            "network", "vnet", "create",
            "--resource-group", $ResourceGroup,
            "--name", $VnetName,
            "--location", $Location,
            "--address-prefixes", "10.20.0.0/16",
            "--only-show-errors",
            "--output", "none"
        )
    }

    if (-not (Test-AzureResource @("network", "vnet", "subnet", "show", "--resource-group", $ResourceGroup, "--vnet-name", $VnetName, "--name", $AppSubnetName))) {
        Invoke-NativeCommand az @(
            "network", "vnet", "subnet", "create",
            "--resource-group", $ResourceGroup,
            "--vnet-name", $VnetName,
            "--name", $AppSubnetName,
            "--address-prefixes", "10.20.1.0/24",
            "--delegations", "Microsoft.Web/serverFarms",
            "--only-show-errors",
            "--output", "none"
        )
    }
    Invoke-NativeCommand az @(
        "network", "vnet", "subnet", "update",
        "--resource-group", $ResourceGroup,
        "--vnet-name", $VnetName,
        "--name", $AppSubnetName,
        "--delegations", "Microsoft.Web/serverFarms",
        "--only-show-errors",
        "--output", "none"
    )

    if (-not (Test-AzureResource @("network", "vnet", "subnet", "show", "--resource-group", $ResourceGroup, "--vnet-name", $VnetName, "--name", $MysqlSubnetName))) {
        Invoke-NativeCommand az @(
            "network", "vnet", "subnet", "create",
            "--resource-group", $ResourceGroup,
            "--vnet-name", $VnetName,
            "--name", $MysqlSubnetName,
            "--address-prefixes", "10.20.2.0/24",
            "--delegations", "Microsoft.DBforMySQL/flexibleServers",
            "--only-show-errors",
            "--output", "none"
        )
    }
    Invoke-NativeCommand az @(
        "network", "vnet", "subnet", "update",
        "--resource-group", $ResourceGroup,
        "--vnet-name", $VnetName,
        "--name", $MysqlSubnetName,
        "--delegations", "Microsoft.DBforMySQL/flexibleServers",
        "--only-show-errors",
        "--output", "none"
    )

    if (-not (Test-AzureResource @("keyvault", "show", "--resource-group", $ResourceGroup, "--name", $KeyVaultName))) {
        Invoke-NativeCommand az @(
            "keyvault", "create",
            "--resource-group", $ResourceGroup,
            "--name", $KeyVaultName,
            "--location", $Location,
            "--enable-rbac-authorization", "true",
            "--only-show-errors",
            "--output", "none"
        )
    }
    $keyVaultId = if ($WhatIfPreference) {
        "/subscriptions/what-if/resourceGroups/$ResourceGroup/providers/Microsoft.KeyVault/vaults/$KeyVaultName"
    } else {
        Get-AzureValue @(
            "keyvault", "show",
            "--resource-group", $ResourceGroup,
            "--name", $KeyVaultName,
            "--query", "id"
        )
    }
    $keyVaultRoleAssignmentId = Get-AzureValue @(
        "role", "assignment", "list",
        "--assignee-object-id", $ProvisioningPrincipalObjectId,
        "--role", "Key Vault Secrets Officer",
        "--scope", $keyVaultId,
        "--query", "[0].id"
    )
    if (-not $keyVaultRoleAssignmentId) {
        Invoke-NativeCommand az @(
            "role", "assignment", "create",
            "--assignee-object-id", $ProvisioningPrincipalObjectId,
            "--assignee-principal-type", $ProvisioningPrincipalType,
            "--role", "Key Vault Secrets Officer",
            "--scope", $keyVaultId,
            "--only-show-errors",
            "--output", "none"
        )
    }

    if (-not (Test-AzureResource @("mysql", "flexible-server", "show", "--resource-group", $ResourceGroup, "--name", $MysqlServerName))) {
        Invoke-NativeCommand az @(
            "mysql", "flexible-server", "create",
            "--resource-group", $ResourceGroup,
            "--location", $Location,
            "--name", $MysqlServerName,
            "--admin-user", $MysqlAdminUser,
            "--admin-password", $plainPassword,
            "--sku-name", "Standard_B1ms",
            "--tier", "Burstable",
            "--storage-size", "20",
            "--database-name", $MysqlDatabase,
            "--vnet", $VnetName,
            "--subnet", $MysqlSubnetName,
            "--private-dns-zone", $MysqlPrivateDnsZone,
            "--only-show-errors",
            "--output", "none"
        )
    }

    Invoke-NativeCommand az @(
        "keyvault", "secret", "set",
        "--vault-name", $KeyVaultName,
        "--name", "DB-PASSWORD",
        "--value", $plainPassword,
        "--only-show-errors",
        "--output", "none"
    )

    foreach ($app in @(
        @{ Name = $BackendWebAppName; Image = $BackendImage },
        @{ Name = $FrontendWebAppName; Image = $FrontendImage }
    )) {
        if (-not (Test-AzureResource @("webapp", "show", "--resource-group", $ResourceGroup, "--name", $app.Name))) {
            Invoke-NativeCommand az @(
                "webapp", "create",
                "--resource-group", $ResourceGroup,
                "--plan", $AppServicePlanName,
                "--name", $app.Name,
                "--deployment-container-image-name", $app.Image,
                "--only-show-errors",
                "--output", "none"
            )
        }

        Invoke-NativeCommand az @(
            "webapp", "update",
            "--resource-group", $ResourceGroup,
            "--name", $app.Name,
            "--set", "httpsOnly=true",
            "--only-show-errors",
            "--output", "none"
        )
        $desiredSubnetId = Get-AzureValue @(
            "network", "vnet", "subnet", "show",
            "--resource-group", $ResourceGroup,
            "--vnet-name", $VnetName,
            "--name", $AppSubnetName,
            "--query", "id"
        )
        $integratedSubnetId = Get-AzureValue @(
            "webapp", "vnet-integration", "list",
            "--resource-group", $ResourceGroup,
            "--name", $app.Name,
            "--query", "[0].vnetResourceId"
        )

        if (-not $integratedSubnetId) {
            Invoke-NativeCommand az @(
                "webapp", "vnet-integration", "add",
                "--resource-group", $ResourceGroup,
                "--name", $app.Name,
                "--vnet", $VnetName,
                "--subnet", $AppSubnetName,
                "--only-show-errors",
                "--output", "none"
            )
        } elseif ($integratedSubnetId -ne $desiredSubnetId) {
            throw "Web app $($app.Name) is already integrated with a different subnet."
        }
    }
} finally {
    $plainPassword = $null
    if ($passwordPointer -ne [IntPtr]::Zero) {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer)
    }
}

Write-Host "Azure foundation provisioning completed."
Write-Host "Next: configure application settings with deploy/azure-dockerhub-deploy.ps1."
