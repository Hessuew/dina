/* v8 ignore start */
import { and, eq, gt, inArray } from 'drizzle-orm'
import type { getDb } from '@/db'
import { courses, lessons } from '@/db/schema'

type Db = Awaited<ReturnType<typeof getDb>>

export async function insertLesson(
  db: Db,
  values: {
    courseId: string
    title: string
    content: string | null
    videoUrl: string | null
    thumbnailUrl: string | null
    scheduledTime: Date | string | null
    duration: number | null
    orderIndex: number
    isPublished: boolean
  },
) {
  const [lesson] = await db.insert(lessons).values(values).returning()
  return lesson
}

export async function updateLessonById(
  db: Db,
  lessonId: string,
  values: {
    title: string
    content: string | null
    videoUrl: string | null
    thumbnailUrl: string | null
    scheduledTime: Date | string | null
    duration: number | null
    orderIndex: number
    isPublished: boolean
    updatedAt: Date
  },
) {
  const [lesson] = await db
    .update(lessons)
    .set(values)
    .where(eq(lessons.id, lessonId))
    .returning()
  return lesson
}

export async function deleteLessonById(db: Db, lessonId: string) {
  await db.delete(lessons).where(eq(lessons.id, lessonId))
}

export async function findUpcomingLessons(db: Db, now: Date) {
  return db
    .select({
      id: lessons.id,
      title: lessons.title,
      scheduledTime: lessons.scheduledTime,
      thumbnailUrl: lessons.thumbnailUrl,
      courseId: lessons.courseId,
      courseName: courses.title,
      isPublished: lessons.isPublished,
    })
    .from(lessons)
    .innerJoin(courses, eq(lessons.courseId, courses.id))
    .where(and(gt(lessons.scheduledTime, now), eq(lessons.isPublished, true)))
    .orderBy(lessons.scheduledTime)
    .limit(5)
}

export async function findLessonCalendarEvents(db: Db, courseIds: string[]) {
  return db
    .select({
      id: lessons.id,
      title: lessons.title,
      scheduledTime: lessons.scheduledTime,
      courseId: lessons.courseId,
      courseName: courses.title,
    })
    .from(lessons)
    .innerJoin(courses, eq(lessons.courseId, courses.id))
    .where(inArray(courses.id, courseIds))
}
/* v8 ignore end */
