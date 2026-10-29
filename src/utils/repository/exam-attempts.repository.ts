import { and, asc, eq, inArray, sql } from 'drizzle-orm'
import type { RepositoryTransactionClient } from './transaction-client'
import { getDb } from '@/db'
import { examAttempts } from '@/db/schema'

export type ExamAttemptRow = typeof examAttempts.$inferSelect

/* v8 ignore start */
/**
 * Race-safe start: on a concurrent duplicate start the unique
 * (exam_id, student_id) constraint makes this a no-op and the caller
 * re-fetches the existing attempt.
 */
export async function insertAttemptIfAbsent(
  data: Omit<
    typeof examAttempts.$inferInsert,
    'id' | 'createdAt' | 'updatedAt'
  >,
): Promise<ExamAttemptRow | undefined> {
  const db = await getDb()
  const [attempt] = await db
    .insert(examAttempts)
    .values(data)
    .onConflictDoNothing({
      target: [examAttempts.examId, examAttempts.studentId],
    })
    .returning()
  return attempt
}

export async function findAttemptByExamAndStudent(
  examId: string,
  studentId: string,
): Promise<ExamAttemptRow | undefined> {
  const db = await getDb()
  const [attempt] = await db
    .select()
    .from(examAttempts)
    .where(
      and(
        eq(examAttempts.examId, examId),
        eq(examAttempts.studentId, studentId),
      ),
    )
  return attempt
}

export async function findAttemptById(
  attemptId: string,
): Promise<ExamAttemptRow | undefined> {
  const db = await getDb()
  const [attempt] = await db
    .select()
    .from(examAttempts)
    .where(eq(examAttempts.id, attemptId))
  return attempt
}

export async function findAttemptsByExam(
  examId: string,
): Promise<Array<ExamAttemptRow>> {
  const db = await getDb()
  return db
    .select()
    .from(examAttempts)
    .where(eq(examAttempts.examId, examId))
    .orderBy(asc(examAttempts.startedAt))
}

export async function findAttemptsByStudent(
  studentId: string,
): Promise<Array<ExamAttemptRow>> {
  const db = await getDb()
  return db
    .select()
    .from(examAttempts)
    .where(eq(examAttempts.studentId, studentId))
}

export async function findAttemptByIdInTransaction(
  tx: RepositoryTransactionClient,
  attemptId: string,
): Promise<ExamAttemptRow | undefined> {
  const [attempt] = await tx
    .select()
    .from(examAttempts)
    .where(eq(examAttempts.id, attemptId))
  return attempt
}

/**
 * Conditionally flips an in-progress attempt to submitted — the
 * double-finalize guard. Returns the updated row, or undefined when the
 * attempt was already submitted/graded (someone else finalized first).
 */
export async function markAttemptSubmittedIfInProgressInTransaction(
  tx: RepositoryTransactionClient,
  attemptId: string,
  submittedAt: Date,
  autoScore: number,
): Promise<ExamAttemptRow | undefined> {
  const [attempt] = await tx
    .update(examAttempts)
    .set({ status: 'submitted', submittedAt, autoScore, updatedAt: new Date() })
    .where(
      and(
        eq(examAttempts.id, attemptId),
        eq(examAttempts.status, 'in_progress'),
      ),
    )
    .returning()
  return attempt
}

/**
 * Conditionally flips a submitted attempt to graded — the double-finalize
 * guard. Returns the updated row, or undefined when the attempt was already
 * finalized (a concurrent finalize won first).
 */
export async function markAttemptGradedInTransaction(
  tx: RepositoryTransactionClient,
  attemptId: string,
  scores: { autoScore: number; manualScore: number; totalScore: number },
  gradedBy: string,
  feedback: string | null,
): Promise<ExamAttemptRow | undefined> {
  const [attempt] = await tx
    .update(examAttempts)
    .set({
      status: 'graded',
      gradedAt: new Date(),
      gradedBy,
      ...scores,
      feedback,
      updatedAt: new Date(),
    })
    .where(
      and(eq(examAttempts.id, attemptId), eq(examAttempts.status, 'submitted')),
    )
    .returning()
  return attempt
}

/**
 * Completed attempts of an exam — the rescore set after an answer-key change.
 * In-progress attempts are excluded: they grade against the current key at
 * submission anyway.
 */
export async function findCompletedAttemptsByExamInTransaction(
  tx: RepositoryTransactionClient,
  examId: string,
): Promise<Array<ExamAttemptRow>> {
  return tx
    .select()
    .from(examAttempts)
    .where(
      and(
        eq(examAttempts.examId, examId),
        inArray(examAttempts.status, ['submitted', 'graded']),
      ),
    )
    .orderBy(asc(examAttempts.startedAt))
}

const ATTEMPT_SCORE_CHUNK_SIZE = 200

/**
 * Rewrites persisted scores after a rescore in bounded, parameter-safe
 * chunks — one UPDATE per chunk instead of one round trip per attempt, so a
 * large cohort cannot hold the authoring transaction open. manualScore and
 * totalScore stay put for submitted attempts (null batch values keep the
 * stored column), mirroring the submit-time shape until finalization.
 */
export async function updateExamAttemptScoresInTransaction(
  tx: RepositoryTransactionClient,
  scores: Array<{
    attemptId: string
    autoScore: number
    manualScore?: number
    totalScore?: number
  }>,
): Promise<void> {
  for (
    let index = 0;
    index < scores.length;
    index += ATTEMPT_SCORE_CHUNK_SIZE
  ) {
    const chunk = scores.slice(index, index + ATTEMPT_SCORE_CHUNK_SIZE)
    await tx.execute(sql`
      update exam_attempts
      set auto_score = batch.auto_score,
          manual_score = coalesce(batch.manual_score, exam_attempts.manual_score),
          total_score = coalesce(batch.total_score, exam_attempts.total_score),
          updated_at = ${new Date()}
      from (values ${sql.join(
        chunk.map(
          (score) =>
            sql`(${score.attemptId}::uuid, ${score.autoScore}::integer, ${score.manualScore ?? null}::integer, ${score.totalScore ?? null}::integer)`,
        ),
        sql`, `,
      )}) as batch(attempt_id, auto_score, manual_score, total_score)
      where exam_attempts.id = batch.attempt_id
    `)
  }
}

export async function countAttemptsByExam(examId: string): Promise<number> {
  const db = await getDb()
  const [row] = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(examAttempts)
    .where(eq(examAttempts.examId, examId))
  return row.value
}
/* v8 ignore end */
