import { and, asc, eq, inArray, sql } from 'drizzle-orm'
import type {
  ExamAttemptRow,
  ExamQuestionOptionInput,
  ExamQuestionOptionRow,
} from '@/utils/repository'
import { getDb } from '@/db'
import {
  findExamQuestionOptionsByQuestionIds,
  replaceExamQuestionOptionsInTransaction,
  updateExamInTransaction,
} from '@/utils/repository'
import { examAttempts, examQuestions, profiles } from '@/db/schema'

export type ExamQuestionRow = typeof examQuestions.$inferSelect
export type { ExamQuestionOptionRow } from '@/utils/repository'

/* v8 ignore start */
export async function findQuestionsWithOptions(examId: string): Promise<{
  questions: Array<ExamQuestionRow>
  options: Array<ExamQuestionOptionRow>
}> {
  const db = await getDb()
  const questions = await db
    .select()
    .from(examQuestions)
    .where(eq(examQuestions.examId, examId))
    .orderBy(asc(examQuestions.orderIndex))
  const questionIds = questions.map((question) => question.id)
  const options = await findExamQuestionOptionsByQuestionIds(questionIds)
  return { questions, options }
}

type TransactionClient = Parameters<
  Parameters<Awaited<ReturnType<typeof getDb>>['transaction']>[0]
>[0]

type ExamChangesQuestion = {
  questionId?: string
  type: ExamQuestionRow['type']
  prompt: string
  orderIndex: number
  points: number
  options: Array<ExamQuestionOptionInput>
}

type SaveExamChangesData = {
  examId: string
  title: string
  durationMinutes: number
  opensAt: Date
  closesAt: Date
  questions: Array<ExamChangesQuestion>
  deletedQuestionIds: Array<string>
}

async function findMissingQuestionId(
  tx: TransactionClient,
  data: SaveExamChangesData,
): Promise<string | undefined> {
  const referencedIds = [
    ...data.questions.flatMap((question) =>
      question.questionId ? [question.questionId] : [],
    ),
    ...data.deletedQuestionIds,
  ]
  if (referencedIds.length === 0) return undefined
  const existingRows = await tx
    .select({ id: examQuestions.id })
    .from(examQuestions)
    .where(
      and(
        eq(examQuestions.examId, data.examId),
        inArray(examQuestions.id, referencedIds),
      ),
    )
  const existingIds = new Set(existingRows.map((row) => row.id))
  return referencedIds.find((questionId) => !existingIds.has(questionId))
}

async function deleteQuestionsInTransaction(
  tx: TransactionClient,
  data: SaveExamChangesData,
): Promise<void> {
  if (data.deletedQuestionIds.length === 0) return
  await tx
    .delete(examQuestions)
    .where(
      and(
        eq(examQuestions.examId, data.examId),
        inArray(examQuestions.id, data.deletedQuestionIds),
      ),
    )
}

async function updateQuestionInTransaction(
  tx: TransactionClient,
  examId: string,
  question: ExamChangesQuestion & { questionId: string },
): Promise<void> {
  await tx
    .update(examQuestions)
    .set({
      type: question.type,
      prompt: question.prompt,
      orderIndex: question.orderIndex,
      points: question.points,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(examQuestions.id, question.questionId),
        eq(examQuestions.examId, examId),
      ),
    )
  await replaceExamQuestionOptionsInTransaction(
    tx,
    question.questionId,
    question.options,
  )
}

async function insertQuestionInTransaction(
  tx: TransactionClient,
  examId: string,
  question: ExamChangesQuestion,
): Promise<void> {
  const [inserted] = await tx
    .insert(examQuestions)
    .values({
      examId,
      type: question.type,
      prompt: question.prompt,
      orderIndex: question.orderIndex,
      points: question.points,
    })
    .returning()
  await replaceExamQuestionOptionsInTransaction(
    tx,
    inserted.id,
    question.options,
  )
}

async function saveQuestionsInTransaction(
  tx: TransactionClient,
  data: SaveExamChangesData,
): Promise<void> {
  for (const question of data.questions) {
    if (question.questionId) {
      await updateQuestionInTransaction(tx, data.examId, {
        ...question,
        questionId: question.questionId,
      })
    } else {
      await insertQuestionInTransaction(tx, data.examId, question)
    }
  }
}

export async function saveExamChanges(
  data: SaveExamChangesData,
): Promise<{ missingQuestionId?: string }> {
  const db = await getDb()
  return db.transaction(async (tx) => {
    const missingQuestionId = await findMissingQuestionId(tx, data)
    if (missingQuestionId) return { missingQuestionId }
    await updateExamInTransaction(tx, {
      examId: data.examId,
      title: data.title,
      durationMinutes: data.durationMinutes,
      opensAt: data.opensAt,
      closesAt: data.closesAt,
    })
    await deleteQuestionsInTransaction(tx, data)
    await saveQuestionsInTransaction(tx, data)
    return {}
  })
}

export async function findAttemptsForGrading(
  examId: string,
): Promise<Array<ExamAttemptRow & { studentName: string }>> {
  const db = await getDb()
  const rows = await db
    .select({ attempt: examAttempts, studentName: profiles.fullName })
    .from(examAttempts)
    .innerJoin(profiles, eq(examAttempts.studentId, profiles.id))
    .where(eq(examAttempts.examId, examId))
    .orderBy(asc(examAttempts.startedAt))
  return rows.map(({ attempt, studentName }) => ({ ...attempt, studentName }))
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
