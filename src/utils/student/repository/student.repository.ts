import { and, eq, inArray } from 'drizzle-orm'
import { getDb } from '@/db'
import { assignments, courses, lessons, profiles, submissions } from '@/db/schema'

/* v8 ignore start */
export async function findAllStudents() {
  const db = await getDb()
  return db.query.profiles.findMany({
    where: eq(profiles.role, 'student'),
    orderBy: (p, { asc }) => [asc(p.fullName)],
  })
}

export async function findAllCourses() {
  const db = await getDb()
  return db.query.courses.findMany({
    columns: { id: true, title: true },
  })
}

export async function findStudentSubmissions(studentId: string) {
  const db = await getDb()
  return db.query.submissions.findMany({
    where: eq(submissions.studentId, studentId),
    with: {
      assignment: {
        with: {
          lesson: {
            with: {
              course: {
                columns: { id: true, title: true },
              },
            },
          },
        },
      },
    },
  })
}

export async function findAllAssignments() {
  const db = await getDb()
  return db
    .select({ id: assignments.id, courseId: courses.id })
    .from(assignments)
    .innerJoin(lessons, eq(assignments.lessonId, lessons.id))
    .innerJoin(courses, eq(lessons.courseId, courses.id))
}

export async function findStudentById(studentId: string) {
  const db = await getDb()
  return db.query.profiles.findFirst({
    where: and(eq(profiles.id, studentId), eq(profiles.role, 'student')),
  })
}

export async function findAllCoursesDesc() {
  const db = await getDb()
  return db.query.courses.findMany({
    columns: { id: true, title: true },
    orderBy: (c, { desc }) => [desc(c.createdAt)],
  })
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

export async function findSubmittedSubmissionsForStudent(
  studentId: string,
  assignmentIds: Array<string>,
) {
  if (assignmentIds.length === 0) return []
  const db = await getDb()
  return db.query.submissions.findMany({
    where: and(
      eq(submissions.studentId, studentId),
      inArray(submissions.assignmentId, assignmentIds),
      eq(submissions.status, 'submitted'),
    ),
  })
}
/* v8 ignore end */
