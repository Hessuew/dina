import { eq } from 'drizzle-orm'
import * as Sentry from '@sentry/tanstackstart-react'
import type { UserContext } from '@/utils/auth/domain/user-context.domain'
import { getDb } from '@/db'
import { profiles } from '@/db/schema'
import { AuthenticationError, NotFoundError } from '@/utils/errors'
import {
  buildUserContext,
  isAuthenticatedUser,
} from '@/utils/auth/domain/user-context.domain'
import { logServerEvent } from '@/utils/observability/logger'
import { elapsedMs, getRequestId } from '@/utils/observability/request-context'
import { signPrivateStoragePath } from '@/utils/storage/service/private-storage.service'
import { getSupabaseServerClient } from '@/utils/supabase'

type RootUserProfile = Pick<
  typeof profiles.$inferSelect,
  'avatarUrl' | 'bio' | 'fullName' | 'role'
>

async function loadRootUserProfile(
  userId: string,
  startedAt: number,
): Promise<RootUserProfile | undefined> {
  try {
    const db = await getDb()
    return await db.query.profiles.findFirst({
      where: eq(profiles.id, userId),
      columns: {
        avatarUrl: true,
        bio: true,
        fullName: true,
        role: true,
      },
    })
  } catch (error) {
    logServerEvent('error', 'auth_profile_lookup_failed', {
      requestId: getRequestId(),
      path: 'auth:fetchUser',
      status: 'failure',
      durationMs: elapsedMs(startedAt),
      userId,
      errorCategory: 'auth_profile_read_persistence',
    })
    throw error
  }
}

export async function getRootUserContext(): Promise<UserContext | null> {
  const supabase = getSupabaseServerClient()
  const startedAt = performance.now()
  let authResult: Awaited<ReturnType<typeof supabase.auth.getUser>>

  try {
    authResult = await supabase.auth.getUser()
  } catch (error) {
    logServerEvent('error', 'auth_session_lookup_failed', {
      requestId: getRequestId(),
      path: 'auth:fetchUser',
      status: 'failure',
      durationMs: elapsedMs(startedAt),
      errorCategory: 'auth_session_lookup',
    })
    throw error
  }

  const { user } = authResult.data
  if (!isAuthenticatedUser(user)) return null

  const profile = await loadRootUserProfile(user.id, startedAt)
  const signedProfile = profile
    ? {
        ...profile,
        avatarUrl: await signPrivateStoragePath('avatars', profile.avatarUrl),
      }
    : undefined
  return buildUserContext(user, signedProfile)
}

/**
 * Get the currently authenticated user from Supabase
 * Throws an error if not authenticated
 * @returns The authenticated user's ID and email
 */
export async function getCurrentUser() {
  const supabase = getSupabaseServerClient()
  const startedAt = performance.now()
  let authResult: Awaited<ReturnType<typeof supabase.auth.getUser>>

  try {
    authResult = await supabase.auth.getUser()
  } catch (error) {
    logServerEvent('error', 'auth_session_lookup_failed', {
      requestId: getRequestId(),
      path: 'auth:getCurrentUser',
      status: 'failure',
      durationMs: elapsedMs(startedAt),
      errorCategory: 'auth_session_lookup',
    })
    throw error
  }

  const { user } = authResult.data

  if (!user) {
    throw new AuthenticationError('Not authenticated')
  }

  // Tag the request's Sentry isolation scope with the acting user so server
  // errors are traceable. Set here (the auth boundary) rather than in a
  // permission middleware — identity is separate from authorization.
  Sentry.setUser({ id: user.id, email: user.email })

  return user
}

/**
 * Get user profile with role information
 * @param userId - The Supabase user ID (UUID)
 */
export async function getUserProfile(userId: string) {
  const startedAt = performance.now()
  const user = await (async () => {
    try {
      const db = await getDb()
      return await db.query.profiles.findFirst({
        where: eq(profiles.id, userId),
      })
    } catch (error) {
      logServerEvent('error', 'auth_profile_lookup_failed', {
        requestId: getRequestId(),
        path: 'auth:getUserProfile',
        status: 'failure',
        durationMs: elapsedMs(startedAt),
        userId,
        errorCategory: 'auth_profile_read_persistence',
      })
      throw error
    }
  })()

  if (!user) {
    throw new NotFoundError('User profile not found', {
      details: { userId },
    })
  }

  return user
}
