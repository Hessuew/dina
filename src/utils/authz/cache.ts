import { AsyncLocalStorage } from 'node:async_hooks'

interface CacheEntry<T> {
  value: T
  timestamp: number
}

const CACHE_TTL = Infinity // Per-request cache never expires during request

interface RequestCache {
  roleChecks: Map<string, CacheEntry<boolean>>
  resourceChecks: Map<string, CacheEntry<boolean>>
}

const requestStorage = new AsyncLocalStorage<RequestCache>()

export function withRequestCache<T>(fn: () => Promise<T>): Promise<T> {
  const cache: RequestCache = {
    roleChecks: new Map(),
    resourceChecks: new Map(),
  }
  return requestStorage.run(cache, fn)
}

function getCache(): RequestCache | undefined {
  return requestStorage.getStore()
}

function isExpired(entry: CacheEntry<unknown>): boolean {
  return Date.now() - entry.timestamp > CACHE_TTL
}

export function getCachedRole(userId: string, role: string): boolean | null {
  const cache = getCache()
  if (!cache) return null

  const key = `${userId}:${role}`
  const entry = cache.roleChecks.get(key)

  if (!entry || isExpired(entry)) {
    cache.roleChecks.delete(key)
    return null
  }

  return entry.value
}

export function setCachedRole(
  userId: string,
  role: string,
  value: boolean,
): void {
  const cache = getCache()
  if (!cache) return

  const key = `${userId}:${role}`
  cache.roleChecks.set(key, { value, timestamp: Date.now() })
}

export function getCachedResourceCheck(key: string): boolean | null {
  const cache = getCache()
  if (!cache) return null

  const entry = cache.resourceChecks.get(key)

  if (!entry || isExpired(entry)) {
    cache.resourceChecks.delete(key)
    return null
  }

  return entry.value
}

export function setCachedResourceCheck(key: string, value: boolean): void {
  const cache = getCache()
  if (!cache) return

  cache.resourceChecks.set(key, { value, timestamp: Date.now() })
}
