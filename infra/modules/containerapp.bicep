// FEATURE_* variables are rendered into /config.json at container start, so a
// flag change needs a new revision but no image rebuild.
param name string
param location string
param managedEnvironmentId string
param identityId string
param containerImage string
param containerPort int = 8080

@description('Revision label that receives 100% of production traffic ("blue" or "green"). Empty during bootstrap.')
@allowed([
  ''
  'blue'
  'green'
])
param activeLabel string = ''

@description('Runtime feature flag; anything other than "true" is treated as off.')
param featureGlobe3d string = 'false'

var baseIngress = {
  external: true
  targetPort: containerPort
  transport: 'auto'
}

// Bootstrap (no label yet) sends everything to the latest revision; afterwards
// the swap workflow owns label weights, so IaC only pins the active label.
var ingressConfig = empty(activeLabel)
  ? union(baseIngress, { traffic: [{ latestRevision: true, weight: 100 }] })
  : union(baseIngress, { traffic: [{ label: activeLabel, weight: 100 }] })

resource containerApp 'Microsoft.App/containerApps@2024-03-01' = {
  name: name
  location: location
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${identityId}': {}
    }
  }
  properties: {
    managedEnvironmentId: managedEnvironmentId
    configuration: {
      activeRevisionsMode: 'Multiple'
      ingress: ingressConfig
    }
    template: {
      containers: [
        {
          name: name
          image: containerImage
          env: [
            {
              name: 'FEATURE_GLOBE_3D'
              value: featureGlobe3d
            }
          ]
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

output fqdn string = containerApp.properties.configuration.ingress.fqdn
output name string = containerApp.name
