/* v8 ignore start */
import { and, eq } from 'drizzle-orm'
import { getDb } from '@/db'
import { lessonProgress } from '@/db/schema'

export async function findCompletedLessonProgress(studentId: string) {
  const db = await getDb()
  return db.query.lessonProgress.findMany({
    where: and(
      eq(lessonProgress.studentId, studentId),
      eq(lessonProgress.completed, true),
    ),
    columns: { lessonId: true },
  })
}
/* v8 ignore end */
