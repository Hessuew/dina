import { createServerFn } from '@tanstack/react-start'
import { eq, inArray } from 'drizzle-orm'
import z from 'zod'
import { getDb } from '@/db'
import { courseTeachers, courses, profiles } from '@/db/schema'
import { updateCourseTeachersSchema } from '@/schemas/course.schema'
import { getCurrentUser } from '@/utils/auth/auth'
import { authz, withRequestCache } from '@/utils/authz'

type Db = Awaited<ReturnType<typeof getDb>>

/**
 * Validates that two teacher IDs are different and both have teacher/admin role
 */
export async function validateTeacherPair(
  db: Db,
  teacher1Id: string,
  teacher2Id: string,
  allowAdmin = false,
): Promise<void> {
  if (teacher1Id === teacher2Id) {
    throw new Error('Must assign 2 different teachers to a course')
  }

  const teachers = await db.query.profiles.findMany({
    where: inArray(profiles.id, [teacher1Id, teacher2Id]),
  })

  if (teachers.length !== 2) {
    throw new Error('One or both teachers not found')
  }

  const teacher1 = teachers.find((t: any) => t.id === teacher1Id)
  const teacher2 = teachers.find((t: any) => t.id === teacher2Id)

  if (
    teacher1?.role !== 'teacher' &&
    (!allowAdmin || teacher1?.role !== 'admin')
  ) {
    throw new Error(`${teacher1?.fullName || 'Teacher 1'} is not a teacher`)
  }
  if (
    teacher2?.role !== 'teacher' &&
    (!allowAdmin || teacher2?.role !== 'admin')
  ) {
    throw new Error(`${teacher2?.fullName || 'Teacher 2'} is not a teacher`)
  }
}

/**
 * Assigns two teachers to a course, replacing any existing assignments
 * Enforces the 2-teacher invariant
 */
export async function assignTeachersToCourse(
  db: Db,
  courseId: string,
  teacher1Id: string,
  teacher2Id: string,
  allowAdmin = false,
): Promise<void> {
  await validateTeacherPair(db, teacher1Id, teacher2Id, allowAdmin)

  // Delete existing teacher assignments
  await db.delete(courseTeachers).where(eq(courseTeachers.courseId, courseId))

  // Insert new teacher assignments
  await db.insert(courseTeachers).values([
    { courseId, teacherId: teacher1Id },
    { courseId, teacherId: teacher2Id },
  ])
}

/**
 * Gets teachers assigned to a specific course
 */
export const getCourseTeachers = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ courseId: z.uuid() }))
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    const db = await getDb()

    const profile = await db.query.profiles.findFirst({
      where: eq(profiles.id, user.id),
    })

    if (!profile) {
      throw new Error('Profile not found')
    }

    const courseTeachersList = await db.query.courseTeachers.findMany({
      where: eq(courseTeachers.courseId, data.courseId),
      with: {
        teacher: {
          columns: {
            id: true,
            fullName: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    })

    return {
      teachers: courseTeachersList.map((ct) => ct.teacher),
    }
  })

/**
 * Updates teachers assigned to a course
 * Admin-only operation
 */
export const updateCourseTeachers = createServerFn({ method: 'POST' })
  .inputValidator(updateCourseTeachersSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()

    return withRequestCache(async () => {
      const db = await getDb()

      await authz(user.id).hasRole('admin')

      // Verify course exists
      const course = await db.query.courses.findFirst({
        where: eq(courses.id, data.courseId),
      })

      if (!course) {
        throw new Error('Course not found')
      }

      await assignTeachersToCourse(
        db,
        data.courseId,
        data.teacher1Id,
        data.teacher2Id,
      )

      return { success: true }
    })
  })
