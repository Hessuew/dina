import type { profiles } from '@/db/schema'

/** Minimal shape of the Supabase auth user the route context depends on. */
type AuthUser = { id: string; email?: string | null }

/** Profile columns selected by the root `fetchUser` server function. */
type UserProfile = Pick<
  typeof profiles.$inferSelect,
  'avatarUrl' | 'bio' | 'fullName' | 'role'
>

/** The resolved route-context user built from the auth user + profile row. */
export type UserContext = {
  avatarUrl: UserProfile['avatarUrl'] | undefined
  bio: UserProfile['bio'] | undefined
  email: string
  id: string
  fullName: UserProfile['fullName'] | undefined
  role: UserProfile['role']
}

/**
 * Narrows a (possibly null) Supabase auth user to one with a usable email.
 * Mirrors the root route's `!data.user?.email` guard so the DB profile fetch
 * is only performed for authenticated users.
 */
export function isAuthenticatedUser(
  user: AuthUser | null | undefined,
): user is AuthUser & { email: string } {
  return Boolean(user?.email)
}

/**
 * Builds the route-context user object from the authenticated user and their
 * profile row, defaulting the role to `'student'` when no profile is present.
 */
export function buildUserContext(
  user: { id: string; email: string },
  profile: UserProfile | undefined,
): UserContext {
  return {
    avatarUrl: profile?.avatarUrl,
    bio: profile?.bio,
    email: user.email,
    id: user.id,
    fullName: profile?.fullName,
    role: profile?.role || 'student',
  }
}
