/* v8 ignore start */
import { eq } from 'drizzle-orm'
import type { getDb } from '@/db'
import { courseTeachers } from '@/db/schema'

type Db = Awaited<ReturnType<typeof getDb>>

export async function findCourseTeachers(db: Db, courseId: string) {
  return db.query.courseTeachers.findMany({
    where: eq(courseTeachers.courseId, courseId),
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

export async function deleteTeacherAssignments(db: Db, courseId: string) {
  await db.delete(courseTeachers).where(eq(courseTeachers.courseId, courseId))
}

export async function insertTeacherAssignments(
  db: Db,
  courseId: string,
  teacher1Id: string,
  teacher2Id: string,
) {
  await db.insert(courseTeachers).values([
    { courseId, teacherId: teacher1Id },
    { courseId, teacherId: teacher2Id },
  ])
}
/* v8 ignore end */
