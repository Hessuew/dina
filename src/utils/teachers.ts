import { createServerFn } from '@tanstack/react-start'
import { eq, inArray } from 'drizzle-orm'
import { db } from '@/db'
import { courses, profiles } from '@/db/schema'

export const getTeachers = createServerFn({ method: 'GET' }).handler(
  async () => {
    const teachers = await db.query.profiles.findMany({
      where: inArray(profiles.role, ['teacher', 'admin']),
      orderBy: (t, { asc }) => [asc(t.fullName)],
    })

    const teachersWithCourses = await Promise.all(
      teachers.map(async (teacher) => {
        const teacherCourses = await db.query.courses.findMany({
          where: eq(courses.teacherId, teacher.id),
          columns: {
            id: true,
            title: true,
            description: true,
            isPublished: true,
          },
          orderBy: (c, { desc }) => [desc(c.createdAt)],
        })

        return {
          id: teacher.id,
          fullName: teacher.fullName,
          email: teacher.email,
          bio: teacher.bio,
          avatarUrl: teacher.avatarUrl,
          createdAt: teacher.createdAt,
          courses: teacherCourses,
          courseCount: teacherCourses.length,
        }
      }),
    )

    return { teachers: teachersWithCourses }
  },
)
