import { and, asc, eq, sql } from 'drizzle-orm'
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

/**
 * Conditionally flips an in-progress attempt to submitted — the
 * double-finalize guard. Returns the updated row, or undefined when the
 * attempt was already submitted/graded (someone else finalized first).
 */
export async function markAttemptSubmittedIfInProgress(
  attemptId: string,
  submittedAt: Date,
  autoScore: number,
): Promise<ExamAttemptRow | undefined> {
  const db = await getDb()
  const [attempt] = await db
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

export async function markAttemptGraded(
  attemptId: string,
  scores: { autoScore: number; manualScore: number; totalScore: number },
  gradedBy: string,
): Promise<void> {
  const db = await getDb()
  await db
    .update(examAttempts)
    .set({
      status: 'graded',
      gradedAt: new Date(),
      gradedBy,
      ...scores,
      updatedAt: new Date(),
    })
    .where(eq(examAttempts.id, attemptId))
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
