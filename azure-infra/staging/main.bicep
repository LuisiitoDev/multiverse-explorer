param location string = resourceGroup().location
param appName string

// Azure allows only one Free-tier Linux App Service plan per resource group,
// and the dev environment's plan already claims that slot in this RG. Rather
// than pay for a dedicated plan, staging's site runs on that same free plan.
param sharedPlanName string = 'rick-and-morty-dev-app-dev-plan'

// F1 only ships a Linux Node runtime; the frontend/dist zip has no server of
// its own, so 'serve' provides one at deploy time via appCommandLine below.
var siteName = '${appName}-staging'

resource plan 'Microsoft.Web/serverfarms@2023-01-01' existing = {
  name: sharedPlanName
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

resource http5xxAlert 'Microsoft.Insights/metricAlerts@2018-03-01' = {
  name: '${siteName}-http5xx-alert'
  location: 'global'
  properties: {
    description: 'Alerts when the ${siteName} App Service returns HTTP 5xx responses.'
    severity: 1
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
    description: 'Alerts when the ${siteName} App Service average response time exceeds 2 seconds.'
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
          name: 'AverageResponseTime'
          metricName: 'AverageResponseTime'
          metricNamespace: 'Microsoft.Web/sites'
          operator: 'GreaterThan'
          threshold: 2
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
