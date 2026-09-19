import { and, asc, eq, inArray, sql } from 'drizzle-orm'
import type { RepositoryTransactionClient } from './transaction-client'
import { getDb } from '@/db'
import { examQuestions } from '@/db/schema'

export type ExamQuestionRow = typeof examQuestions.$inferSelect
export type ExamQuestionWrite = Pick<
  ExamQuestionRow,
  'type' | 'prompt' | 'orderIndex' | 'points'
>
/* v8 ignore start */
export async function findExamQuestionsByExamId(
  examId: string,
): Promise<Array<ExamQuestionRow>> {
  const db = await getDb()
  return db
    .select()
    .from(examQuestions)
    .where(eq(examQuestions.examId, examId))
    .orderBy(asc(examQuestions.orderIndex))
}

export async function findExistingExamQuestionIdsInTransaction(
  tx: RepositoryTransactionClient,
  examId: string,
  questionIds: Array<string>,
): Promise<Array<string>> {
  if (questionIds.length === 0) return []
  const rows = await tx
    .select({ id: examQuestions.id })
    .from(examQuestions)
    .where(
      and(
        eq(examQuestions.examId, examId),
        inArray(examQuestions.id, questionIds),
      ),
    )
  return rows.map((row) => row.id)
}

export async function deleteExamQuestionsInTransaction(
  tx: RepositoryTransactionClient,
  examId: string,
  questionIds: Array<string>,
): Promise<void> {
  if (questionIds.length === 0) return
  await tx
    .delete(examQuestions)
    .where(
      and(
        eq(examQuestions.examId, examId),
        inArray(examQuestions.id, questionIds),
      ),
    )
}

export async function updateExamQuestionInTransaction(
  tx: RepositoryTransactionClient,
  examId: string,
  questionId: string,
  values: ExamQuestionWrite,
): Promise<void> {
  await tx
    .update(examQuestions)
    .set({ ...values, updatedAt: new Date() })
    .where(
      and(eq(examQuestions.id, questionId), eq(examQuestions.examId, examId)),
    )
}

export async function insertExamQuestionInTransaction(
  tx: RepositoryTransactionClient,
  examId: string,
  values: ExamQuestionWrite,
): Promise<ExamQuestionRow> {
  const [question] = await tx
    .insert(examQuestions)
    .values({ examId, ...values })
    .returning()
  return question
}

export async function findExamTotalPointsMap(
  examIds: Array<string>,
): Promise<Map<string, number>> {
  if (examIds.length === 0) return new Map()
  const db = await getDb()
  const rows = await db
    .select({
      examId: examQuestions.examId,
      totalPoints: sql<number>`coalesce(sum(${examQuestions.points}), 0)::int`,
    })
    .from(examQuestions)
    .where(inArray(examQuestions.examId, examIds))
    .groupBy(examQuestions.examId)
  return new Map(rows.map((row) => [row.examId, Number(row.totalPoints)]))
}
/* v8 ignore end */
