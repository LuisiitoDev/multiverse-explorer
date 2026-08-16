import { useEffect, useState } from 'react'
import { fetchCharactersByUrls } from '../services/rickAndMortyApi'
import type { Character } from '../types/character'

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}

/**
 * Resolves a location's resident URLs on demand.
 *
 * Mounted only while a location is open, so no resident data is fetched for the
 * map's nodes up front -- one batched request per opened location, and none at
 * all for a location with no residents.
 */
export function useLocationResidents(residentUrls: string[]) {
  const hasResidents = residentUrls.length > 0
  // Seeded from the resident count rather than corrected inside the effect, so
  // a location with no residents never enters a loading state at all.
  const [residents, setResidents] = useState<Character[]>([])
  const [isLoading, setIsLoading] = useState(hasResidents)
  const [error, setError] = useState<string | null>(null)
  const [retryToken, setRetryToken] = useState(0)

  useEffect(() => {
    if (!hasResidents) {
      return
    }

    const controller = new AbortController()

    const load = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const data = await fetchCharactersByUrls(residentUrls, controller.signal)
        setResidents(data)
      } catch (requestError) {
        if (isAbortError(requestError)) {
          return
        }

        setError(
          requestError instanceof Error ? requestError.message : 'An unexpected error occurred.',
        )
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      }
    }

    void load()

    return () => controller.abort()
    // residentUrls belongs to the location this panel was opened for and does
    // not change while it is open; retryToken forces a manual refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retryToken])

  const retry = () => setRetryToken((token) => token + 1)

  return { residents, isLoading, error, retry }
}
