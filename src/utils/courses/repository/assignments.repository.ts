/* v8 ignore start */
import { eq, inArray } from 'drizzle-orm'
import { getDb } from '@/db'
import { assignments, courses, lessons } from '@/db/schema'

export async function findAssignmentsByLessonIds(lessonIds: Array<string>) {
  if (lessonIds.length === 0) return []
  const db = await getDb()
  return db.query.assignments.findMany({
    where: inArray(assignments.lessonId, lessonIds),
  })
}

export async function findAssignmentCalendarEvents(courseIds: Array<string>) {
  const db = await getDb()
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
