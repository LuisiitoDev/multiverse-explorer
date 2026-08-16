import { useEffect, useState } from 'react'
import { fetchEpisodesByUrls } from '../services/rickAndMortyApi'
import type { Episode } from '../types/episode'

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}

export function useCharacterEpisodes(episodeUrls: string[]) {
  const [episodes, setEpisodes] = useState<Episode[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retryToken, setRetryToken] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    const load = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const data = await fetchEpisodesByUrls(episodeUrls, controller.signal)
        setEpisodes(data)
      } catch (requestError) {
        if (isAbortError(requestError)) {
          return
        }

        setError(
          requestError instanceof Error
            ? requestError.message
            : 'An unexpected error occurred.',
        )
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      }
    }

    void load()

    return () => controller.abort()
    // episodeUrls comes from the character selected for this modal instance and
    // does not change while it is open; retryToken forces a manual refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retryToken])

  const retry = () => setRetryToken((token) => token + 1)

  return { episodes, isLoading, error, retry }
}
