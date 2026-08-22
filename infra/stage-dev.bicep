param location string = resourceGroup().location
param appName string

// F1 only ships a Linux Node runtime; the frontend/dist zip has no server of
// its own, so 'serve' provides one at deploy time via appCommandLine below.
var planName = '${appName}-dev-plan'
var siteName = '${appName}-dev'

resource plan 'Microsoft.Web/serverfarms@2023-01-01' = {
  name: planName
  location: location
  sku: {
    name: 'F1'
    tier: 'Free'
  }
  kind: 'linux'
  properties: {
    reserved: true
  }
}

resource site 'Microsoft.Web/sites@2023-01-01' = {
  name: siteName
  location: location
  properties: {
    serverFarmId: plan.id
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: 'NODE|20-lts'
      appCommandLine: 'npx serve -s . -l 8080'
      // F1 is the shared/free tier: Always On is not offered on it, and
      // requesting it fails the deployment rather than degrading gracefully.
      alwaysOn: false
      ftpsState: 'Disabled'
      appSettings: [
        {
          name: 'WEBSITES_PORT'
          value: '8080'
        }
        {
          // The published artifact is already-built dist/ output with no
          // package.json, so Oryx has nothing to build; skip it.
          name: 'SCM_DO_BUILD_DURING_DEPLOYMENT'
          value: 'false'
        }
      ]
    }
  }
}

output defaultHostName string = site.properties.defaultHostName
