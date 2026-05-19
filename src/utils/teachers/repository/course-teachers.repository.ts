import { eq } from 'drizzle-orm'
import { getDb } from '@/db'
import { courseTeachers } from '@/db/schema'

/* v8 ignore start */
export async function findTeacherCourseAssignment(teacherId: string) {
  const db = await getDb()
  return db.query.courseTeachers.findFirst({
    where: eq(courseTeachers.teacherId, teacherId),
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
}
/* v8 ignore end */
