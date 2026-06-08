import { sortTeachers } from '@/utils/teachers/domain/teachers.domain'
import {
  findAllTeachers,
  findAllTeachersSimple,
  findCourseTeacher,
  findTeacherCourseAssignment,
} from '@/utils/teachers/repository'
import { authz, withRequestCache } from '@/utils/authz'

export async function getTeachersService() {
  const teachers = await findAllTeachers()

  const teachersWithCourses = await Promise.all(
    teachers.map(async (teacher) => {
      const teacherAssignments = await findTeacherCourseAssignment(teacher.id)

      return {
        id: teacher.id,
        fullName: teacher.fullName,
        email: teacher.email,
        bio: teacher.bio,
        avatarUrl: teacher.avatarUrl,
        createdAt: teacher.createdAt,
        course: teacherAssignments?.course,
        lecturerTitle: teacher.lecturerTitle,
        gemstone: teacher.gemstone ?? null,
      }
    }),
  )

  return { teachers: sortTeachers(teachersWithCourses) }
}

export async function getAllTeachersService(userId: string) {
  return withRequestCache(async () => {
    await authz(userId).hasRole('admin')

    const teachers = await findAllTeachersSimple()

    return { teachers }
  })
}

export async function isCourseTeacherService(courseId: string, userId: string) {
  const assignment = await findCourseTeacher(courseId, userId)
  return { isCourseTeacher: Boolean(assignment) }
}
