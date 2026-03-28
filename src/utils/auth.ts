import { auth } from '@clerk/tanstack-react-start/server'
import { and, eq } from 'drizzle-orm'
import { db } from '@/db'
import { courses, enrollments, profiles } from '@/db/schema'

/**
 * Get the authenticated user's ID from Clerk
 * Throws an error if the user is not authenticated
 */
export async function requireAuth(): Promise<string> {
  const { userId } = await auth()

  if (!userId) {
    throw new Error('Authentication required')
  }

  return userId
}

/**
 * Check if a user has a specific role
 * @param userId - The Clerk user ID
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
 * @param userId - The Clerk user ID
 */
export async function requireAdmin(userId: string): Promise<void> {
  await requireRole(userId, 'admin')
}

/**
 * Verify that a user is a teacher
 * @param userId - The Clerk user ID
 */
export async function requireTeacher(userId: string): Promise<void> {
  await requireRole(userId, 'teacher')
}

/**
 * Check if a user is the teacher of a specific course
 * @param userId - The Clerk user ID
 * @param courseId - The course ID to check
 */
export async function requireTeacherOfCourse(
  userId: string,
  courseId: string,
): Promise<void> {
  const course = await db.query.courses.findFirst({
    where: and(eq(courses.id, courseId), eq(courses.teacherId, userId)),
  })

  if (!course) {
    throw new Error('Not authorized to access this course')
  }
}

/**
 * Check if a user is enrolled in a specific course with active status
 * @param userId - The Clerk user ID
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
 * @param userId - The Clerk user ID
 * @param courseId - The course ID to check
 * @returns 'teacher' | 'student' - The user's role in the course
 */
export async function getCourseAccess(
  userId: string,
  courseId: string,
): Promise<'teacher' | 'student'> {
  // Check if teacher
  const course = await db.query.courses.findFirst({
    where: and(eq(courses.id, courseId), eq(courses.teacherId, userId)),
  })

  if (course) {
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
 * @param userId - The Clerk user ID
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
 * @param userId - The Clerk user ID
 */
export async function isAdmin(userId: string): Promise<boolean> {
  const user = await db.query.profiles.findFirst({
    where: eq(profiles.id, userId),
  })

  return user?.role === 'admin'
}
