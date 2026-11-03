param location string = resourceGroup().location
param appName string
param containerImage string
param containerPort int = 8080

@description('''
Revision label ("blue" or "green") holding 100% of production traffic.
Leave empty only for the very first deployment, when no label exists yet and
traffic goes to the latest revision. Afterwards the swap workflow moves traffic
between the labels; deploying from IaC must pass the currently live label.
''')
@allowed([
  ''
  'blue'
  'green'
])
param activeLabel string = ''

@description('Runtime FEATURE_GLOBE_3D value; only "true" enables the 3D globe.')
param featureGlobe3d string = 'false'

module environment 'modules/environment.bicep' = {
  name: 'environment'
  params: {
    appName: appName
    location: location
  }
}

module containerApp 'modules/containerapp.bicep' = {
  name: 'containerApp'
  params: {
    name: appName
    location: location
    managedEnvironmentId: environment.outputs.environmentId
    identityId: environment.outputs.identityId
    containerImage: containerImage
    containerPort: containerPort
    activeLabel: activeLabel
    featureGlobe3d: featureGlobe3d
  }
}

output fqdn string = containerApp.outputs.fqdn
