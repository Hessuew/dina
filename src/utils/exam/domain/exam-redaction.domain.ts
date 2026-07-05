import type { examAttempts, examQuestionOptions } from '@/db/schema'

type OptionRow = typeof examQuestionOptions.$inferSelect
type AttemptRow = typeof examAttempts.$inferSelect

export type StudentOption = Omit<OptionRow, 'isCorrect'>

/**
 * Strips the correct-answer flag before an option row leaves the server for
 * a student (redacted-view precedent; see ADR 0017).
 */
export function redactOptionsForStudent(
  options: Array<OptionRow>,
): Array<StudentOption> {
  return options.map(({ isCorrect: _isCorrect, ...rest }) => rest)
}

export type StudentAttempt = Omit<
  AttemptRow,
  'autoScore' | 'manualScore' | 'totalScore' | 'gradedBy'
> & {
  autoScore: number | null
  manualScore: number | null
  totalScore: number | null
}

/** Scores stay hidden from the student until the attempt is graded. */
export function redactAttemptForStudent(attempt: AttemptRow): StudentAttempt {
  const { gradedBy: _gradedBy, ...rest } = attempt
  if (attempt.status === 'graded') {
    return rest
  }
  return { ...rest, autoScore: null, manualScore: null, totalScore: null }
}

type AnswerRow = {
  isCorrect: boolean | null
  awardedPoints: number | null
}

/**
 * Per-answer correctness/points stay hidden from the student until the
 * attempt is graded — a submitted-but-ungraded attempt must not leak which
 * multiple-choice answers were right.
 */
export function redactAnswersForStudent<T extends AnswerRow>(
  answers: Array<T>,
  attemptStatus: AttemptRow['status'],
): Array<T> {
  if (attemptStatus === 'graded') return answers
  return answers.map((answer) => ({
    ...answer,
    isCorrect: null,
    awardedPoints: null,
  }))
}
