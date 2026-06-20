export interface SubmissionHeaderViewModel {
  title: string
  subtitle: string
}

export function buildSubmissionHeaderViewModel(input: {
  isStudent: boolean
  canSubmit: boolean
  isPastDue: boolean
  submissionCount: number
}): SubmissionHeaderViewModel {
  const { isStudent, canSubmit, isPastDue, submissionCount } = input
  const title = isStudent ? 'Your Submission' : 'Submissions'
  let subtitle: string
  if (!isStudent) {
    subtitle = `${submissionCount} submitted`
  } else if (canSubmit) {
    subtitle = 'Submit before the due date'
  } else if (isPastDue) {
    subtitle = 'Submission period ended'
  } else {
    subtitle = 'Not yet open'
  }
  return { title, subtitle }
}

export interface SubmissionStatusViewModel {
  statusVariant: 'submitted' | 'draft'
  showSubmittedAt: boolean
  submittedAtLabel: string
  showGradeSection: boolean
  gradeLabel: string
  showFeedback: boolean
  feedback: string
}

export function buildSubmissionStatusViewModel(
  submission: {
    status: string
    grade: number | null
    feedback: string | null
    submittedAt: Date | null
  },
  maxGrade: number | null,
): SubmissionStatusViewModel {
  const { status, grade, feedback, submittedAt } = submission
  return {
    statusVariant: status === 'submitted' ? 'submitted' : 'draft',
    showSubmittedAt: submittedAt !== null,
    submittedAtLabel: submittedAt ? new Date(submittedAt).toLocaleString() : '',
    showGradeSection: grade !== null,
    gradeLabel: grade !== null ? `${grade} / ${maxGrade ?? 100}` : '',
    showFeedback: grade !== null && !!feedback,
    feedback: feedback ?? '',
  }
}
