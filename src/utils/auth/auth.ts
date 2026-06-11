import { eq } from 'drizzle-orm'
import { getDb } from '@/db'
import { profiles } from '@/db/schema'
import { AuthenticationError, NotFoundError } from '@/utils/errors'
import { getSupabaseServerClient } from '@/utils/supabase'

/**
 * Get the currently authenticated user from Supabase
 * Throws an error if not authenticated
 * @returns The authenticated user's ID and email
 */
export async function getCurrentUser() {
  const supabase = getSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new AuthenticationError('Not authenticated')
  }

  return user
}

/**
 * Get user profile with role information
 * @param userId - The Supabase user ID (UUID)
 */
export async function getUserProfile(userId: string) {
  const db = await getDb()
  const user = await db.query.profiles.findFirst({
    where: eq(profiles.id, userId),
  })

  if (!user) {
    throw new NotFoundError('User profile not found', {
      details: { userId },
    })
  }

  return user
}
