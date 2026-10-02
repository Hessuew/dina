/* v8 ignore start */
import { and, eq, inArray, sql } from 'drizzle-orm'
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

export async function findStudentSubmissions(
  studentId: string,
  assignmentIds: Array<string>,
) {
  if (assignmentIds.length === 0) return []
  const db = await getDb()
  return db.query.submissions.findMany({
    where: and(
      eq(submissions.studentId, studentId),
      inArray(submissions.assignmentId, assignmentIds),
    ),
  })
}

export async function findSubmissionsByAssignmentId(assignmentId: string) {
  const db = await getDb()
  return db.query.submissions.findMany({
    where: eq(submissions.assignmentId, assignmentId),
  })
}

export async function findSubmissionsByAssignmentIdOrdered(
  assignmentId: string,
) {
  const db = await getDb()
  return db.query.submissions.findMany({
    where: eq(submissions.assignmentId, assignmentId),
    orderBy: (submission, { desc }) => [desc(submission.submittedAt)],
  })
}

export async function findSubmissionsByAssignmentIds(
  assignmentIds: Array<string>,
) {
  if (assignmentIds.length === 0) return []
  const db = await getDb()
  return db.query.submissions.findMany({
    where: inArray(submissions.assignmentId, assignmentIds),
  })
}

export async function findStudentSubmissionGrades(
  studentId: string,
  assignmentIds: Array<string>,
) {
  if (assignmentIds.length === 0) return []
  const db = await getDb()
  return db
    .select({
      assignmentId: submissions.assignmentId,
      grade: submissions.grade,
    })
    .from(submissions)
    .where(
      and(
        eq(submissions.studentId, studentId),
        inArray(submissions.assignmentId, assignmentIds),
      ),
    )
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

export async function findSubmissionsForStudents(studentIds: Array<string>) {
  if (studentIds.length === 0) return []
  const db = await getDb()
  return db.query.submissions.findMany({
    where: inArray(submissions.studentId, studentIds),
  })
}

/**
 * Insert or update a submission. Rows past `draft` are write-locked: a
 * concurrent draft save landing after submit keeps the locked status, content,
 * and submittedAt instead of reverting the row.
 */
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
        content: sql<string | null>`CASE
          WHEN ${submissions.status} IN ('submitted', 'graded', 'returned')
            AND excluded.status = 'draft'
          THEN ${submissions.content}
          ELSE excluded.content
        END`,
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

/**
 * Update a submission only while it is still a draft — the conditional
 * double-write guard. Returns undefined when the row was already submitted
 * (a racing write finalized it first); the caller must surface a conflict.
 */
export async function updateDraftSubmission(
  submissionId: string,
  values: {
    content: string | null
    status: SubmissionStatus
    submittedAt: Date | null
    updatedAt: Date
  },
): Promise<typeof submissions.$inferSelect | undefined> {
  const db = await getDb()
  const [submission] = await db
    .update(submissions)
    .set(values)
    .where(
      and(eq(submissions.id, submissionId), eq(submissions.status, 'draft')),
    )
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
