import { createServerFn } from '@tanstack/react-start'
import { eq, inArray } from 'drizzle-orm'
import { getDb } from '@/db'
import { courseTeachers, profiles } from '@/db/schema'
import { getCurrentUser } from '@/utils/auth/auth'
import { authz, withRequestCache } from '@/utils/authz'
import { sortTeachers } from './domain/teachers.domain'

export const getTeachers = createServerFn({ method: 'POST' }).handler(
  async () => {
    const db = await getDb()

    const teachers = await db.query.profiles.findMany({
      where: inArray(profiles.role, ['teacher', 'admin']),
      orderBy: (t, { asc }) => [asc(t.fullName)],
    })

    const teachersWithCourses = await Promise.all(
      teachers.map(async (teacher) => {
        const teacherAssignments = await db.query.courseTeachers.findFirst({
          where: eq(courseTeachers.teacherId, teacher.id),
          with: {
            course: {
              columns: {
                id: true,
                title: true,
                description: true,
                isPublished: true,
                createdAt: true,
                orderIndex: true,
              },
            },
          },
          orderBy: (ct, { desc }) => [desc(ct.createdAt)],
        })

        // order by the teachers course orderIndex, and by the teacher's creation date
        return {
          id: teacher.id,
          fullName: teacher.fullName,
          email: teacher.email,
          bio: teacher.bio,
          avatarUrl: teacher.avatarUrl,
          createdAt: teacher.createdAt,
          course: teacherAssignments?.course,
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
      const db = await getDb()

      await authz(user.id).hasRole('admin')

      const teachers = await db.query.profiles.findMany({
        where: inArray(profiles.role, ['teacher', 'admin']),
        columns: {
          id: true,
          fullName: true,
          email: true,
          avatarUrl: true,
        },
        orderBy: (p, { asc }) => [asc(p.fullName)],
      })

      return { teachers }
    })
  },
)
