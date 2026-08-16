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
  // The frontend is a Vite build with content-hashed asset filenames, and each
  // revision only carries its own dist/. Without affinity a browser can load
  // index.html from one revision and then request its JS from the other, which
  // nginx answers with index.html (try_files) as text/html -- a blank page.
  // Affinity pins a visitor to a single revision for their session.
  stickySessions: {
    affinity: 'sticky'
  }
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
      // 'Multiple' is what allows two revisions to be alive at once. Under the
      // default 'Single', each deploy deactivates the previous revision and
      // takes 100% of traffic, so there is nothing to split.
      activeRevisionsMode: 'Multiple'
      // The traffic block is declared only while bootstrapping. Once the CD
      // pipeline sets weights by revision name, redeclaring them here would
      // reset the split on every infrastructure deploy, so the property is
      // omitted and Azure keeps whatever the pipeline last set.
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
