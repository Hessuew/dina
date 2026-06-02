/* v8 ignore start */
import { and, eq } from 'drizzle-orm'
import type { getDb } from '@/db'
import { lessonProgress } from '@/db/schema'

type Db = Awaited<ReturnType<typeof getDb>>

export async function findCompletedLessonProgress(db: Db, studentId: string) {
  return db.query.lessonProgress.findMany({
    where: and(
      eq(lessonProgress.studentId, studentId),
      eq(lessonProgress.completed, true),
    ),
    columns: { lessonId: true },
  })
}
/* v8 ignore end */
