import { useCallback, useEffect, useState } from 'react'

import { shouldRefetch } from './domain/cache-refetch.domain'

const DEFAULT_CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

type UseCachedDataResult<T> = {
  data: Array<T>
  isLoading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

export function useCachedData<TResponse, TData>(
  shouldFetch: boolean,
  fetchFn: () => Promise<TResponse>,
  extractFn: (response: TResponse) => Array<TData>,
  cacheDuration: number = DEFAULT_CACHE_DURATION,
): UseCachedDataResult<TData> {
  const [data, setData] = useState<Array<TData>>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [lastFetchTime, setLastFetchTime] = useState<number | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const result = await fetchFn()
      setData(extractFn(result))
      setLastFetchTime(Date.now())
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch data'))
    } finally {
      setIsLoading(false)
    }
  }, [fetchFn, extractFn])

  useEffect(() => {
    if (
      shouldRefetch({
        shouldFetch,
        isLoading,
        lastFetchTime,
        now: Date.now(),
        cacheDuration,
      })
    ) {
      fetchData()
    }
  }, [shouldFetch, cacheDuration, isLoading, lastFetchTime, fetchData])

  return {
    data,
    isLoading,
    error,
    refetch: fetchData,
  }
}
