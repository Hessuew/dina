/* v8 ignore start */
import { and, eq, gt, inArray } from 'drizzle-orm'
import { getDb } from '@/db'
import { courses, lessons } from '@/db/schema'

export async function insertLesson(values: {
  courseId: string
  title: string
  content: string | null
  videoUrl: string | null
  thumbnailUrl: string | null
  scheduledTime: Date | null
  duration: number | null
  orderIndex: number
  isPublished: boolean
}) {
  const db = await getDb()
  const [lesson] = await db.insert(lessons).values(values).returning()
  return lesson
}

export async function updateLessonById(
  lessonId: string,
  values: {
    title: string
    content: string | null
    videoUrl: string | null
    thumbnailUrl: string | null
    scheduledTime: Date | null
    duration: number | null
    orderIndex?: number
    isPublished?: boolean
    updatedAt: Date
  },
) {
  const db = await getDb()
  const [lesson] = await db
    .update(lessons)
    .set(values)
    .where(eq(lessons.id, lessonId))
    .returning()
  return lesson
}

export async function deleteLessonById(lessonId: string) {
  const db = await getDb()
  await db.delete(lessons).where(eq(lessons.id, lessonId))
}

export async function findUpcomingLessons(now: Date) {
  const db = await getDb()
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

export async function findLessonCalendarEvents(courseIds: Array<string>) {
  const db = await getDb()
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
