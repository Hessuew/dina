/* v8 ignore start */
import { and, eq, inArray, isNotNull } from 'drizzle-orm'
import { getDb } from '@/db'
import { lessons } from '@/db/schema'

export async function findLessonById(lessonId: string) {
  const db = await getDb()
  return db.query.lessons.findFirst({
    where: eq(lessons.id, lessonId),
  })
}

export async function findPublishedScheduledLessons() {
  const db = await getDb()
  return db.query.lessons.findMany({
    where: and(eq(lessons.isPublished, true), isNotNull(lessons.scheduledTime)),
    columns: {
      id: true,
      title: true,
      scheduledTime: true,
      courseId: true,
      content: true,
      duration: true,
    },
  })
}

export async function findLessonByIdAndCourseId(
  lessonId: string,
  courseId: string,
) {
  const db = await getDb()
  const rows = await db
    .select({
      id: lessons.id,
      title: lessons.title,
      courseId: lessons.courseId,
    })
    .from(lessons)
    .where(and(eq(lessons.id, lessonId), eq(lessons.courseId, courseId)))
    .limit(1)
  return rows.length === 0 ? null : rows[0]
}

export async function findLessonsForAttendance() {
  const db = await getDb()
  return db
    .select({
      id: lessons.id,
      title: lessons.title,
      orderIndex: lessons.orderIndex,
      courseId: lessons.courseId,
    })
    .from(lessons)
}

export async function findLessonIdsByCourseIds(courseIds: Array<string>) {
  if (courseIds.length === 0) return []
  const db = await getDb()
  const result = await db.query.lessons.findMany({
    where: inArray(lessons.courseId, courseIds),
    columns: { id: true },
  })
  return result.map((lesson) => lesson.id)
}

export async function findLessonsByCourseIds(courseIds: Array<string>) {
  if (courseIds.length === 0) return []
  const db = await getDb()
  return db.query.lessons.findMany({
    where: inArray(lessons.courseId, courseIds),
    columns: { id: true, title: true, courseId: true, scheduledTime: true },
  })
}

export async function findLessonsByIds(lessonIds: Array<string>) {
  if (lessonIds.length === 0) return []
  const db = await getDb()
  return db.query.lessons.findMany({
    where: inArray(lessons.id, lessonIds),
    columns: { id: true, title: true, courseId: true, scheduledTime: true },
  })
}

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
/* v8 ignore end */
