import { eq } from 'drizzle-orm'
import { getDb } from '@/db'
import { assignments, courses, lessons } from '@/db/schema'

/* v8 ignore start */
export async function findAllAssignments() {
  const db = await getDb()
  return db
    .select({ id: assignments.id, courseId: courses.id })
    .from(assignments)
    .innerJoin(lessons, eq(assignments.lessonId, lessons.id))
    .innerJoin(courses, eq(lessons.courseId, courses.id))
}

export async function findAssignmentsWithDetails() {
  const db = await getDb()
  return db
    .select({
      assignmentId: assignments.id,
      assignmentTitle: assignments.title,
      assignmentDueDate: assignments.dueDate,
      assignmentMaxGrade: assignments.maxGrade,
      courseId: courses.id,
      courseTitle: courses.title,
      lessonId: lessons.id,
      lessonTitle: lessons.title,
    })
    .from(assignments)
    .innerJoin(lessons, eq(assignments.lessonId, lessons.id))
    .innerJoin(courses, eq(lessons.courseId, courses.id))
    .orderBy(assignments.dueDate)
}
/* v8 ignore end */
