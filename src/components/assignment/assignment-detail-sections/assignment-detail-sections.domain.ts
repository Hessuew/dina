export interface SubmissionHeaderViewModel {
  title: string
  subtitle: string
}

export type PastDueNoticeTone = 'soft' | 'hard'

export interface PastDueNoticeViewModel {
  tone: PastDueNoticeTone
  message: string
  className: string
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
  } else if (canSubmit && isPastDue) {
    subtitle = 'Late submissions accepted'
  } else if (canSubmit) {
    subtitle = 'Submit before the due date'
  } else if (isPastDue) {
    subtitle = 'Submission period ended'
  } else {
    subtitle = 'Not yet open'
  }
  return { title, subtitle }
}

/** Past-due about-card notice; null when not past due. Soft when late still allowed. */
export function buildPastDueNoticeViewModel(input: {
  isPastDue: boolean
  canSubmit: boolean
}): PastDueNoticeViewModel | null {
  if (!input.isPastDue) return null
  if (input.canSubmit) {
    return {
      tone: 'soft',
      message: 'Past due — late submissions still accepted',
      className:
        'border border-[#C5A059]/30 bg-[#C5A059]/10 px-4 py-3 text-xs text-[#E9D9B4]',
    }
  }
  return {
    tone: 'hard',
    message: 'This assignment is past due',
    className:
      'border border-red-400/30 bg-red-900/20 px-4 py-3 text-xs text-red-400',
  }
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
