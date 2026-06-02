import { createServerFn } from '@tanstack/react-start'
import { getCurrentUser } from '@/utils/auth/auth'
import { authz, withRequestCache } from '@/utils/authz'
import { sortTeachers } from '@/utils/teachers/domain/teachers.domain'
import {
  findAllTeachers,
  findAllTeachersSimple,
  findTeacherCourseAssignment,
} from '@/utils/teachers/repository'

export const getTeachers = createServerFn({ method: 'POST' }).handler(
  async () => {
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

    const sortedTeachers = sortTeachers(teachersWithCourses)

    return { teachers: sortedTeachers }
  },
)

export const getAllTeachers = createServerFn({ method: 'POST' }).handler(
  async () => {
    const user = await getCurrentUser()

    return withRequestCache(async () => {
      await authz(user.id).hasRole('admin')

      const teachers = await findAllTeachersSimple()

      return { teachers }
    })
  },
)
