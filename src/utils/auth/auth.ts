import { eq } from 'drizzle-orm'
import { getDb } from '@/db'
import { profiles } from '@/db/schema'
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
    throw new Error('Not authenticated')
  }

  return user
}

/**
 * Validate that a user ID is provided
 * Throws an error if the user ID is not provided
 * @param userId - The Supabase user ID (UUID)
 */
export function requireAuth(
  userId: string | undefined,
): asserts userId is string {
  if (!userId) {
    throw new Error('Authentication required')
  }
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
    throw new Error('User profile not found')
  }

  return user
}
