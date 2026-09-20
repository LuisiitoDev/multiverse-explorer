param location string = resourceGroup().location
param appName string
param sku string
param skuCode string
param appServicePlanName string

resource plan 'Microsoft.Web/serverfarms@2025-03-01' = {
  name: appServicePlanName
  location: location
  kind: 'linux'
  properties: {
    reserved: false
    zoneRedundant: false
  }
  sku: {
    name: skuCode
    tier: sku
  }
}

resource app 'Microsoft.Web/sites@2025-03-01' = {
  name: appName
  location: location
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    serverFarmId: plan.id
    clientAffinityEnabled: false
    httpsOnly: true
    publicNetworkAccess: 'Enabled'
    siteConfig: {
      linuxFxVersion: 'NODE|22-lts'
      alwaysOn: false
      ftpsState: 'FtpsOnly'
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

output webAppHostName string = app.properties.defaultHostName
