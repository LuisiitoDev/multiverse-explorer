param location string = resourceGroup().location
param containerImage string = 'mcr.microsoft.com/azuredocs/containerapps-helloworld:latest'
param containerPort int = 80
param appName string
param stableRevision string = ''
param backendAppName string = '${appName}-api'
param backendSkuName string = 'B1'
param backendSkuTier string = 'Basic'
param sqlServerName string = '${appName}-sql'
param sqlDatabaseName string = 'FavoritesDb'
param sqlAdminLogin string = 'sqladmin'
@secure()
param sqlAdminPassword string

resource environment 'Microsoft.App/managedEnvironments@2026-01-01' = {
  name: '${appName}-env'
  location: location
  properties: {}
}

resource identity 'Microsoft.ManagedIdentity/userAssignedIdentities@2024-11-30' = {
  name: '${appName}-identity'
  location: location
}

resource containerApp 'Microsoft.App/containerApps@2026-01-01' = {
  name: appName
  location: location
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${identity.id}': {}
    }
  }
  properties: {
    managedEnvironmentId: environment.id
    configuration: {
      activeRevisionsMode: 'Multiple'
      ingress: {
        external: true
        targetPort: containerPort
        allowInsecure: false
        traffic: empty(stableRevision)
          ? [{ latestRevision: true, weight: 100, label: 'stable' }]
          : [{ revisionName: stableRevision, weight: 100, label: 'stable' }]
      }
    }
    template: {
      containers: [
        {
          name: 'app'
          image: containerImage
          resources: {
            cpu: json('0.5')
            memory: '1Gi'
          }
        }
      ]
    }
  }
}

resource sqlServer 'Microsoft.Sql/servers@2023-08-01' = {
  name: sqlServerName
  location: location
  properties: {
    administratorLogin: sqlAdminLogin
    administratorLoginPassword: sqlAdminPassword
    minimalTlsVersion: '1.2'
    publicNetworkAccess: 'Enabled'
  }

  resource allowAzureServices 'firewallRules@2023-08-01' = {
    name: 'AllowAllWindowsAzureIps'
    properties: {
      startIpAddress: '0.0.0.0'
      endIpAddress: '0.0.0.0'
    }
  }
}

resource sqlDatabase 'Microsoft.Sql/servers/databases@2023-08-01' = {
  parent: sqlServer
  name: sqlDatabaseName
  location: location
  sku: {
    name: 'GP_S_Gen5_2'
    tier: 'GeneralPurpose'
  }
  properties: {
    // Azure SQL free offer: serverless, pauses when the monthly free allowance is used up
    useFreeLimit: true
    freeLimitExhaustionBehavior: 'AutoPause'
    autoPauseDelay: 60
    minCapacity: json('0.5')
  }
}

resource backendPlan 'Microsoft.Web/serverfarms@2025-03-01' = {
  name: '${backendAppName}-plan'
  location: location
  kind: 'linux'
  properties: {
    reserved: true
    zoneRedundant: false
  }
  sku: {
    name: backendSkuName
    tier: backendSkuTier
  }
}

resource backendApp 'Microsoft.Web/sites@2025-03-01' = {
  name: backendAppName
  location: location
  kind: 'app,linux'
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    serverFarmId: backendPlan.id
    clientAffinityEnabled: false
    httpsOnly: true
    publicNetworkAccess: 'Enabled'
    siteConfig: {
      linuxFxVersion: 'DOTNETCORE|10.0'
      alwaysOn: backendSkuTier != 'Free' && backendSkuTier != 'Shared'
      ftpsState: 'Disabled'
      minTlsVersion: '1.2'
      http20Enabled: true
      appSettings: [
        {
          name: 'ASPNETCORE_ENVIRONMENT'
          value: 'Production'
        }
        {
          name: 'Authentication__App__FrontendBaseUrl'
          value: 'https://${containerApp.properties.configuration.ingress.fqdn}'
        }
        {
          name: 'Database__MigrateOnStartup'
          value: 'true'
        }
      ]
      connectionStrings: [
        {
          name: 'FavoritesDb'
          type: 'SQLAzure'
          connectionString: 'Server=tcp:${sqlServer.properties.fullyQualifiedDomainName},1433;Database=${sqlDatabase.name};User Id=${sqlAdminLogin};Password=${sqlAdminPassword};Encrypt=True;TrustServerCertificate=False;Connection Timeout=60'
        }
      ]
    }
  }

  resource scmPolicy 'basicPublishingCredentialsPolicies@2025-03-01' = {
    name: 'scm'
    properties: {
      allow: false
    }
  }

  resource ftpPolicy 'basicPublishingCredentialsPolicies@2025-03-01' = {
    name: 'ftp'
    properties: {
      allow: false
    }
  }
}

output appFqdn string = containerApp.properties.configuration.ingress.fqdn
output backendHostName string = backendApp.properties.defaultHostName
output backendPrincipalId string = backendApp.identity.principalId
output sqlServerFqdn string = sqlServer.properties.fullyQualifiedDomainName
