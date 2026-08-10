import type { assignments, submissions } from '@/db/schema'
import { ValidationError } from '@/utils/errors'

type Assignment = typeof assignments.$inferSelect
type Submission = typeof submissions.$inferSelect

/**
 * Validates that assignment is open for submissions based on status only.
 * Due date is soft after publish: late drafts and submits remain allowed.
 * Teachers hard-close the window by setting status to draft/closed.
 */
export function validateSubmissionWindow(
  assignment: Assignment,
  _now: Date,
): void {
  if (assignment.status !== 'published') {
    throw new ValidationError('Assignment is not open for submissions', {
      details: { assignmentId: assignment.id, status: assignment.status },
    })
  }
}

/**
 * Determines if an assignment can be deleted based on existing submissions
 */
export function canDeleteAssignment(
  _assignment: Assignment,
  submissionsList: Array<Submission>,
): boolean {
  return submissionsList.length === 0
}

/**
 * Calculates submission statistics for an assignment
 */
export function calculateAssignmentStats(submissionsList: Array<Submission>): {
  total: number
  submitted: number
  graded: number
} {
  const total = submissionsList.length
  const submitted = submissionsList.filter(
    (s) => s.status === 'submitted',
  ).length
  const graded = submissionsList.filter((s) => s.grade !== null).length

  return { total, submitted, graded }
}

/**
 * Filters assignments by status for student view (only published)
 */
export function filterAssignmentsForStudent(
  assignmentsList: Array<Assignment>,
): Array<Assignment> {
  return assignmentsList.filter((a) => a.status === 'published')
}
