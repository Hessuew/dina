import { and, eq, isNotNull } from 'drizzle-orm'
import { getDb } from '@/db'
import { assignments, calendarEvents, courses, lessons } from '@/db/schema'

/* v8 ignore start */
export async function findPublishedLessonsWithCourses() {
  const db = await getDb()
  return db
    .select({
      id: lessons.id,
      title: lessons.title,
      scheduledTime: lessons.scheduledTime,
      courseId: lessons.courseId,
      courseName: courses.title,
      content: lessons.content,
      duration: lessons.duration,
    })
    .from(lessons)
    .innerJoin(courses, eq(lessons.courseId, courses.id))
    .where(and(eq(lessons.isPublished, true), isNotNull(lessons.scheduledTime)))
}

export async function findPublishedAssignmentsWithCourses() {
  const db = await getDb()
  return db
    .select({
      id: assignments.id,
      title: assignments.title,
      dueDate: assignments.dueDate,
      courseId: lessons.courseId,
      courseName: courses.title,
      description: assignments.description,
      maxGrade: assignments.maxGrade,
    })
    .from(assignments)
    .innerJoin(lessons, eq(assignments.lessonId, lessons.id))
    .innerJoin(courses, eq(lessons.courseId, courses.id))
    .where(eq(assignments.status, 'published'))
}

export async function findAllCalendarEvents() {
  const db = await getDb()
  return db.select().from(calendarEvents)
}
/* v8 ignore end */
