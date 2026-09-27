param location string = resourceGroup().location
param containerImage string = 'mcr.microsoft.com/azuredocs/containerapps-helloworld:latest'
param containerPort int = 80
param appName string


resource environment 'Microsoft.App/managedEnvironments@2026-01-01' = {
    name: '${appName}-env'
    location: location
    properties: {}
}

resource identity 'Microsoft.ManagedIdentity/userAssignedIdentities@2024-11-30' = {
    name: '${appName}-identity'
    location: location
}

resource containerApp 'Microsoft.App/containerApps@2026-01-01' = {
    name: appName
    location: location
    identity:{
        type: 'UserAssigned'
        userAssignedIdentities: {
            '${identity.id}': {}
        }
    }
    properties: {
        managedEnvironmentId: environment.id
        configuration:{
            activeRevisionsMode: 'Multiple'
            ingress: {
                external: true
                targetPort: containerPort
                allowInsecure: false
                traffic:[
                    {
                        latestRevision: true 
                        weight: 100
                    }
                ]
            }
        }
        template:{
            containers: [
                {
                    name: 'app'
                    image: containerImage
                    resources: {
                        cpu: json('0.5')
                        memory: '0.5Gi'
                    }
                }
            ]
        }
    }
}

output appFqdn string = containerApp.properties.configuration.ingress.fqdn
