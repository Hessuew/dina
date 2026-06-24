import type { StudentDetailWithAssignments } from '@/types/student'

type Enrollment = StudentDetailWithAssignments['enrollments'][number]
type Assignment = StudentDetailWithAssignments['assignments'][number]

export type CourseAssignmentGroup = {
  course: Enrollment
  assignments: Array<Assignment>
}

export type AssignmentRowStatus = {
  isGraded: boolean
  isSubmitted: boolean
  overdue: boolean
}

export function getStudentInitials(fullName: string): string {
  return fullName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function groupAssignmentsByCourse(
  enrollments: Array<Enrollment>,
  assignments: Array<Assignment>,
): Array<CourseAssignmentGroup> {
  return enrollments.map((enrollment) => ({
    course: enrollment,
    assignments: assignments.filter((a) => a.courseId === enrollment.courseId),
  }))
}

export function computeCourseAverageGrade(
  assignments: Array<Assignment>,
): number | null {
  const courseGrades = assignments
    .filter((a) => a.submission?.grade !== null)
    .map((a) => ({
      grade: a.submission!.grade!,
      maxGrade: a.maxGrade ?? 100,
    }))

  if (courseGrades.length === 0) return null

  return Math.round(
    courseGrades.reduce((sum, g) => sum + (g.grade / g.maxGrade) * 100, 0) /
      courseGrades.length,
  )
}

export function getAssignmentRowStatus(
  assignment: Assignment,
  now: Date,
): AssignmentRowStatus {
  return {
    isGraded: assignment.submission?.grade !== null,
    isSubmitted: assignment.submission !== null,
    overdue: new Date(assignment.dueDate) < now,
  }
}

export function formatAssignmentGrade(
  assignment: Assignment,
  status: Pick<AssignmentRowStatus, 'isGraded' | 'isSubmitted'>,
): string {
  if (status.isGraded) {
    return `${assignment.submission!.grade} / ${assignment.maxGrade ?? 100}`
  }
  return status.isSubmitted ? 'Submitted' : 'Not submitted'
}

export function formatAssignmentDueDate(dueDate: Date): string {
  return new Date(dueDate).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

export function shouldShowOverdueBadge(
  status: Pick<AssignmentRowStatus, 'overdue' | 'isGraded'>,
): boolean {
  return status.overdue && !status.isGraded
}
