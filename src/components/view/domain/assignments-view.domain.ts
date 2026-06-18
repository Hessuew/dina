import type { AssignmentStatus, SubmissionStatus } from '@/types/database.types'

export type AssignmentRole = 'student' | 'teacher' | 'admin'

export type SubmissionStatusLabel =
  | 'Not Submitted'
  | 'Graded'
  | 'Submitted'
  | 'Draft'

export type SubmissionVariant =
  | 'graded'
  | 'submitted'
  | 'draft'
  | 'not-submitted'

type CardSubmission = {
  grade: number | null
  status: SubmissionStatus
}

type AssignmentCardInput = {
  dueDate: Date
  status: AssignmentStatus
  submission?: CardSubmission | null
}

export type AssignmentCardViewModel = {
  overdue: boolean
  statusChipVariant: SubmissionVariant | AssignmentStatus
  showStudentGrade: boolean
}

export function isAssignmentOverdue(dueDate: Date): boolean {
  return new Date(dueDate) < new Date()
}

export function getSubmissionStatusLabel(
  submission: CardSubmission | null | undefined,
): SubmissionStatusLabel {
  if (!submission) return 'Not Submitted'
  if (submission.grade !== null) return 'Graded'
  if (submission.status === 'submitted') return 'Submitted'
  return 'Draft'
}

export function getSubmissionVariant(
  status: SubmissionStatusLabel,
): SubmissionVariant {
  switch (status) {
    case 'Graded':
      return 'graded'
    case 'Submitted':
      return 'submitted'
    case 'Draft':
      return 'draft'
    default:
      return 'not-submitted'
  }
}

export function buildAssignmentCardViewModel(
  assignment: AssignmentCardInput,
  role: AssignmentRole,
): AssignmentCardViewModel {
  const submissionVariant = getSubmissionVariant(
    getSubmissionStatusLabel(assignment.submission),
  )

  return {
    overdue: isAssignmentOverdue(assignment.dueDate),
    statusChipVariant:
      role === 'student' ? submissionVariant : assignment.status,
    showStudentGrade:
      assignment.submission?.grade !== null &&
      assignment.submission?.grade !== undefined,
  }
}
