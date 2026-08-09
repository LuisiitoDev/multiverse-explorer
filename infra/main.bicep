param location string = resourceGroup().location
param appName string
param containerImage string
param containerPort int = 8080


resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: '${appName}-logs'
  location: location
  properties:{
    sku:{
      name: 'Free'
    }
    retentionInDays: 30
  }
}

resource environment 'Microsoft.App/managedEnvironments@2024-03-01' = {
  name: '${appName}-env'
  location: location
  properties:{
    appLogsConfiguration:{
      destination: 'logAnalytics'
      logAnalyticsConfiguration:{
        customerId: logAnalytics.properties.customerId
        sharedKey:  logAnalytics.listKeys().primarySharedKey
      }
    }
  }
}


resource identity 'Microsoft.ManagedIdentity/userAssignedIdentities@2024-11-30' = {
  name: '${appName}-env'
  location: location
}

resource containerApp 'Microsoft.App/containerApps@2024-03-01' = {
  name: appName
  location: location
  identity:{
    type: 'UserAssigned'
    userAssignedIdentities:{
      '${identity.id}':{}
    }
  }
  properties:{
    managedEnvironmentId: environment.id
    configuration:{
      ingress:{
        external: true
        targetPort: containerPort
        transport: 'auto'
      }
    }
    template:{
      containers:[
        {
          name: appName
          image: containerImage
          resources: {
            cpu: json('0.25')
            memory: '0.5Gi'
          }
        }
      ]
      scale:{
        minReplicas: 0
        maxReplicas: 3
        rules:[
          {
            name: 'http-concurrency'
            http: {
              metadata:{
                concurrentRequests: '50'
              }
            }
          }
        ]
      }
    }
  }
}
