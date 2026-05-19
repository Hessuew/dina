/* v8 ignore start */
import { eq, inArray } from 'drizzle-orm'
import type { AssignmentStatus } from '@/types/database.types'
import { getDb } from '@/db'
import { assignments, courseTeachers, submissions } from '@/db/schema'

export async function findAssignmentById(assignmentId: string) {
  const db = await getDb()
  return db.query.assignments.findFirst({
    where: eq(assignments.id, assignmentId),
  })
}

export async function findAssignmentWithLesson(assignmentId: string) {
  const db = await getDb()
  return db.query.assignments.findFirst({
    where: eq(assignments.id, assignmentId),
    with: {
      lesson: true,
    },
  })
}

export async function findAssignmentWithFullDetail(assignmentId: string) {
  const db = await getDb()
  return db.query.assignments.findFirst({
    where: eq(assignments.id, assignmentId),
    with: {
      lesson: {
        with: {
          course: {
            with: {
              courseTeachers: {
                with: {
                  teacher: true,
                },
              },
            },
          },
        },
      },
    },
  })
}

export async function findAssignmentWithLessonAndSubmissions(
  assignmentId: string,
) {
  const db = await getDb()
  return db.query.assignments.findFirst({
    where: eq(assignments.id, assignmentId),
    with: {
      lesson: true,
      submissions: true,
    },
  })
}

export async function findAssignmentsByLessonId(lessonId: string) {
  const db = await getDb()
  return db.query.assignments.findMany({
    where: eq(assignments.lessonId, lessonId),
    orderBy: (t, { desc }) => [desc(t.createdAt)],
  })
}

export async function findPublishedAssignmentsForStudent(studentId: string) {
  const db = await getDb()
  return db.query.assignments.findMany({
    where: eq(assignments.status, 'published'),
    with: {
      lesson: {
        columns: { id: true, scheduledTime: true, title: true },
        with: { course: true },
      },
      submissions: {
        where: eq(submissions.studentId, studentId),
      },
    },
    orderBy: (t, { asc }) => [asc(t.dueDate)],
  })
}

export async function findCourseIdsByTeacher(teacherId: string) {
  const db = await getDb()
  const result = await db.query.courseTeachers.findMany({
    where: eq(courseTeachers.teacherId, teacherId),
    columns: { courseId: true },
  })
  return result.map((ta) => ta.courseId)
}

export async function findAssignmentsForTeacherLessons(
  lessonIds: Array<string>,
) {
  if (lessonIds.length === 0) return []
  const db = await getDb()
  return db.query.assignments.findMany({
    where: inArray(assignments.lessonId, lessonIds),
    with: {
      lesson: {
        columns: { id: true, scheduledTime: true, title: true },
        with: { course: true },
      },
      submissions: true,
    },
    orderBy: (t, { asc }) => [asc(t.dueDate)],
  })
}

export async function findAssignmentSubmissionsWithStudent(
  assignmentId: string,
) {
  const db = await getDb()
  return db.query.submissions.findMany({
    where: eq(submissions.assignmentId, assignmentId),
    with: { student: true },
    orderBy: (t, { desc }) => [desc(t.submittedAt)],
  })
}

export async function insertAssignment(values: {
  lessonId: string
  title: string
  description: string | null
  dueDate: Date
  maxGrade: number
  status: 'draft'
}) {
  const db = await getDb()
  const [assignment] = await db.insert(assignments).values(values).returning()
  return assignment
}

export async function updateAssignmentById(
  assignmentId: string,
  values: {
    title: string
    description: string | null
    dueDate: Date
    maxGrade: number
    status?: AssignmentStatus
    updatedAt: Date
  },
) {
  const db = await getDb()
  const [assignment] = await db
    .update(assignments)
    .set(values)
    .where(eq(assignments.id, assignmentId))
    .returning()
  return assignment
}

export async function deleteAssignmentById(assignmentId: string) {
  const db = await getDb()
  await db.delete(assignments).where(eq(assignments.id, assignmentId))
}
/* v8 ignore end */
