import { createServerFn } from '@tanstack/react-start'
import z from 'zod'
import { isCourseTeacherService } from './service/teachers.service'
import { getCurrentUser } from '@/utils/auth/auth'

export const isCurrentUserCourseTeacher = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ courseId: z.uuid() }))
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    return isCourseTeacherService(data.courseId, user.id)
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
