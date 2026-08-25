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
  // Sticky sessions would pin a visitor to one revision for their whole
  // session, which is what a canary split really wants -- but Container Apps
  // rejects session affinity outright when activeRevisionsMode is 'Multiple'
  // (ContainerAppInvalidIngressStickySessionRevisionMode), and Multiple mode
  // is required for two revisions to be alive at once. Accepted tradeoff:
  // without affinity, a Vite build's content-hashed assets mean a browser
  // mid-shift can load index.html from one revision and a JS chunk from the
  // other, which nginx's try_files answers with index.html instead -- a
  // blank page. The candidate's own labeled URL (0% traffic, single
  // revision) is unaffected, so smoke-testing before a shift is safe either
  // way; the exposure is only during a live 'shift' window.
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
