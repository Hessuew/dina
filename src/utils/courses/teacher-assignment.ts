import { createServerFn } from '@tanstack/react-start'
import { eq, inArray } from 'drizzle-orm'
import z from 'zod'
import { getDb } from '@/db'
import { courseTeachers, courses, profiles } from '@/db/schema'
import { updateCourseTeachersSchema } from '@/schemas/course.schema'
import { getCurrentUser } from '@/utils/auth/auth'
import { authz, withRequestCache } from '@/utils/authz'
import { NotFoundError, ValidationError } from '@/utils/errors'

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
    throw new ValidationError('Must assign 2 different teachers to a course', {
      code: 'TEACHER_PAIR_INVALID',
      details: { teacher1Id, teacher2Id },
    })
  }

  const teachers = await db.query.profiles.findMany({
    where: inArray(profiles.id, [teacher1Id, teacher2Id]),
  })

  if (teachers.length !== 2) {
    throw new NotFoundError('One or both teachers not found', {
      details: { teacher1Id, teacher2Id },
    })
  }

  const teacher1 = teachers.find((t: any) => t.id === teacher1Id)
  const teacher2 = teachers.find((t: any) => t.id === teacher2Id)

  if (
    teacher1?.role !== 'teacher' &&
    (!allowAdmin || teacher1?.role !== 'admin')
  ) {
    throw new ValidationError(
      `${teacher1?.fullName || 'Teacher 1'} is not a teacher`,
      {
        details: { teacherId: teacher1Id, role: teacher1?.role },
      },
    )
  }
  if (
    teacher2?.role !== 'teacher' &&
    (!allowAdmin || teacher2?.role !== 'admin')
  ) {
    throw new ValidationError(
      `${teacher2?.fullName || 'Teacher 2'} is not a teacher`,
      {
        details: { teacherId: teacher2Id, role: teacher2?.role },
      },
    )
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
      throw new NotFoundError('Profile not found', {
        details: { userId: user.id },
      })
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
        throw new NotFoundError('Course not found', {
          code: 'COURSE_NOT_FOUND',
          details: { courseId: data.courseId },
        })
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
