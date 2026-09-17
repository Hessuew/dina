/* v8 ignore start */
import { eq, inArray, or } from 'drizzle-orm'
import { getDb } from '@/db'
import { assignments, submissions } from '@/db/schema'

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
        with: {
          course: {
            with: {
              courseTeachers: {
                columns: { teacherId: true },
              },
            },
          },
        },
      },
      submissions: true,
    },
    orderBy: (t, { asc }) => [asc(t.dueDate)],
  })
}

/**
 * Faculty catalog shells: every published assignment plus all statuses on the
 * caller's managed lessons. No submission rows — catalog must not pull student
 * work into the worker for list views.
 */
export async function findAssignmentsForTeacherCatalog(
  managedLessonIds: Array<string>,
) {
  const db = await getDb()
  const where =
    managedLessonIds.length === 0
      ? eq(assignments.status, 'published')
      : or(
          eq(assignments.status, 'published'),
          inArray(assignments.lessonId, managedLessonIds),
        )

  return db.query.assignments.findMany({
    where,
    with: {
      lesson: {
        columns: { id: true, scheduledTime: true, title: true },
        with: {
          course: {
            with: {
              courseTeachers: {
                columns: { teacherId: true },
              },
            },
          },
        },
      },
    },
    orderBy: (t, { asc }) => [asc(t.dueDate)],
  })
}

/* v8 ignore end */
