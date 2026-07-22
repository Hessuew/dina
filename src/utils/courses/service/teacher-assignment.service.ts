import type {
  GetCourseTeachersInput,
  UpdateCourseTeachersInput,
} from '@/schemas/course.schema'
import {
  validateSameTeacher,
  validateTeacherRoles,
} from '@/utils/courses/domain/teacher-assignment.domain'
import {
  findCourseById,
  findCourseTeachers,
  findTeachersByIds,
  replaceTeacherAssignments,
} from '@/utils/courses/repository'
import { getUserProfile } from '@/utils/auth/auth'
import { authz } from '@/utils/authz'
import { NotFoundError } from '@/utils/errors'

export async function validateTeacherPair(
  teacher1Id: string,
  teacher2Id: string,
  allowAdmin = false,
): Promise<void> {
  validateSameTeacher(teacher1Id, teacher2Id)
  const teachers = await findTeachersByIds([teacher1Id, teacher2Id])
  validateTeacherRoles(teachers, teacher1Id, teacher2Id, allowAdmin)
}

export async function assignTeachersToCourse(
  courseId: string,
  teacher1Id: string,
  teacher2Id: string,
  allowAdmin = false,
): Promise<void> {
  await validateTeacherPair(teacher1Id, teacher2Id, allowAdmin)
  await replaceTeacherAssignments(courseId, teacher1Id, teacher2Id)
}

export async function getCourseTeachersService(
  data: GetCourseTeachersInput,
  userId: string,
) {
  await getUserProfile(userId)
  const courseTeachersList = await findCourseTeachers(data.courseId)
  return { teachers: courseTeachersList.map((ct) => ct.teacher) }
}

export async function updateCourseTeachersService(
  data: UpdateCourseTeachersInput,
  userId: string,
) {
  await authz(userId).hasRole('admin')

  const course = await findCourseById(data.courseId)
  if (!course) {
    throw new NotFoundError('Course not found', {
      code: 'COURSE_NOT_FOUND',
      details: { courseId: data.courseId },
    })
  }

  await assignTeachersToCourse(data.courseId, data.teacher1Id, data.teacher2Id)

  return { success: true }
}
