import type {
  ExamQuestionOptionInput,
  ExamQuestionOptionRow,
  ExamQuestionRow,
  ExamQuestionsTransactionClient,
} from '@/utils/repository'
import { getDb } from '@/db'
import {
  deleteExamQuestionsInTransaction,
  findExamQuestionOptionsByQuestionIds,
  findExamQuestionsByExamId,
  findExistingExamQuestionIdsInTransaction,
  insertExamQuestionInTransaction,
  replaceExamQuestionOptionsInTransaction,
  updateExamInTransaction,
  updateExamQuestionInTransaction,
} from '@/utils/repository'

/* v8 ignore start */
export async function findQuestionsWithOptions(examId: string): Promise<{
  questions: Array<ExamQuestionRow>
  options: Array<ExamQuestionOptionRow>
}> {
  const questions = await findExamQuestionsByExamId(examId)
  const questionIds = questions.map((question) => question.id)
  const options = await findExamQuestionOptionsByQuestionIds(questionIds)
  return { questions, options }
}

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
  tx: ExamQuestionsTransactionClient,
  data: SaveExamChangesData,
): Promise<string | undefined> {
  const referencedIds = [
    ...data.questions.flatMap((question) =>
      question.questionId ? [question.questionId] : [],
    ),
    ...data.deletedQuestionIds,
  ]
  if (referencedIds.length === 0) return undefined
  const existingIds = new Set(
    await findExistingExamQuestionIdsInTransaction(
      tx,
      data.examId,
      referencedIds,
    ),
  )
  return referencedIds.find((questionId) => !existingIds.has(questionId))
}

async function deleteQuestionsInTransaction(
  tx: ExamQuestionsTransactionClient,
  data: SaveExamChangesData,
): Promise<void> {
  await deleteExamQuestionsInTransaction(
    tx,
    data.examId,
    data.deletedQuestionIds,
  )
}

async function updateQuestionInTransaction(
  tx: ExamQuestionsTransactionClient,
  examId: string,
  question: ExamChangesQuestion & { questionId: string },
): Promise<void> {
  await updateExamQuestionInTransaction(tx, examId, question.questionId, {
    type: question.type,
    prompt: question.prompt,
    orderIndex: question.orderIndex,
    points: question.points,
  })
  await replaceExamQuestionOptionsInTransaction(
    tx,
    question.questionId,
    question.options,
  )
}

async function insertQuestionInTransaction(
  tx: ExamQuestionsTransactionClient,
  examId: string,
  question: ExamChangesQuestion,
): Promise<void> {
  const inserted = await insertExamQuestionInTransaction(tx, examId, {
    type: question.type,
    prompt: question.prompt,
    orderIndex: question.orderIndex,
    points: question.points,
  })
  await replaceExamQuestionOptionsInTransaction(
    tx,
    inserted.id,
    question.options,
  )
}

async function saveQuestionsInTransaction(
  tx: ExamQuestionsTransactionClient,
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

/* v8 ignore end */
