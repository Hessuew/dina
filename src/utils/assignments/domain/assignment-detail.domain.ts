import type { submissionStatusEnum } from '@/db/schema/enums.schema'

export type SubmissionStatusVariant =
  (typeof submissionStatusEnum.enumValues)[number]

/** Status-chip variant for a submission: graded wins, then submitted, else draft. */
export function resolveSubmissionStatusVariant(sub: {
  grade: number | null
  status: SubmissionStatusVariant
}): SubmissionStatusVariant {
  if (sub.grade !== null) return 'graded'
  if (sub.status === 'submitted') return 'submitted'
  return 'draft'
}

/** `<grade> / <maxGrade ?? 100>` when graded, otherwise an em dash. */
export function formatSubmissionGrade(
  grade: number | null,
  maxGrade: number | null | undefined,
): string {
  return grade !== null ? `${grade} / ${maxGrade ?? 100}` : '—'
}

/** Localized submitted date, or an em dash when not yet submitted. */
export function formatSubmittedDate(submittedAt: Date | null): string {
  return submittedAt ? new Date(submittedAt).toLocaleDateString() : '—'
}

/** Initial submission form values, defaulting null fields to empty strings. */
export function buildInitialSubmissionFormData(
  submission: { content: string | null } | null | undefined,
): { content: string } {
  return {
    content: submission?.content || '',
  }
}

/** Student / past-due / can-submit flags for the assignment detail view. */
export function deriveSubmissionPermissions(input: {
  role: string
  status: string
  dueDate: Date | string
  now?: Date
}): { isStudent: boolean; isPastDue: boolean; canSubmit: boolean } {
  const now = input.now ?? new Date()
  const isStudent = input.role === 'student'
  const isPastDue = new Date(input.dueDate) < now
  const canSubmit = isStudent && input.status === 'published' && !isPastDue
  return { isStudent, isPastDue, canSubmit }
}

/** Back-navigation decision: dispatches the matching side effect. */
export function navigateBack(
  input: {
    fromCalendar: boolean
    calendarMonth: string | undefined
    fromDashboard: boolean
  },
  actions: {
    toCalendar: (month: string) => void
    toDashboard: () => void
    back: () => void
  },
): void {
  if (input.fromCalendar && input.calendarMonth) {
    actions.toCalendar(input.calendarMonth)
    return
  }
  if (input.fromDashboard) {
    actions.toDashboard()
    return
  }
  actions.back()
}

/**
 * The edit/delete mode to render the assignment dialog in, or `null` when the
 * dialog should stay closed.
 */
export function resolveEditDialogMode(input: {
  mode: string | null | undefined
  isOpen: boolean
}): 'edit' | 'delete' | null {
  if (!input.isOpen) return null
  if (input.mode === 'edit' || input.mode === 'delete') return input.mode
  return null
}

/** Post-delete navigation decision: dispatches the matching side effect. */
export function navigateAfterDelete(
  input: { fromDashboard: boolean },
  actions: { toAssignments: () => void; toLesson: () => void },
): void {
  if (input.fromDashboard) {
    actions.toAssignments()
    return
  }
  actions.toLesson()
}

/**
 * Whether an assignment status is visible to a viewer.
 * Students and non-managing staff only see published; managers (Course Teacher
 * + Admin) see drafts/closed too.
 */
export function isAssignmentVisibleToViewer(input: {
  role: string
  canManage: boolean
  status: string
}): boolean {
  if (input.canManage) return true
  return input.status === 'published'
}

/** Staff may load the full submissions list only when they manage the course. */
export function shouldLoadAssignmentSubmissions(canManage: boolean): boolean {
  return canManage
}

/** Staff may open a non-published assignment only when they manage the course. */
export function canOpenUnpublishedAssignment(input: {
  role: string
  canManage: boolean
}): boolean {
  if (input.role === 'student') return false
  return input.canManage
}
