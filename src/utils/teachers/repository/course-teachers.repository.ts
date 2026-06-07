import { and, eq, inArray } from 'drizzle-orm'
import { getDb } from '@/db'
import { courseTeachers } from '@/db/schema'

/* v8 ignore start */
export async function findCourseTeacher(courseId: string, teacherId: string) {
  const db = await getDb()
  return db.query.courseTeachers.findFirst({
    where: and(
      eq(courseTeachers.courseId, courseId),
      eq(courseTeachers.teacherId, teacherId),
    ),
  })
}

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
