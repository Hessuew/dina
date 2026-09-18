/* v8 ignore start */
import { and, eq, gt } from 'drizzle-orm'
import { getDb } from '@/db'
import { courses, lessons } from '@/db/schema'

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
    .where(
      and(
        gt(lessons.scheduledTime, now),
        eq(lessons.isPublished, true),
        eq(courses.isPublished, true),
      ),
    )
    .orderBy(lessons.scheduledTime)
    .limit(5)
}

/* v8 ignore end */
