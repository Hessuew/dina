import { describe, expect, it } from 'vitest'

import { shouldRefetch } from './cache-refetch.domain'

describe('shouldRefetch', () => {
  const base = {
    shouldFetch: true,
    isLoading: false,
    lastFetchTime: null,
    now: 1_000_000,
    cacheDuration: 5_000,
  }

  it('does not refetch when fetching is disabled', () => {
    expect(shouldRefetch({ ...base, shouldFetch: false })).toBe(false)
  })

  it('refetches on first run when there is no prior fetch time', () => {
    expect(shouldRefetch({ ...base, lastFetchTime: null })).toBe(true)
  })

  it('refetches when the cached data is older than the cache duration', () => {
    expect(shouldRefetch({ ...base, lastFetchTime: base.now - 6_000 })).toBe(
      true,
    )
  })

  it('does not refetch while the cache is still fresh', () => {
    expect(shouldRefetch({ ...base, lastFetchTime: base.now - 1_000 })).toBe(
      false,
    )
  })

  it('does not refetch while a fetch is already in flight', () => {
    expect(
      shouldRefetch({
        ...base,
        lastFetchTime: base.now - 6_000,
        isLoading: true,
      }),
    ).toBe(false)
  })
})
