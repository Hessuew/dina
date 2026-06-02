/* v8 ignore start */
import { eq, inArray } from 'drizzle-orm'
import { getDb } from '@/db'
import { lessons } from '@/db/schema'

export async function findLessonById(lessonId: string) {
  const db = await getDb()
  return db.query.lessons.findFirst({
    where: eq(lessons.id, lessonId),
  })
}

export async function findLessonWithDetail(lessonId: string) {
  const db = await getDb()
  return db.query.lessons.findFirst({
    where: eq(lessons.id, lessonId),
    with: {
      course: {
        with: {
          courseTeachers: {
            with: {
              teacher: {
                columns: { avatarUrl: true, id: true, fullName: true },
              },
            },
          },
        },
      },
      assignments: {
        orderBy: (t, { desc }) => [desc(t.createdAt)],
      },
    },
  })
}

export async function findLessonIdsByCourseIds(courseIds: Array<string>) {
  if (courseIds.length === 0) return []
  const db = await getDb()
  const result = await db.query.lessons.findMany({
    where: inArray(lessons.courseId, courseIds),
    columns: { id: true },
  })
  return result.map((l) => l.id)
}
/* v8 ignore end */
