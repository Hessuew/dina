/* v8 ignore start */
import { eq, inArray } from 'drizzle-orm'
import type { getDb } from '@/db'
import { assignments, courses, lessons } from '@/db/schema'

type Db = Awaited<ReturnType<typeof getDb>>

export async function findAssignmentsByLessonIds(db: Db, lessonIds: string[]) {
  if (lessonIds.length === 0) return []
  return db.query.assignments.findMany({
    where: inArray(assignments.lessonId, lessonIds),
  })
}

export async function findAssignmentCalendarEvents(db: Db, courseIds: string[]) {
  return db
    .select({
      id: assignments.id,
      title: assignments.title,
      dueDate: assignments.dueDate,
      courseId: lessons.courseId,
      courseName: courses.title,
    })
    .from(assignments)
    .innerJoin(lessons, eq(assignments.lessonId, lessons.id))
    .innerJoin(courses, eq(lessons.courseId, courses.id))
    .where(inArray(courses.id, courseIds))
}
/* v8 ignore end */
