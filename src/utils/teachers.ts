import { createServerFn } from '@tanstack/react-start'
import { eq, inArray } from 'drizzle-orm'
import { getDb } from '@/db'
import { courseTeachers, profiles } from '@/db/schema'

export const getTeachers = createServerFn({ method: 'POST' }).handler(
  async () => {
    const db = await getDb()

    const teachers = await db.query.profiles.findMany({
      where: inArray(profiles.role, ['teacher', 'admin']),
      orderBy: (t, { asc }) => [asc(t.fullName)],
    })

    const teachersWithCourses = await Promise.all(
      teachers.map(async (teacher) => {
        const teacherAssignments = await db.query.courseTeachers.findMany({
          where: eq(courseTeachers.teacherId, teacher.id),
          with: {
            course: {
              columns: {
                id: true,
                title: true,
                description: true,
                isPublished: true,
                createdAt: true,
              },
            },
          },
          orderBy: (ct, { desc }) => [desc(ct.createdAt)],
        })

        const teacherCourses = teacherAssignments.map((ta) => ta.course)

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
