import type { Favorite, FavoriteResourceType } from '../types/favorite'

const FAVORITES_URL = `${window.location.origin}/api/favorites`
const CSRF_COOKIE = 'XSRF-TOKEN'
const CSRF_HEADER = 'X-CSRF-TOKEN'

type FavoriteResponse = {
  id: number
  resourceType: string
  resourceId: number
  createAt: string
}

type CreateFavoriteResponse = FavoriteResponse

function toFavorite(response: FavoriteResponse): Favorite {
  return {
    id: response.id,
    resourceType: response.resourceType.toLowerCase() as FavoriteResourceType,
    resourceId: response.resourceId,
    createAt: response.createAt,
  }
}

function csrfToken(): string | null {
  const cookie = document.cookie
    .split('; ')
    .find((entry) => entry.startsWith(`${CSRF_COOKIE}=`))

  return cookie ? decodeURIComponent(cookie.slice(CSRF_COOKIE.length + 1)) : null
}

async function request<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    ...init,
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      ...init?.headers,
    },
  })

  if (!response.ok) {
    const error = new Error(
      response.status === 401 ? 'You must be signed in to manage favorites.' : 'Favorites could not be updated.',
    )
    Object.assign(error, { status: response.status })
    throw error
  }

  if (response.status === 204) {
    return undefined as T
  }

  return response.json() as Promise<T>
}

export function fetchFavorites(): Promise<Favorite[]> {
  return request<FavoriteResponse[]>(FAVORITES_URL).then((favorites) => favorites.map(toFavorite))
}

export function createFavorite(resourceType: FavoriteResourceType, resourceId: number): Promise<Favorite> {
  const token = csrfToken()

  return request<CreateFavoriteResponse>(FAVORITES_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { [CSRF_HEADER]: token } : {}),
    },
    body: JSON.stringify({ resourceType, resourceId }),
  }).then(toFavorite)
}

export function deleteFavorite(id: number): Promise<void> {
  const token = csrfToken()

  return request<void>(`${FAVORITES_URL}/${id}`, {
    method: 'DELETE',
    headers: token ? { [CSRF_HEADER]: token } : {},
  })
}
