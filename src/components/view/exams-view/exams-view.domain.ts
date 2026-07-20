import type { ExamAttemptStatus } from '@/utils/exam/domain/exam-lifecycle.domain'
import { isWithinStartWindow } from '@/utils/exam/domain/exam-timing.domain'

export type StudentExamCardState =
  | 'upcoming'
  | 'open'
  | 'in_progress'
  | 'submitted'
  | 'graded'
  | 'closed'

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

export const STUDENT_EXAM_CARD_LABELS: Record<StudentExamCardState, string> = {
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
