import { and, eq, inArray } from 'drizzle-orm'
import { getDb } from '@/db'
import { submissions } from '@/db/schema'

/* v8 ignore start */
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
