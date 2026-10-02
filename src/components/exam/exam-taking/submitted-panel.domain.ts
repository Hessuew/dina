import type { ExamAttemptStatus } from '@/utils/exam/domain/exam-lifecycle.domain'

export type SubmittedPanelView = {
  heading: string
  scoreText: string | null
  feedback: string | null
}

/** Heading, score line, and grader feedback for the post-submission panel; score and feedback only when graded. */
export function submittedPanelView(
  attempt: {
    status: ExamAttemptStatus
    totalScore: number | null
    feedback: string | null
  },
  maxScore: number,
): SubmittedPanelView {
  const graded = attempt.status === 'graded'
  return {
    heading: graded ? 'Exam graded' : 'Exam submitted',
    scoreText:
      graded && attempt.totalScore !== null
        ? `${attempt.totalScore} / ${maxScore}`
        : null,
    feedback: graded ? attempt.feedback : null,
  }
}
