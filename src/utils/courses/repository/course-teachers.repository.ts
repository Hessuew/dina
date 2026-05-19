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

export async function replaceTeacherAssignments(
  courseId: string,
  teacher1Id: string,
  teacher2Id: string,
) {
  const db = await getDb()
  await db.transaction(async (tx) => {
    await tx.delete(courseTeachers).where(eq(courseTeachers.courseId, courseId))
    await tx.insert(courseTeachers).values([
      { courseId, teacherId: teacher1Id },
      { courseId, teacherId: teacher2Id },
    ])
  })
}
/* v8 ignore end */
