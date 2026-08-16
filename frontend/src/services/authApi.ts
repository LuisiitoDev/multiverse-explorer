const AUTH_BASE_URL = `${window.location.origin}/api/auth`

export type AuthProvider = {
  name: string
  displayName: string
}

export function fetchProviders(): Promise<AuthProvider[]> {
  return fetch(`${AUTH_BASE_URL}/providers`, { credentials: 'include' }).then((res) => {
    if (!res.ok) throw new Error('Could not load auth providers.')
    return res.json() as Promise<AuthProvider[]>
  })
}

export function loginUrl(provider: string, returnUrl: string): string {
  return `${AUTH_BASE_URL}/login/${encodeURIComponent(provider)}?returnUrl=${encodeURIComponent(returnUrl)}`
}
