import type { assignments, submissions } from '@/db/schema'
import { ValidationError } from '@/utils/errors'

type Assignment = typeof assignments.$inferSelect
type Submission = typeof submissions.$inferSelect

/**
 * Validates that assignment is open for submissions based on status and due date
 */
export function validateSubmissionWindow(
  assignment: Assignment,
  now: Date,
): void {
  if (assignment.status !== 'published') {
    throw new ValidationError('Assignment is not open for submissions', {
      details: { assignmentId: assignment.id, status: assignment.status },
    })
  }

  if (assignment.dueDate < now) {
    throw new ValidationError('Assignment due date has passed', {
      details: { assignmentId: assignment.id, dueDate: assignment.dueDate },
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
