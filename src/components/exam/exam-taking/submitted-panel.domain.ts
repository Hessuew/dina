import type { ExamAttemptStatus } from '@/utils/exam/domain/exam-lifecycle.domain'

export type SubmittedPanelView = {
  heading: string
  scoreText: string | null
}

/** Heading and score line for the post-submission panel; score only when graded. */
export function submittedPanelView(
  attempt: { status: ExamAttemptStatus; totalScore: number | null },
  maxScore: number,
): SubmittedPanelView {
  const graded = attempt.status === 'graded'
  return {
    heading: graded ? 'Exam graded' : 'Exam submitted',
    scoreText:
      graded && attempt.totalScore !== null
        ? `${attempt.totalScore} / ${maxScore}`
        : null,
  }
}
