import type { ExamAttemptStatus } from '@/utils/exam/domain/exam-lifecycle.domain'
import { isWithinStartWindow } from '@/utils/exam/domain/exam-timing.domain'

export type StudentExamCardState =
  'upcoming' | 'open' | 'in_progress' | 'submitted' | 'graded' | 'closed'

type StudentExamCardInput = {
  opensAt: Date
  closesAt: Date
  attemptStatus: ExamAttemptStatus | null
}

/** Derives what a student sees and can do on an exam card. */
export function deriveStudentExamCardState(
  { opensAt, closesAt, attemptStatus }: StudentExamCardInput,
  now: Date,
): StudentExamCardState {
  if (attemptStatus === 'in_progress') return 'in_progress'
  if (attemptStatus === 'submitted') return 'submitted'
  if (attemptStatus === 'graded') return 'graded'
  if (now.getTime() < opensAt.getTime()) return 'upcoming'
  if (isWithinStartWindow(now, opensAt, closesAt)) return 'open'
  return 'closed'
}

const STUDENT_EXAM_CARD_LABELS: Record<StudentExamCardState, string> = {
  upcoming: 'Opens soon',
  open: 'Open',
  in_progress: 'In progress',
  submitted: 'Submitted',
  graded: 'Graded',
  closed: 'Closed',
}

/** Card action: start a fresh attempt, continue a running one, or nothing. */
export function studentExamCardAction(
  state: StudentExamCardState,
): 'start' | 'continue' | 'review' | null {
  if (state === 'open') return 'start'
  if (state === 'in_progress') return 'continue'
  if (state === 'submitted' || state === 'graded') return 'review'
  return null
}

export const STUDENT_EXAM_ACTION_LABELS: Record<
  'start' | 'continue' | 'review',
  string
> = {
  start: 'Start exam',
  continue: 'Continue exam',
  review: 'View exam',
}

/** Sends existing attempts straight to the exam or results view. */
export function studentExamCardTarget(
  action: 'start' | 'continue' | 'review',
): '/exams/$examId' | '/exams/$examId/take' {
  return action === 'start' ? '/exams/$examId' : '/exams/$examId/take'
}

/** Label for the landing-page button that navigates into an existing attempt. */
export function studentLandingGoLabel(action: 'continue' | 'review'): string {
  return action === 'continue' ? 'Continue exam' : 'View submission'
}

/** Message shown on the landing page when no action is available. */
export function studentLandingClosedMessage(
  state: StudentExamCardState,
): string {
  return state === 'upcoming'
    ? 'This exam has not opened yet.'
    : 'This exam is closed.'
}

/** Label for the landing-page start button, reflecting pending state. */
export function startExamButtonLabel(starting: boolean): string {
  return starting ? 'Starting…' : 'Start exam now'
}

const WINDOW_FORMAT: Intl.DateTimeFormatOptions = {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
}

export function formatExamWindow(opensAt: Date, closesAt: Date): string {
  const open = opensAt.toLocaleString('en-GB', WINDOW_FORMAT)
  const close = closesAt.toLocaleString('en-GB', WINDOW_FORMAT)
  return `${open} – ${close}`
}

/** Formats a graded attempt's final score out of total available points. */
export function formatGradedScore(
  totalScore: number | null,
  totalPoints: number,
): string | null {
  if (totalScore === null) return null
  return `${totalScore} / ${totalPoints}`
}

export type StudentExamItemLike = {
  exam: {
    durationMinutes: number
    opensAt: Date
    closesAt: Date
    totalPoints: number
  }
  attempt: {
    status: ExamAttemptStatus
    totalScore: number | null
  } | null
}

export type StudentCardViewModel = {
  state: StudentExamCardState
  action: 'start' | 'continue' | 'review' | null
  stateLabel: string
  windowLabel: string
  durationMinutes: number
  scoreDisplay: string | null
}

/** Derives all presentation state for a student exam card. */
export function deriveStudentCardViewModel(
  item: StudentExamItemLike,
  now: Date,
): StudentCardViewModel {
  const state = deriveStudentExamCardState(
    {
      opensAt: item.exam.opensAt,
      closesAt: item.exam.closesAt,
      attemptStatus: item.attempt?.status ?? null,
    },
    now,
  )
  const action = studentExamCardAction(state)
  const scoreDisplay =
    state === 'graded'
      ? formatGradedScore(
          item.attempt?.totalScore ?? null,
          item.exam.totalPoints,
        )
      : null
  return {
    state,
    action,
    stateLabel: STUDENT_EXAM_CARD_LABELS[state],
    windowLabel: formatExamWindow(item.exam.opensAt, item.exam.closesAt),
    durationMinutes: item.exam.durationMinutes,
    scoreDisplay,
  }
}
