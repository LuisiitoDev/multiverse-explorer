param location string = resourceGroup().location
param appName string
param containerImage string
param containerPort int = 8080

@description('''
Bootstrap only. Leave true for the very first deployment, when no revision name
exists yet to point traffic at. Set it to false once the CD pipeline owns the
weights, otherwise every deploy takes 100% of traffic on creation and there is
no canary window at all.
''')
param routeTrafficToLatestRevision bool = true

var baseIngress = {
  external: true
  targetPort: containerPort
  transport: 'auto'
}

var bootstrapTraffic = {
  traffic: [
    {
      latestRevision: true
      weight: 100
    }
  ]
}

var ingressConfig = routeTrafficToLatestRevision ? union(baseIngress, bootstrapTraffic) : baseIngress

resource environment 'Microsoft.App/managedEnvironments@2024-03-01' = {
  name: '${appName}-env'
  location: location
  properties: {}
}

resource identity 'Microsoft.ManagedIdentity/userAssignedIdentities@2024-11-30' = {
  name: '${appName}-identity'
  location: location
}

resource containerApp 'Microsoft.App/containerApps@2024-03-01' = {
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
      ingress: ingressConfig
    }
    template: {
      containers: [
        {
          name: appName
          image: containerImage
          resources: {
            cpu: json('0.25')
            memory: '0.5Gi'
          }
        }
      ]
      scale: {
        minReplicas: 0
        maxReplicas: 3
        rules: [
          {
            name: 'http-concurrency'
            http: {
              metadata: {
                concurrentRequests: '50'
              }
            }
          }
        ]
      }
    }
  }
}
