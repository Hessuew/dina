import type {
  ExamAnswerRow,
  ExamQuestionOptionInput,
  ExamQuestionOptionRow,
  ExamQuestionRow,
  RepositoryTransactionClient,
} from '@/utils/repository'
import { getDb } from '@/db'
import {
  deleteExamQuestionsInTransaction,
  findCompletedAttemptsByExamInTransaction,
  findExamAnswerOptionSelectionsInTransaction,
  findExamAnswerStatsByQuestionIdsInTransaction,
  findExamAnswersByAttemptIdsInTransaction,
  findExamQuestionOptionsByQuestionIdsInTransaction,
  findExamQuestionsByExamIdInTransaction,
  findExistingExamQuestionIdsInTransaction,
  insertExamQuestionInTransaction,
  lockExamInTransaction,
  replaceExamQuestionOptionsInTransaction,
  updateExamAnswerAutoGradesInTransaction,
  updateExamAttemptScoresInTransaction,
  updateExamInTransaction,
  updateExamQuestionInTransaction,
} from '@/utils/repository'
import {
  hasScoreRelevantEdits,
  rescoreCompletedAttempt,
} from '@/utils/exam/domain/exam-grading.domain'

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
 * Option ids of kept questions the edit would delete. The
 * `exam_answers.selected_option_id` FK is `ON DELETE SET NULL`, so deleting
 * a referenced option would silently erase the submitted response.
 */
function computeRemovedOptionIds(
  questions: Array<ExamChangesQuestion>,
  existingOptions: Array<ExamQuestionOptionRow>,
): Array<string> {
  const existingIdsByQuestion = new Map<string, Array<string>>()
  for (const option of existingOptions) {
    const list = existingIdsByQuestion.get(option.questionId) ?? []
    list.push(option.id)
    existingIdsByQuestion.set(option.questionId, list)
  }
  return questions.flatMap((question) => {
    if (!question.questionId) return []
    const keepIds = new Set(
      question.options.flatMap((option) => (option.id ? [option.id] : [])),
    )
    return (existingIdsByQuestion.get(question.questionId) ?? []).filter(
      (optionId) => !keepIds.has(optionId),
    )
  })
}

/**
 * Preservation guards that keep submitted answers intact through an
 * authoring edit. A deleted question cascade-deletes its answers, a retyped
 * question reclassifies them, and a points reduction below a carried-over
 * manual award would leave totals above the question maximum — all rejected
 * before any write. Multiple-choice points may still drop: the rescore
 * recomputes those awards against the new maximum anyway.
 */
function findAnsweredEditViolation(
  data: SaveExamChangesData,
  existingById: Map<string, ExamQuestionRow>,
  statsByQuestion: Map<
    string,
    { answerCount: number; maxAwardedPoints: number }
  >,
):
  | { answeredQuestionIds: Array<string> }
  | { retypedAnsweredQuestionIds: Array<string> }
  | { pointsBelowAwardedQuestionIds: Array<string> }
  | undefined {
  const hasAnswers = (questionId: string) =>
    (statsByQuestion.get(questionId)?.answerCount ?? 0) > 0
  const answeredQuestionIds = data.deletedQuestionIds.filter(hasAnswers)
  if (answeredQuestionIds.length > 0) return { answeredQuestionIds }
  const retypedAnsweredQuestionIds = data.questions.flatMap((question) =>
    question.questionId &&
    hasAnswers(question.questionId) &&
    existingById.get(question.questionId)?.type !== question.type
      ? [question.questionId]
      : [],
  )
  if (retypedAnsweredQuestionIds.length > 0) {
    return { retypedAnsweredQuestionIds }
  }
  const pointsBelowAwardedQuestionIds = data.questions.flatMap((question) => {
    const existing = question.questionId
      ? existingById.get(question.questionId)
      : undefined
    return existing &&
      existing.type === 'open_ended' &&
      question.points < existing.points &&
      question.points <
        (statsByQuestion.get(existing.id)?.maxAwardedPoints ?? 0)
      ? [existing.id]
      : []
  })
  if (pointsBelowAwardedQuestionIds.length > 0) {
    return { pointsBelowAwardedQuestionIds }
  }
  return undefined
}

/**
 * Re-grades every completed attempt of the exam against the post-edit answer
 * key. Submitted answers are never rewritten — only their correctness and
 * awarded points are recomputed, and attempt scores follow the lifecycle
 * shape (submitted: autoScore; graded: autoScore + manualScore + totalScore).
 * Writes are chunked bulk updates so a large cohort cannot hold the
 * transaction open. Runs inside the authoring transaction so the key change
 * and the rescore commit or roll back together.
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
  const answerUpdates: Array<{
    answerId: string
    isCorrect: boolean
    awardedPoints: number
  }> = []
  const attemptScores: Array<{
    attemptId: string
    autoScore: number
    manualScore?: number
    totalScore?: number
  }> = []
  for (const attempt of attempts) {
    const { answerUpdates: updates, ...scores } = rescoreCompletedAttempt(
      attempt.status,
      answersByAttempt.get(attempt.id) ?? [],
      questions,
      options,
    )
    answerUpdates.push(...updates)
    attemptScores.push({ attemptId: attempt.id, ...scores })
  }
  await updateExamAnswerAutoGradesInTransaction(tx, answerUpdates)
  await updateExamAttemptScoresInTransaction(tx, attemptScores)
}

/** Saves an exam and its questions/options as one atomic authoring operation. */
export async function saveExamChanges(data: SaveExamChangesData): Promise<{
  missingQuestionId?: string
  referencedOptionIds?: Array<string>
  answeredQuestionIds?: Array<string>
  retypedAnsweredQuestionIds?: Array<string>
  pointsBelowAwardedQuestionIds?: Array<string>
}> {
  const db = await getDb()
  return db.transaction(async (tx) => {
    // The exams row lock comes first: every scoring transition takes the same
    // lock before reading the key or answers, so no concurrent submit, grade,
    // or answer can interleave between the preservation reads and the writes.
    await lockExamInTransaction(tx, data.examId)
    const missingQuestionId = await findMissingQuestionId(tx, data)
    if (missingQuestionId) return { missingQuestionId }
    const updateIds = data.questions.flatMap((question) =>
      question.questionId ? [question.questionId] : [],
    )
    const [existingQuestions, existingOptions] = await Promise.all([
      findExamQuestionsByExamIdInTransaction(tx, data.examId),
      findExamQuestionOptionsByQuestionIdsInTransaction(tx, updateIds),
    ])
    const referencedOptionIds =
      await findExamAnswerOptionSelectionsInTransaction(
        tx,
        computeRemovedOptionIds(data.questions, existingOptions),
      )
    if (referencedOptionIds.length > 0) return { referencedOptionIds }
    const statsByQuestion = new Map(
      (
        await findExamAnswerStatsByQuestionIdsInTransaction(tx, [
          ...updateIds,
          ...data.deletedQuestionIds,
        ])
      ).map((row) => [row.questionId, row]),
    )
    const violation = findAnsweredEditViolation(
      data,
      new Map(existingQuestions.map((question) => [question.id, question])),
      statsByQuestion,
    )
    if (violation) return violation
    const rescoreNeeded = hasScoreRelevantEdits({
      questions: data.questions,
      deletedQuestionIds: data.deletedQuestionIds,
      existingQuestions,
      existingOptions,
    })
    await updateExamInTransaction(tx, {
      examId: data.examId,
      title: data.title,
      durationMinutes: data.durationMinutes,
      opensAt: data.opensAt,
      closesAt: data.closesAt,
    })
    await deleteQuestionsInTransaction(tx, data)
    await saveQuestionsInTransaction(tx, data)
    if (rescoreNeeded) {
      await rescoreCompletedAttemptsInTransaction(tx, data.examId)
    }
    return {}
  })
}

/* v8 ignore end */
