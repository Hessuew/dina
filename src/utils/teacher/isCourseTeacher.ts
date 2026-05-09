import { createServerFn } from '@tanstack/react-start'
import { and, eq } from 'drizzle-orm'
import z from 'zod'
import { getDb } from '@/db'
import { courseTeachers } from '@/db/schema'
import { getCurrentUser } from '@/utils/auth/auth'

export const isCurrentUserCourseTeacher = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ courseId: z.uuid() }))
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    const db = await getDb()

    const assignment = await db.query.courseTeachers.findFirst({
      where: and(
        eq(courseTeachers.courseId, data.courseId),
        eq(courseTeachers.teacherId, user.id),
      ),
    })

    return { isCourseTeacher: Boolean(assignment) }
  })

/**
 * Checks if the current user is a teacher of the course
 * @param course - The course object
 * @param userId - The user ID
 * @returns True if the user is a teacher of the course, false otherwise
 */
export const isUserCourseTeacher = (course: any, userId: string) => {
  return course.teacher1Id === userId || course.teacher2Id === userId
}
