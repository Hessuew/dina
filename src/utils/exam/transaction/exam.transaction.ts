import type {
  ExamAnswerRow,
  ExamQuestionOptionInput,
  ExamQuestionRow,
  RepositoryTransactionClient,
} from '@/utils/repository'
import { getDb } from '@/db'
import {
  deleteExamQuestionsInTransaction,
  findCompletedAttemptsByExamInTransaction,
  findExamAnswerOptionSelectionsInTransaction,
  findExamAnswersByAttemptIdsInTransaction,
  findExamQuestionOptionsByQuestionIdsInTransaction,
  findExamQuestionsByExamIdInTransaction,
  findExistingExamQuestionIdsInTransaction,
  insertExamQuestionInTransaction,
  replaceExamQuestionOptionsInTransaction,
  updateExamAnswerAutoGradeInTransaction,
  updateExamAttemptScoresInTransaction,
  updateExamInTransaction,
  updateExamQuestionInTransaction,
} from '@/utils/repository'
import { rescoreCompletedAttempt } from '@/utils/exam/domain/exam-grading.domain'

/* v8 ignore start */
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
  tx: RepositoryTransactionClient,
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
  tx: RepositoryTransactionClient,
  data: SaveExamChangesData,
): Promise<void> {
  await deleteExamQuestionsInTransaction(
    tx,
    data.examId,
    data.deletedQuestionIds,
  )
}

async function updateQuestionInTransaction(
  tx: RepositoryTransactionClient,
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
  tx: RepositoryTransactionClient,
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
  tx: RepositoryTransactionClient,
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

/**
 * Option ids the edit would delete that saved answers still reference. The
 * `exam_answers.selected_option_id` FK is `ON DELETE SET NULL`, so deleting a
 * referenced option would silently erase the submitted response — these
 * removals must be rejected before any write.
 */
async function findReferencedRemovedOptionIds(
  tx: RepositoryTransactionClient,
  data: SaveExamChangesData,
): Promise<Array<string>> {
  const updateIds = data.questions.flatMap((question) =>
    question.questionId ? [question.questionId] : [],
  )
  if (updateIds.length === 0) return []
  const existingOptions =
    await findExamQuestionOptionsByQuestionIdsInTransaction(tx, updateIds)
  const existingIdsByQuestion = new Map<string, Array<string>>()
  for (const option of existingOptions) {
    const list = existingIdsByQuestion.get(option.questionId) ?? []
    list.push(option.id)
    existingIdsByQuestion.set(option.questionId, list)
  }
  const removedIds = data.questions.flatMap((question) => {
    if (!question.questionId) return []
    const keepIds = new Set(
      question.options.flatMap((option) => (option.id ? [option.id] : [])),
    )
    return (existingIdsByQuestion.get(question.questionId) ?? []).filter(
      (optionId) => !keepIds.has(optionId),
    )
  })
  if (removedIds.length === 0) return []
  return findExamAnswerOptionSelectionsInTransaction(tx, removedIds)
}

/**
 * Re-grades every completed attempt of the exam against the post-edit answer
 * key. Submitted answers are never rewritten — only their correctness and
 * awarded points are recomputed, and attempt scores follow the lifecycle
 * shape (submitted: autoScore; graded: autoScore + manualScore + totalScore).
 * Runs inside the authoring transaction so the key change and the rescore
 * commit or roll back together.
 */
async function rescoreCompletedAttemptsInTransaction(
  tx: RepositoryTransactionClient,
  examId: string,
): Promise<void> {
  const attempts = await findCompletedAttemptsByExamInTransaction(tx, examId)
  if (attempts.length === 0) return
  const questions = await findExamQuestionsByExamIdInTransaction(tx, examId)
  const [options, answers] = await Promise.all([
    findExamQuestionOptionsByQuestionIdsInTransaction(
      tx,
      questions.map((question) => question.id),
    ),
    findExamAnswersByAttemptIdsInTransaction(
      tx,
      attempts.map((attempt) => attempt.id),
    ),
  ])
  const answersByAttempt = new Map<string, Array<ExamAnswerRow>>()
  for (const answer of answers) {
    const list = answersByAttempt.get(answer.attemptId) ?? []
    list.push(answer)
    answersByAttempt.set(answer.attemptId, list)
  }
  for (const attempt of attempts) {
    const rescored = rescoreCompletedAttempt(
      attempt.status,
      answersByAttempt.get(attempt.id) ?? [],
      questions,
      options,
    )
    for (const update of rescored.answerUpdates) {
      await updateExamAnswerAutoGradeInTransaction(tx, update.answerId, update)
    }
    await updateExamAttemptScoresInTransaction(tx, attempt.id, rescored)
  }
}

/** Saves an exam and its questions/options as one atomic authoring operation. */
export async function saveExamChanges(data: SaveExamChangesData): Promise<{
  missingQuestionId?: string
  referencedOptionIds?: Array<string>
}> {
  const db = await getDb()
  return db.transaction(async (tx) => {
    const missingQuestionId = await findMissingQuestionId(tx, data)
    if (missingQuestionId) return { missingQuestionId }
    const referencedOptionIds = await findReferencedRemovedOptionIds(tx, data)
    if (referencedOptionIds.length > 0) return { referencedOptionIds }
    await updateExamInTransaction(tx, {
      examId: data.examId,
      title: data.title,
      durationMinutes: data.durationMinutes,
      opensAt: data.opensAt,
      closesAt: data.closesAt,
    })
    await deleteQuestionsInTransaction(tx, data)
    await saveQuestionsInTransaction(tx, data)
    await rescoreCompletedAttemptsInTransaction(tx, data.examId)
    return {}
  })
}

/* v8 ignore end */
