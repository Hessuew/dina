/* v8 ignore start */
import { eq } from 'drizzle-orm'
import { getDb } from '@/db'
import { courseTeachers } from '@/db/schema'

export async function findCourseTeachers(courseId: string) {
  const db = await getDb()
  return db.query.courseTeachers.findMany({
    where: eq(courseTeachers.courseId, courseId),
    orderBy: (ct, { asc }) => [asc(ct.createdAt)],
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
}

/* v8 ignore end */
