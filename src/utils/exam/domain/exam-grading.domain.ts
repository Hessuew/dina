import type { ExamQuestionType } from './exam-lifecycle.domain'

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
  return { autoScore, manualScore, totalScore: autoScore + manualScore, maxScore }
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
