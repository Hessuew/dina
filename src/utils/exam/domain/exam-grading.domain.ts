import type {
  ExamAttemptStatus,
  ExamQuestionType,
} from './exam-lifecycle.domain'

type GradableQuestion = {
  id: string
  type: ExamQuestionType
  points: number
}

type GradableOption = {
  id: string
  questionId: string
  isCorrect: boolean
}

type GradableAnswer = {
  id: string
  questionId: string
  selectedOptionId: string | null
  awardedPoints: number | null
}

export type AutoGradeResult = {
  answerId: string
  isCorrect: boolean
  awardedPoints: number
}

/**
 * Auto-grades multiple-choice answers: full points when the selected option
 * is the correct one, zero otherwise. Open-ended answers are ignored.
 */
export function autoGradeMultipleChoice(
  answers: Array<GradableAnswer>,
  questions: Array<GradableQuestion>,
  options: Array<GradableOption>,
): Array<AutoGradeResult> {
  const questionById = new Map(questions.map((q) => [q.id, q]))
  const correctOptionByQuestion = new Map(
    options.filter((o) => o.isCorrect).map((o) => [o.questionId, o.id]),
  )
  const results: Array<AutoGradeResult> = []
  for (const answer of answers) {
    const question = questionById.get(answer.questionId)
    if (!question || question.type !== 'multiple_choice') continue
    const isCorrect =
      answer.selectedOptionId !== null &&
      correctOptionByQuestion.get(answer.questionId) === answer.selectedOptionId
    results.push({
      answerId: answer.id,
      isCorrect,
      awardedPoints: isCorrect ? question.points : 0,
    })
  }
  return results
}

export type AttemptScores = {
  autoScore: number
  manualScore: number
  totalScore: number
  maxScore: number
}

/**
 * Aggregates attempt scores from graded answers. Unanswered questions count
 * as zero. Answers whose awardedPoints is still null count as zero — callers
 * gate on allOpenAnswersGraded before finalizing.
 */
export function computeAttemptScores(
  answers: Array<GradableAnswer>,
  questions: Array<GradableQuestion>,
): AttemptScores {
  const answerByQuestion = new Map(answers.map((a) => [a.questionId, a]))
  let autoScore = 0
  let manualScore = 0
  let maxScore = 0
  for (const question of questions) {
    maxScore += question.points
    const awarded = answerByQuestion.get(question.id)?.awardedPoints ?? 0
    if (question.type === 'multiple_choice') {
      autoScore += awarded
    } else {
      manualScore += awarded
    }
  }
  return {
    autoScore,
    manualScore,
    totalScore: autoScore + manualScore,
    maxScore,
  }
}

export type RescoredAttempt = {
  /** Points from multiple-choice answers under the current answer key. */
  autoScore: number
  /** Recomputed only for graded attempts; submitted attempts leave these unset. */
  manualScore?: number
  totalScore?: number
  /** Per-answer auto-grade rows to persist for multiple-choice answers. */
  answerUpdates: Array<AutoGradeResult>
}

/**
 * Recomputes a completed attempt after the answer key changed: multiple-choice
 * answers are re-graded against the current options while open-answer points
 * (manually assigned) carry over untouched. Score shape mirrors the attempt
 * lifecycle — submitted attempts persist only autoScore; graded attempts also
 * persist manualScore (recomputed from the preserved open-answer points) and
 * totalScore.
 */
export function rescoreCompletedAttempt(
  status: ExamAttemptStatus,
  answers: Array<GradableAnswer>,
  questions: Array<GradableQuestion>,
  options: Array<GradableOption>,
): RescoredAttempt {
  const answerUpdates = autoGradeMultipleChoice(answers, questions, options)
  const awardedByAnswerId = new Map(
    answerUpdates.map((update) => [update.answerId, update.awardedPoints]),
  )
  const scores = computeAttemptScores(
    answers.map((answer) => ({
      ...answer,
      awardedPoints: awardedByAnswerId.get(answer.id) ?? answer.awardedPoints,
    })),
    questions,
  )
  return {
    autoScore: scores.autoScore,
    ...(status === 'graded'
      ? { manualScore: scores.manualScore, totalScore: scores.totalScore }
      : {}),
    answerUpdates,
  }
}

/**
 * Whether an authoring save changes anything a score could depend on: an
 * added or deleted question, a question's points or type, or the set of
 * correct options on a kept question. Prompt, label, order, and exam-meta
 * edits leave completed attempts untouched, so the rescore is skipped.
 */
export function hasScoreRelevantEdits(input: {
  questions: Array<{
    questionId?: string
    type: ExamQuestionType
    points: number
    options: Array<{ id?: string; isCorrect?: boolean }>
  }>
  deletedQuestionIds: Array<string>
  existingQuestions: Array<GradableQuestion>
  existingOptions: Array<GradableOption>
}): boolean {
  if (input.deletedQuestionIds.length > 0) return true
  const existingById = new Map(
    input.existingQuestions.map((question) => [question.id, question]),
  )
  const correctByQuestion = new Map<string, Set<string>>()
  for (const option of input.existingOptions) {
    if (!option.isCorrect) continue
    const correct = correctByQuestion.get(option.questionId) ?? new Set()
    correct.add(option.id)
    correctByQuestion.set(option.questionId, correct)
  }
  return input.questions.some((question) => {
    if (!question.questionId) return true
    const existing = existingById.get(question.questionId)
    if (!existing) return true
    if (existing.type !== question.type || existing.points !== question.points)
      return true
    if (question.options.some((option) => option.isCorrect && !option.id))
      return true
    const nextCorrect = new Set(
      question.options.flatMap((option) =>
        option.isCorrect && option.id ? [option.id] : [],
      ),
    )
    const previousCorrect =
      correctByQuestion.get(question.questionId) ?? new Set()
    return (
      nextCorrect.size !== previousCorrect.size ||
      [...nextCorrect].some((id) => !previousCorrect.has(id))
    )
  })
}

/**
 * Grading may only be finalized once every open-ended question that was
 * ANSWERED has an explicit awardedPoints. Unanswered open questions score
 * zero without needing a grade.
 */
export function allOpenAnswersGraded(
  answers: Array<GradableAnswer>,
  questions: Array<GradableQuestion>,
): boolean {
  const openQuestionIds = new Set(
    questions.filter((q) => q.type === 'open_ended').map((q) => q.id),
  )
  return answers
    .filter((answer) => openQuestionIds.has(answer.questionId))
    .every((answer) => answer.awardedPoints !== null)
}
