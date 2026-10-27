import { eq, inArray, sql } from 'drizzle-orm'
import type { RepositoryTransactionClient } from './transaction-client'
import { getDb } from '@/db'
import { examAnswers } from '@/db/schema'

export type ExamAnswerRow = typeof examAnswers.$inferSelect

/* v8 ignore start */
export async function upsertExamAnswerInTransaction(
  tx: RepositoryTransactionClient,
  data: {
    attemptId: string
    questionId: string
    selectedOptionId: string | null
    textAnswer: string | null
  },
): Promise<ExamAnswerRow> {
  const [answer] = await tx
    .insert(examAnswers)
    .values(data)
    .onConflictDoUpdate({
      target: [examAnswers.attemptId, examAnswers.questionId],
      set: {
        selectedOptionId: data.selectedOptionId,
        textAnswer: data.textAnswer,
        updatedAt: new Date(),
      },
    })
    .returning()
  return answer
}

export async function findExamAnswersByAttempt(
  attemptId: string,
): Promise<Array<ExamAnswerRow>> {
  const db = await getDb()
  return db
    .select()
    .from(examAnswers)
    .where(eq(examAnswers.attemptId, attemptId))
}

export async function findExamAnswersByAttemptIdsInTransaction(
  tx: RepositoryTransactionClient,
  attemptIds: Array<string>,
): Promise<Array<ExamAnswerRow>> {
  if (attemptIds.length === 0) return []
  return tx
    .select()
    .from(examAnswers)
    .where(inArray(examAnswers.attemptId, attemptIds))
}

/**
 * Option ids referenced by saved answers — the deletion guard for the option
 * replacement path, whose FK would otherwise set these references to null.
 */
export async function findExamAnswerOptionSelectionsInTransaction(
  tx: RepositoryTransactionClient,
  optionIds: Array<string>,
): Promise<Array<string>> {
  if (optionIds.length === 0) return []
  const rows = await tx
    .select({ selectedOptionId: examAnswers.selectedOptionId })
    .from(examAnswers)
    .where(inArray(examAnswers.selectedOptionId, optionIds))
  return rows.flatMap((row) =>
    row.selectedOptionId ? [row.selectedOptionId] : [],
  )
}

/**
 * Per-question answer aggregates — the preservation guards for the authoring
 * save: answerCount rejects deleting or retyping an answered question, and
 * maxAwardedPoints rejects a points reduction below an existing grade.
 */
export async function findExamAnswerStatsByQuestionIdsInTransaction(
  tx: RepositoryTransactionClient,
  questionIds: Array<string>,
): Promise<
  Array<{
    questionId: string
    answerCount: number
    maxAwardedPoints: number
  }>
> {
  if (questionIds.length === 0) return []
  return tx
    .select({
      questionId: examAnswers.questionId,
      answerCount: sql<number>`count(*)::int`,
      maxAwardedPoints: sql<number>`coalesce(max(${examAnswers.awardedPoints}), 0)::int`,
    })
    .from(examAnswers)
    .where(inArray(examAnswers.questionId, questionIds))
    .groupBy(examAnswers.questionId)
}

const AUTO_GRADE_CHUNK_SIZE = 200

/**
 * Persists auto-grade verdicts inside a scoring transaction in bounded,
 * parameter-safe chunks — one UPDATE per chunk instead of one round trip per
 * answer. Only the grading columns move — the submitted answer itself is
 * never rewritten.
 */
export async function updateExamAnswerAutoGradesInTransaction(
  tx: RepositoryTransactionClient,
  updates: Array<{
    answerId: string
    isCorrect: boolean
    awardedPoints: number
  }>,
): Promise<void> {
  for (let index = 0; index < updates.length; index += AUTO_GRADE_CHUNK_SIZE) {
    const chunk = updates.slice(index, index + AUTO_GRADE_CHUNK_SIZE)
    await tx.execute(sql`
      update exam_answers
      set is_correct = batch.is_correct,
          awarded_points = batch.awarded_points,
          updated_at = ${new Date()}
      from (values ${sql.join(
        chunk.map(
          (update) =>
            sql`(${update.answerId}::uuid, ${update.isCorrect}::boolean, ${update.awardedPoints}::integer)`,
        ),
        sql`, `,
      )}) as batch(answer_id, is_correct, awarded_points)
      where exam_answers.id = batch.answer_id
    `)
  }
}

export async function findExamAnswerById(
  answerId: string,
): Promise<ExamAnswerRow | undefined> {
  const db = await getDb()
  const [answer] = await db
    .select()
    .from(examAnswers)
    .where(eq(examAnswers.id, answerId))
  return answer
}

export async function updateExamAnswerGradeInTransaction(
  tx: RepositoryTransactionClient,
  answerId: string,
  awardedPoints: number,
): Promise<void> {
  await tx
    .update(examAnswers)
    .set({ awardedPoints, updatedAt: new Date() })
    .where(eq(examAnswers.id, answerId))
}
/* v8 ignore end */
