export type McOptionTone = 'correct' | 'selected' | 'default'

/** Visual tone for an MC option row: correct answer wins over selection. */
export function mcOptionTone(
  isCorrect: boolean,
  isSelected: boolean,
): McOptionTone {
  if (isCorrect) return 'correct'
  if (isSelected) return 'selected'
  return 'default'
}

/** Suffix markers appended to an MC option label. */
export function mcOptionSuffix(isCorrect: boolean, isSelected: boolean): string {
  const correct = isCorrect ? ' ✓ correct' : ''
  const selected = isSelected ? ' · student answer' : ''
  return `${correct}${selected}`
}

/** "<awarded> / <max> pts" with a placeholder while ungraded. */
export function awardedPointsLabel(
  awardedPoints: number | null | undefined,
  maxPoints: number,
  placeholder: string,
): string {
  return `${awardedPoints ?? placeholder} / ${maxPoints} pts`
}

/** Initial value for the open-answer points input. */
export function initialAwardedPoints(
  answer: { awardedPoints: number | null } | undefined,
): number {
  return answer?.awardedPoints ?? 0
}

/** Points label for an open answer, tolerating a missing answer row. */
export function openAnswerPointsLabel(
  answer: { awardedPoints: number | null } | undefined,
  maxPoints: number,
): string {
  return awardedPointsLabel(answer?.awardedPoints, maxPoints, '—')
}

/** The student's text, or null when unanswered/empty. */
export function openAnswerText(
  answer: { textAnswer: string | null } | undefined,
): string | null {
  return answer?.textAnswer ? answer.textAnswer : null
}

/** The answer row that may be graded now, or null when grading is not possible. */
export function gradableOpenAnswer<T>(
  readOnly: boolean,
  answer: T | undefined,
): T | null {
  return !readOnly && answer !== undefined ? answer : null
}
