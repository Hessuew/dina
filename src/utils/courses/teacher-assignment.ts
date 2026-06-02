import { createServerFn } from '@tanstack/react-start'
import z from 'zod'
import { validateSameTeacher, validateTeacherRoles } from './domain/teacher-assignment.domain'
import {
  deleteTeacherAssignments,
  findCourseById,
  findCourseTeachers,
  findProfileById,
  findTeachersByIds,
  insertTeacherAssignments,
} from './repository'
import { updateCourseTeachersSchema } from '@/schemas/course.schema'
import { getCurrentUser } from '@/utils/auth/auth'
import { authz, withRequestCache } from '@/utils/authz'
import { NotFoundError } from '@/utils/errors'
import { getDb } from '@/db'

type Db = Awaited<ReturnType<typeof getDb>>

export async function validateTeacherPair(
  db: Db,
  teacher1Id: string,
  teacher2Id: string,
  allowAdmin = false,
): Promise<void> {
  validateSameTeacher(teacher1Id, teacher2Id)
  const teachers = await findTeachersByIds(db, [teacher1Id, teacher2Id])
  validateTeacherRoles(teachers, teacher1Id, teacher2Id, allowAdmin)
}

export async function assignTeachersToCourse(
  db: Db,
  courseId: string,
  teacher1Id: string,
  teacher2Id: string,
  allowAdmin = false,
): Promise<void> {
  await validateTeacherPair(db, teacher1Id, teacher2Id, allowAdmin)
  await deleteTeacherAssignments(db, courseId)
  await insertTeacherAssignments(db, courseId, teacher1Id, teacher2Id)
}

export const getCourseTeachers = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ courseId: z.uuid() }))
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    const db = await getDb()

    const profile = await findProfileById(db, user.id)
    if (!profile) {
      throw new NotFoundError('Profile not found', {
        details: { userId: user.id },
      })
    }

    const courseTeachersList = await findCourseTeachers(db, data.courseId)
    return { teachers: courseTeachersList.map((ct) => ct.teacher) }
  })

export const updateCourseTeachers = createServerFn({ method: 'POST' })
  .inputValidator(updateCourseTeachersSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()

    return withRequestCache(async () => {
      const db = await getDb()

      await authz(user.id).hasRole('admin')

      const course = await findCourseById(db, data.courseId)
      if (!course) {
        throw new NotFoundError('Course not found', {
          code: 'COURSE_NOT_FOUND',
          details: { courseId: data.courseId },
        })
      }

      await assignTeachersToCourse(db, data.courseId, data.teacher1Id, data.teacher2Id)

      return { success: true }
    })
  })
