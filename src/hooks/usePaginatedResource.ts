import { useEffect, useState } from 'react'
import type { ApiInfo } from '../types/character'

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}

type PageFetcher<TItem> = (
  page: number,
  signal?: AbortSignal,
) => Promise<{ results: TItem[]; info: ApiInfo | null }>

export function usePaginatedResource<TItem>(
  fetchPage: PageFetcher<TItem>,
  filterKey: string,
  enabled: boolean,
) {
  const [items, setItems] = useState<TItem[]>([])
  const [totalCount, setTotalCount] = useState<number | null>(null)
  const [totalPages, setTotalPages] = useState<number | null>(null)
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null)
  const [page, setPage] = useState(1)
  const [hasNextPage, setHasNextPage] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null)
  const [retryToken, setRetryToken] = useState(0)

  useEffect(() => {
    if (!enabled) {
      return
    }

    const controller = new AbortController()

    const load = async () => {
      setIsLoading(true)
      setError(null)
      setLoadMoreError(null)

      try {
        const data = await fetchPage(1, controller.signal)
        setItems(data.results)
        setTotalCount(data.info?.count ?? null)
        setTotalPages(data.info?.pages ?? null)
        setHasNextPage(Boolean(data.info?.next))
        setPage(1)
        setLastSyncedAt(Date.now())
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
    // fetchPage is a closure derived from the same inputs as filterKey, so it is
    // always in sync whenever this effect reruns.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey, enabled, retryToken])

  const loadMore = async () => {
    setIsLoadingMore(true)
    setLoadMoreError(null)

    try {
      const nextPage = page + 1
      const data = await fetchPage(nextPage)
      setItems((current) => [...current, ...data.results])
      setHasNextPage(Boolean(data.info?.next))
      setTotalPages(data.info?.pages ?? null)
      setPage(nextPage)
      setLastSyncedAt(Date.now())
    } catch (requestError) {
      setLoadMoreError(
        requestError instanceof Error
          ? requestError.message
          : 'Could not load more results.',
      )
    } finally {
      setIsLoadingMore(false)
    }
  }

  const goToPage = async (targetPage: number) => {
    setIsLoading(true)
    setError(null)

    try {
      const data = await fetchPage(targetPage)
      setItems(data.results)
      setHasNextPage(Boolean(data.info?.next))
      setTotalPages(data.info?.pages ?? null)
      setPage(targetPage)
      setLastSyncedAt(Date.now())
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'An unexpected error occurred.',
      )
    } finally {
      setIsLoading(false)
    }
  }

  const retry = () => setRetryToken((token) => token + 1)

  return {
    items,
    totalCount,
    totalPages,
    page,
    lastSyncedAt,
    isLoading,
    isLoadingMore,
    error,
    loadMoreError,
    hasNextPage,
    loadMore,
    goToPage,
    retry,
  }
}
