/* v8 ignore start */
import { and, eq, sql } from 'drizzle-orm'
import type { SubmissionStatus } from '@/types/database.types'
import { getDb } from '@/db'
import { submissions } from '@/db/schema'

export async function findSubmissionById(submissionId: string) {
  const db = await getDb()
  return db.query.submissions.findFirst({
    where: eq(submissions.id, submissionId),
  })
}

export async function findSubmissionByAssignmentAndStudent(
  assignmentId: string,
  studentId: string,
) {
  const db = await getDb()
  return db.query.submissions.findFirst({
    where: and(
      eq(submissions.assignmentId, assignmentId),
      eq(submissions.studentId, studentId),
    ),
  })
}

export async function upsertSubmission(values: {
  assignmentId: string
  studentId: string
  content: string | null
  status: SubmissionStatus
  submittedAt: Date | null
}) {
  const db = await getDb()
  const [submission] = await db
    .insert(submissions)
    .values(values)
    .onConflictDoUpdate({
      target: [submissions.assignmentId, submissions.studentId],
      set: {
        content: values.content,
        status: sql<SubmissionStatus>`CASE
          WHEN ${submissions.status} IN ('submitted', 'graded', 'returned')
            AND excluded.status = 'draft'
          THEN ${submissions.status}
          ELSE excluded.status
        END`,
        submittedAt: sql<Date | null>`COALESCE(
          excluded.submitted_at,
          ${submissions.submittedAt}
        )`,
        updatedAt: new Date(),
      },
    })
    .returning()
  return submission
}

export async function updateSubmission(
  submissionId: string,
  values: {
    content: string | null
    status: SubmissionStatus
    submittedAt: Date | null
    updatedAt: Date
  },
) {
  const db = await getDb()
  const [submission] = await db
    .update(submissions)
    .set(values)
    .where(eq(submissions.id, submissionId))
    .returning()
  return submission
}

export async function updateSubmissionGrade(
  submissionId: string,
  values: {
    grade: number
    feedback: string | null
    gradedAt: Date
    updatedAt: Date
  },
) {
  const db = await getDb()
  const [submission] = await db
    .update(submissions)
    .set(values)
    .where(eq(submissions.id, submissionId))
    .returning()
  return submission
}
/* v8 ignore end */
