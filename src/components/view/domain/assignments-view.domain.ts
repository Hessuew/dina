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
  maxGrade?: number | null
  submission?: CardSubmission | null
  submissionStats?: { total: number; submitted: number; graded: number }
}

export type AssignmentCardFooterMode = 'grade' | 'stats' | 'none'

export type AssignmentCardViewModel = {
  overdue: boolean
  statusChipVariant: SubmissionVariant | AssignmentStatus
  showStudentGrade: boolean
  footerMode: AssignmentCardFooterMode
  dueDateClassName: string | undefined
  gradeText: string
  submittedText: string
  gradedText: string
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

export type AssignmentCourse = {
  id: string
  title: string
  startDate: Date | null
}

export function getAssignmentsSubtitle(role: AssignmentRole): string {
  return role === 'student'
    ? 'View and submit your assignments'
    : 'Manage assignments and grade submissions'
}

export function getSelectedCourseLabel(
  selectedCourse: string | null,
  courses: Array<AssignmentCourse>,
): string {
  if (selectedCourse === 'all') return 'All Courses'
  return courses.find((c) => c.id === selectedCourse)?.title || 'Select Course'
}

type GroupableAssignment = {
  lesson: { course: AssignmentCourse }
}

export type AssignmentCourseGroup<T> = {
  course: AssignmentCourse
  assignments: Array<T>
}

export type AssignmentsCourseView<T> = {
  courses: Array<AssignmentCourse>
  filteredAssignments: Array<T>
  groupedByCourse: Array<AssignmentCourseGroup<T>>
}

export function buildAssignmentsCourseView<T extends GroupableAssignment>(
  assignments: Array<T>,
  selectedCourse: string | null,
): AssignmentsCourseView<T> {
  const courses = Array.from(
    new Map(
      assignments.map((a) => [a.lesson.course.id, a.lesson.course]),
    ).values(),
  ).sort((a, b) => {
    const dateA = a.startDate ? new Date(a.startDate).getTime() : 0
    const dateB = b.startDate ? new Date(b.startDate).getTime() : 0
    return dateA - dateB
  })

  const filteredAssignments =
    selectedCourse === 'all'
      ? assignments
      : assignments.filter((a) => a.lesson.course.id === selectedCourse)

  const groupedByCourse = courses.map((course) => ({
    course,
    assignments: filteredAssignments.filter(
      (a) => a.lesson.course.id === course.id,
    ),
  }))

  return { courses, filteredAssignments, groupedByCourse }
}

export function buildAssignmentCardViewModel(
  assignment: AssignmentCardInput,
  role: AssignmentRole,
): AssignmentCardViewModel {
  const submissionVariant = getSubmissionVariant(
    getSubmissionStatusLabel(assignment.submission),
  )

  const submitted =
    assignment.submission?.status === 'submitted' ||
    assignment.submission?.status === 'graded'
  const overdue =
    isAssignmentOverdue(assignment.dueDate) &&
    (role !== 'student' || !submitted)
  const showStudentGrade =
    assignment.submission?.grade !== null &&
    assignment.submission?.grade !== undefined

  const stats = assignment.submissionStats

  return {
    overdue,
    statusChipVariant:
      role === 'student' ? submissionVariant : assignment.status,
    showStudentGrade,
    footerMode: getAssignmentCardFooterMode(
      role,
      showStudentGrade,
      Boolean(stats),
    ),
    dueDateClassName: overdue ? 'font-medium text-red-400' : undefined,
    gradeText: `${assignment.submission?.grade ?? ''} / ${assignment.maxGrade ?? 100}`,
    submittedText: stats ? `${stats.submitted} / ${stats.total}` : '',
    gradedText: stats ? String(stats.graded) : '',
  }
}

export function getAssignmentCardFooterMode(
  role: AssignmentRole,
  showStudentGrade: boolean,
  hasSubmissionStats: boolean,
): AssignmentCardFooterMode {
  if (role === 'student') return showStudentGrade ? 'grade' : 'none'
  return hasSubmissionStats ? 'stats' : 'none'
}
