/* v8 ignore start */
import { and, eq, inArray } from 'drizzle-orm'
import { getDb } from '@/db'
import { lessonProgress, lessons } from '@/db/schema'

export async function findLessonProgress(studentId: string, lessonId: string) {
  const db = await getDb()
  return db.query.lessonProgress.findFirst({
    where: and(
      eq(lessonProgress.studentId, studentId),
      eq(lessonProgress.lessonId, lessonId),
    ),
  })
}

export async function completeLessonProgress(
  studentId: string,
  lessonId: string,
  completedAt = new Date(),
) {
  const db = await getDb()
  const [progress] = await db
    .insert(lessonProgress)
    .values({ studentId, lessonId, completed: true, completedAt })
    .onConflictDoUpdate({
      target: [lessonProgress.studentId, lessonProgress.lessonId],
      set: {
        completed: true,
        completedAt,
        updatedAt: completedAt,
      },
    })
    .returning()

  return progress
}

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

export async function isCourseCompleted(
  studentId: string,
  courseId: string,
): Promise<boolean> {
  const db = await getDb()
  const publishedLessons = await db.query.lessons.findMany({
    where: and(eq(lessons.courseId, courseId), eq(lessons.isPublished, true)),
    columns: { id: true },
  })
  if (publishedLessons.length === 0) return false

  const completedLessons = await db.query.lessonProgress.findMany({
    where: and(
      eq(lessonProgress.studentId, studentId),
      eq(lessonProgress.completed, true),
      inArray(
        lessonProgress.lessonId,
        publishedLessons.map((lesson) => lesson.id),
      ),
    ),
    columns: { lessonId: true },
  })

  return completedLessons.length === publishedLessons.length
}
/* v8 ignore end */
