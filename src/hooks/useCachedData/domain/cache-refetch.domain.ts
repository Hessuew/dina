export type RefetchDecisionInput = {
  shouldFetch: boolean
  isLoading: boolean
  lastFetchTime: number | null
  now: number
  cacheDuration: number
}

export function shouldRefetch({
  shouldFetch,
  isLoading,
  lastFetchTime,
  now,
  cacheDuration,
}: RefetchDecisionInput): boolean {
  if (!shouldFetch) return false

  const isStale = !lastFetchTime || now - lastFetchTime > cacheDuration

  return isStale && !isLoading
}
