const AUTH_BASE_URL = `${window.location.origin}/api/auth`

export function googleLoginUrl(returnUrl: string): string {
  return `${AUTH_BASE_URL}/login/google?returnUrl=${encodeURIComponent(returnUrl)}`
}
