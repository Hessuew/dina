import { and, eq } from 'drizzle-orm'
import { db } from '@/db'
import { courseTeachers, enrollments, profiles } from '@/db/schema'
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
 * Check if a user has a specific role
 * @param userId - The Supabase user ID (UUID)
 * @param role - The required role ('student', 'teacher', or 'admin')
 */
export async function requireRole(
  userId: string,
  role: 'student' | 'teacher' | 'admin',
): Promise<void> {
  const user = await db.query.profiles.findFirst({
    where: eq(profiles.id, userId),
  })

  if (!user) {
    throw new Error('User profile not found')
  }

  if (user.role !== role) {
    throw new Error(`${role} access required`)
  }
}

/**
 * Verify that a user is an admin
 * @param userId - The Supabase user ID (UUID)
 */
export async function requireAdmin(userId: string): Promise<void> {
  await requireRole(userId, 'admin')
}

/**
 * Verify that a user is a teacher
 * @param userId - The Supabase user ID (UUID)
 */
export async function requireTeacher(userId: string): Promise<void> {
  await requireRole(userId, 'teacher')
}

/**
 * Check if a user is the teacher of a specific course
 * Checks the course_teachers junction table
 * @param userId - The Supabase user ID (UUID)
 * @param courseId - The course ID to check
 */
export async function requireTeacherOfCourse(
  userId: string,
  courseId: string,
): Promise<void> {
  const isTeacher = await db.query.courseTeachers.findFirst({
    where: and(
      eq(courseTeachers.courseId, courseId),
      eq(courseTeachers.teacherId, userId),
    ),
  })

  if (!isTeacher) {
    throw new Error('Not authorized to access this course')
  }
}

/**
 * Check if a user is enrolled in a specific course with active status
 * @param userId - The Supabase user ID (UUID)
 * @param courseId - The course ID to check
 */
export async function requireEnrolledInCourse(
  userId: string,
  courseId: string,
): Promise<void> {
  const enrollment = await db.query.enrollments.findFirst({
    where: and(
      eq(enrollments.studentId, userId),
      eq(enrollments.courseId, courseId),
      eq(enrollments.status, 'active'),
    ),
  })

  if (!enrollment) {
    throw new Error('Not enrolled in this course')
  }
}

/**
 * Check if a user can access a course (either as teacher or enrolled student)
 * @param userId - The Supabase user ID (UUID)
 * @param courseId - The course ID to check
 * @returns 'teacher' | 'student' - The user's role in the course
 */
export async function getCourseAccess(
  userId: string,
  courseId: string,
): Promise<'teacher' | 'student'> {
  // Check if teacher via course_teachers junction table
  const isTeacher = await db.query.courseTeachers.findFirst({
    where: and(
      eq(courseTeachers.courseId, courseId),
      eq(courseTeachers.teacherId, userId),
    ),
  })

  if (isTeacher) {
    return 'teacher'
  }

  // Check if enrolled student
  const enrollment = await db.query.enrollments.findFirst({
    where: and(
      eq(enrollments.studentId, userId),
      eq(enrollments.courseId, courseId),
      eq(enrollments.status, 'active'),
    ),
  })

  if (enrollment) {
    return 'student'
  }

  throw new Error('Not authorized to access this course')
}

/**
 * Get user profile with role information
 * @param userId - The Supabase user ID (UUID)
 */
export async function getUserProfile(userId: string) {
  const user = await db.query.profiles.findFirst({
    where: eq(profiles.id, userId),
  })

  if (!user) {
    throw new Error('User profile not found')
  }

  return user
}

/**
 * Check if user is admin (returns boolean instead of throwing)
 * @param userId - The Supabase user ID (UUID)
 */
export async function isAdmin(userId: string): Promise<boolean> {
  const user = await db.query.profiles.findFirst({
    where: eq(profiles.id, userId),
  })

  return user?.role === 'admin'
}
