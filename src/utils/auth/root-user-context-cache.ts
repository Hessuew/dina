import { createServerFn } from '@tanstack/react-start'

import type { UserContext } from '@/utils/auth/domain/user-context.domain'
import type { UserContextCacheEntry } from '@/utils/auth/domain/user-context-cache.domain'
import { getRootUserContext } from '@/utils/auth/auth'
import { readUserContextCache } from '@/utils/auth/domain/user-context-cache.domain'

const fetchUser = createServerFn({ method: 'GET' }).handler(getRootUserContext)

// Client-only cache: the server module scope is shared across requests.
const USER_CONTEXT_TTL_MS = 60_000
let cachedUserContext: UserContextCacheEntry<UserContext | null> | undefined
let pendingUserContext: Promise<UserContext | null> | undefined
let cacheEpoch = 0

export function clearRootUserContextCache() {
  cachedUserContext = undefined
  cacheEpoch += 1
}

function writeUserContextCache(epoch: number, fetchedAt: number) {
  return (user: UserContext | null) => {
    if (epoch === cacheEpoch) {
      cachedUserContext = { user, fetchedAt }
    }
    return user
  }
}

export async function resolveUserContext(): Promise<UserContext | null> {
  if (import.meta.env.SSR) return fetchUser()

  const cached = readUserContextCache(
    cachedUserContext,
    Date.now(),
    USER_CONTEXT_TTL_MS,
  )
  if (cached.hit) return cached.user
  if (pendingUserContext) return pendingUserContext

  const epoch = cacheEpoch
  const fetchedAt = Date.now()
  pendingUserContext = fetchUser()
    .then(writeUserContextCache(epoch, fetchedAt))
    .finally(() => {
      pendingUserContext = undefined
    })
  return pendingUserContext
}
