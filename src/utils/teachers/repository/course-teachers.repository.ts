import { inArray } from 'drizzle-orm'
import { getDb } from '@/db'
import { courseTeachers } from '@/db/schema'

/* v8 ignore start */
export async function findCourseAssignmentsForTeachers(
  teacherIds: Array<string>,
) {
  if (teacherIds.length === 0) return []
  const db = await getDb()
  return db.query.courseTeachers.findMany({
    where: inArray(courseTeachers.teacherId, teacherIds),
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
