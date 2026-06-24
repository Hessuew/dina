import { CheckCircle2Icon, CircleIcon } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Assignment } from '@/components/view/assignments-view/AssignmentsView'

export type UpcomingAssignmentsRole = 'student' | 'teacher' | 'admin'

export type SubmissionStatusLabel = 'Submitted' | 'Not Submitted'

export type UpcomingAssignmentRow = {
  overdue: boolean
  submissionStatus: SubmissionStatusLabel
  isSubmitted: boolean
  formattedDueDate: string
  showStudentBadge: boolean
  badgeClassName: string
  statusIcon: LucideIcon
  dueDateClassName: string
  teacherStatsText: string | null
}

export function filterUpcomingAssignments(
  assignments: Array<Assignment>,
  role: UpcomingAssignmentsRole,
  now: Date,
): Array<Assignment> {
  return assignments
    .filter((assignment) => {
      if (role === 'student') {
        const isNotPastDue = new Date(assignment.dueDate) >= now
        const isNotGraded =
          !assignment.submission || assignment.submission.grade === null
        return assignment.status === 'published' && isNotPastDue && isNotGraded
      }
      return assignment.status === 'published'
    })
    .slice(0, 5)
}

export function getSubmissionStatus(
  assignment: Assignment,
): SubmissionStatusLabel {
  if (!assignment.submission) return 'Not Submitted'
  if (
    assignment.submission.status === 'submitted' ||
    assignment.submission.status === 'graded'
  ) {
    return 'Submitted'
  }
  return 'Not Submitted'
}

export function isAssignmentOverdue(dueDate: Date, now: Date): boolean {
  return new Date(dueDate) < now
}

export function formatDueDate(date: Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

export function buildUpcomingAssignmentRow(
  assignment: Assignment,
  role: UpcomingAssignmentsRole,
  now: Date,
): UpcomingAssignmentRow {
  const submissionStatus = getSubmissionStatus(assignment)
  const isSubmitted = submissionStatus === 'Submitted'
  const overdue = isAssignmentOverdue(assignment.dueDate, now)
  const stats = assignment.submissionStats

  return {
    overdue,
    submissionStatus,
    isSubmitted,
    formattedDueDate: formatDueDate(assignment.dueDate),
    showStudentBadge: role === 'student',
    badgeClassName: isSubmitted
      ? 'border-[#C5A059]/40 text-[#D4B373]'
      : 'border-white/12 text-[#8E816D]',
    statusIcon: isSubmitted ? CheckCircle2Icon : CircleIcon,
    dueDateClassName: overdue
      ? 'text-destructive font-medium'
      : 'text-[#8E816D]',
    teacherStatsText:
      role === 'teacher' && stats
        ? `${stats.submitted}/${stats.total} submitted`
        : null,
  }
}
