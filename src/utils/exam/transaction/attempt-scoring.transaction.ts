import type {
  ExamAnswerRow,
  ExamAttemptRow,
  ExamQuestionRow,
  RepositoryTransactionClient,
} from '@/utils/repository'
import { getDb } from '@/db'
import {
  findAttemptByIdInTransaction,
  findExamAnswersByAttemptIdsInTransaction,
  findExamQuestionOptionsByQuestionIdsInTransaction,
  findExamQuestionsByExamIdInTransaction,
  lockExamInTransaction,
  markAttemptGradedInTransaction,
  markAttemptSubmittedIfInProgressInTransaction,
  updateExamAnswerAutoGradesInTransaction,
  updateExamAnswerGradeInTransaction,
  upsertExamAnswerInTransaction,
} from '@/utils/repository'
import {
  allOpenAnswersGraded,
  autoGradeMultipleChoice,
  computeAttemptScores,
} from '@/utils/exam/domain/exam-grading.domain'
import {
  isOptionOfQuestion,
  validateAnswerShape,
} from '@/utils/exam/domain/exam-answer.domain'
import { isSaveAllowed } from '@/utils/exam/domain/exam-timing.domain'

/* v8 ignore start */

/**
 * Serializes attempt scoring on the exams row: every transition that reads
 * the answer key or saved answers to persist verdicts/scores takes the row
 * lock first, and the authoring save takes the same lock before touching keys
 * or scores — so an in-flight operation can never commit scores computed
 * against a stale key. Lock order is always the exams row and nothing else.
 */
async function withExamScoringLock<T>(
  examId: string,
  run: (tx: RepositoryTransactionClient) => Promise<T>,
): Promise<T> {
  const db = await getDb()
  return db.transaction(async (tx) => {
    await lockExamInTransaction(tx, examId)
    return run(tx)
  })
}

/**
 * Auto-grades multiple choice from the saved answers and flips an
 * in-progress attempt to submitted — atomically under the exam lock, so the
 * stored verdicts always reflect the key that was committed when the lock
 * was taken. Returns the committed row, the already-finalized row, or
 * undefined when the attempt vanished.
 */
export async function finalizeAttemptScoring(input: {
  attemptId: string
  examId: string
}): Promise<ExamAttemptRow | undefined> {
  return withExamScoringLock(input.examId, async (tx) => {
    const current = await findAttemptByIdInTransaction(tx, input.attemptId)
    if (!current || current.status !== 'in_progress') return current
    const questions = await findExamQuestionsByExamIdInTransaction(
      tx,
      input.examId,
    )
    const [options, answers] = await Promise.all([
      findExamQuestionOptionsByQuestionIdsInTransaction(
        tx,
        questions.map((question) => question.id),
      ),
      findExamAnswersByAttemptIdsInTransaction(tx, [input.attemptId]),
    ])
    const results = autoGradeMultipleChoice(answers, questions, options)
    await updateExamAnswerAutoGradesInTransaction(tx, results)
    const autoScore = results.reduce((sum, r) => sum + r.awardedPoints, 0)
    const now = new Date()
    const submittedAt = isSaveAllowed(now, current.deadlineAt)
      ? now
      : current.deadlineAt
    return markAttemptSubmittedIfInProgressInTransaction(
      tx,
      input.attemptId,
      submittedAt,
      autoScore,
    )
  })
}

export type SaveAnswerOutcome =
  | {
      kind: 'saved'
      answer: ExamAnswerRow
      question: ExamQuestionRow
      now: Date
    }
  | { kind: 'attempt_finalized' }
  | { kind: 'expired' }
  | { kind: 'missing_question' }
  | { kind: 'invalid_shape'; message: string }
  | { kind: 'foreign_option' }

/**
 * Persists one autosaved answer under the exam lock, so the upsert can never
 * land between the authoring guard's reference read and its option delete.
 * Question shape, option membership, and the save window are validated
 * against the post-lock state and timestamp.
 */
export async function saveAnswerScoring(input: {
  examId: string
  attemptId: string
  questionId: string
  selectedOptionId?: string
  textAnswer?: string
}): Promise<SaveAnswerOutcome> {
  return withExamScoringLock(input.examId, async (tx) => {
    const attempt = await findAttemptByIdInTransaction(tx, input.attemptId)
    if (!attempt || attempt.status !== 'in_progress') {
      return { kind: 'attempt_finalized' }
    }
    const now = new Date()
    if (!isSaveAllowed(now, attempt.deadlineAt)) {
      return { kind: 'expired' }
    }
    const questions = await findExamQuestionsByExamIdInTransaction(
      tx,
      input.examId,
    )
    const question = questions.find(
      (candidate) => candidate.id === input.questionId,
    )
    if (!question) return { kind: 'missing_question' }
    const shapeError = validateAnswerShape(question.type, {
      selectedOptionId: input.selectedOptionId,
      textAnswer: input.textAnswer,
    })
    if (shapeError) return { kind: 'invalid_shape', message: shapeError }
    if (input.selectedOptionId !== undefined) {
      const options = await findExamQuestionOptionsByQuestionIdsInTransaction(
        tx,
        [question.id],
      )
      if (!isOptionOfQuestion(input.selectedOptionId, question.id, options)) {
        return { kind: 'foreign_option' }
      }
    }
    const answer = await upsertExamAnswerInTransaction(tx, {
      attemptId: input.attemptId,
      questionId: question.id,
      selectedOptionId: input.selectedOptionId ?? null,
      textAnswer: input.textAnswer ?? null,
    })
    return { kind: 'saved', answer, question, now }
  })
}

export type GradeOpenAnswerOutcome =
  | { kind: 'graded'; question: ExamQuestionRow }
  | { kind: 'missing_attempt' }
  | { kind: 'attempt_in_progress' }
  | { kind: 'not_open_ended' }
  | { kind: 'points_above_max'; maxPoints: number }

/**
 * Writes one manual open-answer award under the exam lock, so the award can
 * never interleave with a rescore snapshot that persists attempt totals
 * computed from the stale value.
 */
export async function gradeOpenAnswerScoring(input: {
  examId: string
  attemptId: string
  questionId: string
  answerId: string
  awardedPoints: number
}): Promise<GradeOpenAnswerOutcome> {
  return withExamScoringLock(input.examId, async (tx) => {
    const attempt = await findAttemptByIdInTransaction(tx, input.attemptId)
    if (!attempt) return { kind: 'missing_attempt' }
    if (attempt.status === 'in_progress') {
      return { kind: 'attempt_in_progress' }
    }
    const questions = await findExamQuestionsByExamIdInTransaction(
      tx,
      input.examId,
    )
    const question = questions.find(
      (candidate) => candidate.id === input.questionId,
    )
    if (!question || question.type !== 'open_ended') {
      return { kind: 'not_open_ended' }
    }
    if (input.awardedPoints > question.points) {
      return { kind: 'points_above_max', maxPoints: question.points }
    }
    await updateExamAnswerGradeInTransaction(
      tx,
      input.answerId,
      input.awardedPoints,
    )
    return { kind: 'graded', question }
  })
}

export type FinalizeGradingOutcome =
  | { kind: 'graded' }
  | { kind: 'missing_attempt' }
  | { kind: 'not_submitted' }
  | { kind: 'ungraded_open_answers' }

/**
 * Computes final scores from saved answers and flips a submitted attempt to
 * graded under the exam lock, so the write can never split a rescore:
 * whichever commits second sees the other's persisted answers and key.
 */
export async function finalizeGradingScoring(input: {
  examId: string
  attemptId: string
  gradedBy: string
  feedback: string | null
}): Promise<FinalizeGradingOutcome> {
  return withExamScoringLock(input.examId, async (tx) => {
    const attempt = await findAttemptByIdInTransaction(tx, input.attemptId)
    if (!attempt) return { kind: 'missing_attempt' }
    if (attempt.status !== 'submitted') return { kind: 'not_submitted' }
    const [questions, answers] = await Promise.all([
      findExamQuestionsByExamIdInTransaction(tx, input.examId),
      findExamAnswersByAttemptIdsInTransaction(tx, [input.attemptId]),
    ])
    if (!allOpenAnswersGraded(answers, questions)) {
      return { kind: 'ungraded_open_answers' }
    }
    const scores = computeAttemptScores(answers, questions)
    const graded = await markAttemptGradedInTransaction(
      tx,
      input.attemptId,
      {
        autoScore: scores.autoScore,
        manualScore: scores.manualScore,
        totalScore: scores.totalScore,
      },
      input.gradedBy,
      input.feedback,
    )
    return graded ? { kind: 'graded' } : { kind: 'not_submitted' }
  })
}

/* v8 ignore end */
