param location string = resourceGroup().location
param appName string

// F1 only ships a Linux Node runtime; the frontend/dist zip has no server of
// its own, so 'serve' provides one at deploy time via appCommandLine below.
var planName = '${appName}-dev-plan'
var siteName = '${appName}-dev'

// Dev owns the shared plan (see sharedPlanName in staging/prod); it owns the
// shared Log Analytics workspace for the same reason - one free resource per
// concern in this RG, staging/prod reference it as 'existing'.
param sharedWorkspaceName string = 'rick-and-morty-logs'

// Azure Load Testing resource is a management container for test definitions
// and results, not per-environment compute - one is enough. It targets Dev's
// URL from the CD pipeline (azure-loadtest/dev-loadtest-config.yaml), so it's
// referenced there by name/resource group rather than composed into Bicep.
param loadTestResourceName string = 'rick-and-morty-loadtest'

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

resource logAnalyticsWorkspace 'Microsoft.OperationalInsights/workspaces@2022-10-01' = {
  name: sharedWorkspaceName
  location: location
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 30
  }
}

resource loadTest 'Microsoft.LoadTestService/loadtests@2022-12-01' = {
  name: loadTestResourceName
  location: location
  properties: {}
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

resource diagnosticSettings 'Microsoft.Insights/diagnosticSettings@2021-05-01-preview' = {
  name: '${siteName}-diagnostics'
  scope: site
  properties: {
    workspaceId: logAnalyticsWorkspace.id
    logs: [
      {
        category: 'AppServiceHTTPLogs'
        enabled: true
      }
      {
        category: 'AppServicePlatformLogs'
        enabled: true
      }
    ]
  }
}

resource http5xxAlert 'Microsoft.Insights/metricAlerts@2018-03-01' = {
  name: '${siteName}-http5xx-alert'
  location: 'global'
  properties: {
    description: 'Alerts when the ${siteName} App Service returns HTTP 5xx responses.'
    severity: 2
    enabled: true
    scopes: [
      site.id
    ]
    evaluationFrequency: 'PT1M'
    windowSize: 'PT5M'
    targetResourceType: 'Microsoft.Web/sites'
    targetResourceRegion: location
    criteria: {
      'odata.type': 'Microsoft.Azure.Monitor.SingleResourceMultipleMetricCriteria'
      allOf: [
        {
          name: 'Http5xx'
          metricName: 'Http5xx'
          metricNamespace: 'Microsoft.Web/sites'
          operator: 'GreaterThan'
          threshold: 0
          timeAggregation: 'Total'
          criterionType: 'StaticThresholdCriterion'
        }
      ]
    }
    autoMitigate: true
    actions: []
  }
}

resource responseTimeAlert 'Microsoft.Insights/metricAlerts@2018-03-01' = {
  name: '${siteName}-response-time-alert'
  location: 'global'
  properties: {
    description: 'Alerts when the ${siteName} App Service average response time exceeds 3 seconds.'
    severity: 3
    enabled: true
    scopes: [
      site.id
    ]
    evaluationFrequency: 'PT1M'
    windowSize: 'PT5M'
    targetResourceType: 'Microsoft.Web/sites'
    targetResourceRegion: location
    criteria: {
      'odata.type': 'Microsoft.Azure.Monitor.SingleResourceMultipleMetricCriteria'
      allOf: [
        {
          name: 'AverageResponseTime'
          metricName: 'AverageResponseTime'
          metricNamespace: 'Microsoft.Web/sites'
          operator: 'GreaterThan'
          threshold: 3
          timeAggregation: 'Average'
          criterionType: 'StaticThresholdCriterion'
        }
      ]
    }
    autoMitigate: true
    actions: []
  }
}

output defaultHostName string = site.properties.defaultHostName
