import { eq, inArray } from 'drizzle-orm'
import type { RepositoryTransactionClient } from './transaction-client'
import { getDb } from '@/db'
import { examAnswers } from '@/db/schema'

export type ExamAnswerRow = typeof examAnswers.$inferSelect

/* v8 ignore start */
export async function upsertExamAnswer(data: {
  attemptId: string
  questionId: string
  selectedOptionId: string | null
  textAnswer: string | null
}): Promise<ExamAnswerRow> {
  const db = await getDb()
  const [answer] = await db
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
 * Persists one auto-grade verdict inside the rescore transaction. Only the
 * grading columns move — the submitted answer itself is never rewritten.
 */
export async function updateExamAnswerAutoGradeInTransaction(
  tx: RepositoryTransactionClient,
  answerId: string,
  result: { isCorrect: boolean; awardedPoints: number },
): Promise<void> {
  await tx
    .update(examAnswers)
    .set({
      isCorrect: result.isCorrect,
      awardedPoints: result.awardedPoints,
      updatedAt: new Date(),
    })
    .where(eq(examAnswers.id, answerId))
}

export async function applyAutoGradeResults(
  results: Array<{
    answerId: string
    isCorrect: boolean
    awardedPoints: number
  }>,
): Promise<void> {
  if (results.length === 0) return
  const db = await getDb()
  await db.transaction(async (tx) => {
    for (const result of results) {
      await tx
        .update(examAnswers)
        .set({
          isCorrect: result.isCorrect,
          awardedPoints: result.awardedPoints,
          updatedAt: new Date(),
        })
        .where(eq(examAnswers.id, result.answerId))
    }
  })
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

export async function updateExamAnswerGrade(
  answerId: string,
  awardedPoints: number,
): Promise<void> {
  const db = await getDb()
  await db
    .update(examAnswers)
    .set({ awardedPoints, updatedAt: new Date() })
    .where(eq(examAnswers.id, answerId))
}
/* v8 ignore end */
