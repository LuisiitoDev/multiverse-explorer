import { useEffect, useState } from 'react'
import { fetchProviders } from '../services/authApi'
import type { AuthProvider } from '../services/authApi'

type AuthProvidersState = {
  providers: AuthProvider[]
  isLoading: boolean
}

export function useAuthProviders(): AuthProvidersState {
  const [providers, setProviders] = useState<AuthProvider[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchProviders()
      .then(setProviders)
      .catch(() => setProviders([]))
      .finally(() => setIsLoading(false))
  }, [])

  return { providers, isLoading }
}
