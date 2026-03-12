import { createServerFn } from '@tanstack/react-start'
import { getSupabaseServerClient } from './supabase'
import { db, profiles } from '../db'
import { eq } from 'drizzle-orm'
import type { UserRole } from '../types/database.types'

// ============================================================================
// USER PROFILE FUNCTIONS
// ============================================================================

export const getUserProfile = createServerFn({ method: 'GET' }).handler(
  async () => {
    const supabase = getSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return null
    }

    // Use Drizzle to fetch profile
    const profile = await db.query.profiles.findFirst({
      where: (profiles, { eq }) => eq(profiles.id, user.id),
    })

    return profile || null
  },
)

// ============================================================================
// AUTHENTICATION FUNCTIONS
// ============================================================================

export const signUpWithRole = createServerFn({ method: 'POST' })
  .inputValidator(
    (d: { email: string; password: string; fullName: string; role: UserRole }) =>
      d,
  )
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
    })

    if (authError) {
      return {
        error: true,
        message: authError.message,
      }
    }

    if (!authData.user) {
      return {
        error: true,
        message: 'Failed to create user',
      }
    }

    // Create profile using Drizzle
    try {
      await db.insert(profiles).values({
        id: authData.user.id,
        email: data.email,
        fullName: data.fullName,
        role: data.role,
      })

      return {
        error: false,
        message: 'Account created successfully',
      }
    } catch (error) {
      return {
        error: true,
        message: error instanceof Error ? error.message : 'Failed to create profile',
      }
    }
  })

export const loginWithEmail = createServerFn({ method: 'POST' })
  .inputValidator((d: { email: string; password: string }) => d)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    })

    if (error) {
      return {
        error: true,
        message: error.message,
      }
    }

    return {
      error: false,
      message: 'Logged in successfully',
    }
  })

export const logoutUser = createServerFn({ method: 'POST' }).handler(
  async () => {
    const supabase = getSupabaseServerClient()
    const { error } = await supabase.auth.signOut()

    if (error) {
      return {
        error: true,
        message: error.message,
      }
    }

    return {
      error: false,
      message: 'Logged out successfully',
    }
  },
)

// ============================================================================
// ROLE CHECKING HELPERS
// ============================================================================

export function hasRole(
  profile: { role: UserRole } | null,
  role: UserRole,
): boolean {
  return profile?.role === role
}

export function hasAnyRole(
  profile: { role: UserRole } | null,
  roles: UserRole[],
): boolean {
  return profile ? roles.includes(profile.role) : false
}

export function isStudent(profile: { role: UserRole } | null): boolean {
  return hasRole(profile, 'student')
}

export function isTeacher(profile: { role: UserRole } | null): boolean {
  return hasRole(profile, 'teacher')
}

export function isAdmin(profile: { role: UserRole } | null): boolean {
  return hasRole(profile, 'admin')
}
