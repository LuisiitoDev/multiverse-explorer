import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { createFavorite, deleteFavorite, fetchFavorites } from '../services/favoritesApi'
import type { Favorite, FavoriteResourceType } from '../types/favorite'
import { useFeatureFlag } from '../hooks/useFeatureFlag'

type FavoriteError = Error & { status?: number }

type FavoritesContextValue = {
  favorites: Favorite[]
  isLoading: boolean
  error: string | null
  isAuthenticated: boolean | null
  pendingKey: string | null
  refresh: () => Promise<void>
  add: (resourceType: FavoriteResourceType, resourceId: number) => Promise<void>
  remove: (favoriteId: number) => Promise<void>
  find: (resourceType: FavoriteResourceType, resourceId: number) => Favorite | undefined
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null)

function favoriteKey(resourceType: FavoriteResourceType, resourceId: number) {
  return `${resourceType}:${resourceId}`
}

export function FavoritesProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const isEnabled = useFeatureFlag('myMultiverse')
  const [favorites, setFavorites] = useState<Favorite[]>([])
  const [isLoading, setIsLoading] = useState(isEnabled)
  const [error, setError] = useState<string | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [pendingKey, setPendingKey] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!isEnabled) return

    setIsLoading(true)
    setError(null)

    try {
      setFavorites(await fetchFavorites())
      setIsAuthenticated(true)
    } catch (caught) {
      const failure = caught as FavoriteError
      if (failure.status === 401) {
        setFavorites([])
        setIsAuthenticated(false)
        setError(null)
      } else {
        setError(failure.message)
      }
    } finally {
      setIsLoading(false)
    }
  }, [isEnabled])

  useEffect(() => {
    if (isEnabled) queueMicrotask(() => void refresh())
  }, [isEnabled, refresh])

  const add = useCallback(async (resourceType: FavoriteResourceType, resourceId: number) => {
    if (!isEnabled) return

    const key = favoriteKey(resourceType, resourceId)
    if (favorites.some((favorite) => favoriteKey(favorite.resourceType, favorite.resourceId) === key)) {
      return
    }

    setPendingKey(key)
    setError(null)
    try {
      const favorite = await createFavorite(resourceType, resourceId)
      setFavorites((current) =>
        current.some((item) => item.id === favorite.id || favoriteKey(item.resourceType, item.resourceId) === key)
          ? current
          : [...current, favorite],
      )
      setIsAuthenticated(true)
    } catch (caught) {
      const failure = caught as FavoriteError
      if (failure.status === 401) {
        setIsAuthenticated(false)
      }
      setError(failure.message)
      throw failure
    } finally {
      setPendingKey(null)
    }
  }, [favorites, isEnabled])

  const remove = useCallback(async (favoriteId: number) => {
    if (!isEnabled) return

    setPendingKey(`id:${favoriteId}`)
    setError(null)
    try {
      await deleteFavorite(favoriteId)
      setFavorites((current) => current.filter((favorite) => favorite.id !== favoriteId))
    } catch (caught) {
      const failure = caught as FavoriteError
      setError(failure.message)
      throw failure
    } finally {
      setPendingKey(null)
    }
  }, [isEnabled])

  const value = useMemo<FavoritesContextValue>(() => ({
    favorites,
    isLoading,
    error,
    isAuthenticated,
    pendingKey,
    refresh,
    add,
    remove,
    find: (resourceType, resourceId) =>
      favorites.find((favorite) => favorite.resourceType === resourceType && favorite.resourceId === resourceId),
  }), [add, error, favorites, isAuthenticated, isLoading, pendingKey, refresh, remove])

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>
}

export function useFavorites() {
  const context = useContext(FavoritesContext)
  if (!context) {
    throw new Error('useFavorites must be used within FavoritesProvider')
  }
  return context
}
