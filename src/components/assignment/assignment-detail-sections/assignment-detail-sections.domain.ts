import type { SubmissionStatusVariant } from '@/utils/assignments/domain/assignment-detail.domain'
import { resolveSubmissionStatusVariant } from '@/utils/assignments/domain/assignment-detail.domain'

export interface SubmissionHeaderViewModel {
  title: string
  subtitle: string
}

export type PastDueNoticeTone = 'soft' | 'hard' | 'muted'

export interface PastDueNoticeViewModel {
  tone: PastDueNoticeTone
  message: string
  className: string
}

const SUBMISSION_STATUS_SUBTITLE: Record<string, string> = {
  submitted: 'Submitted',
  graded: 'Graded',
  returned: 'Graded',
}

export function buildSubmissionHeaderViewModel(input: {
  isStudent: boolean
  canSubmit: boolean
  isPastDue: boolean
  isClosed: boolean
  submissionStatus: string | null
  submissionCount: number
}): SubmissionHeaderViewModel {
  const { isStudent, canSubmit, isPastDue, isClosed, submissionCount } = input
  const statusSubtitle = input.submissionStatus
    ? SUBMISSION_STATUS_SUBTITLE[input.submissionStatus]
    : undefined
  const title = isStudent ? 'Your Submission' : 'Submissions'
  let subtitle: string
  if (!isStudent) {
    subtitle = `${submissionCount} submitted`
  } else if (statusSubtitle) {
    subtitle = statusSubtitle
  } else if (isClosed) {
    subtitle = 'This assignment is closed'
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

/**
 * About-card notice; null when not past due and not closed. Soft when late
 * still allowed, muted for closed, hard for past due.
 */
export function buildPastDueNoticeViewModel(input: {
  isPastDue: boolean
  canSubmit: boolean
  isClosed: boolean
}): PastDueNoticeViewModel | null {
  if (input.isClosed) {
    return {
      tone: 'muted',
      message: 'This assignment is closed — submissions are read-only',
      className:
        'border border-white/10 bg-white/4 px-4 py-3 text-xs text-[#AFA28F]',
    }
  }
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
  statusVariant: SubmissionStatusVariant
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
    statusVariant: resolveSubmissionStatusVariant({
      grade,
      status: status as SubmissionStatusVariant,
    }),
    showSubmittedAt: submittedAt !== null,
    submittedAtLabel: submittedAt ? new Date(submittedAt).toLocaleString() : '',
    showGradeSection: grade !== null,
    gradeLabel: grade !== null ? `${grade} / ${maxGrade ?? 100}` : '',
    showFeedback: grade !== null && !!feedback,
    feedback: feedback ?? '',
  }
}
