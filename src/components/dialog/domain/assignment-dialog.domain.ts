import type { AssignmentStatus } from '@/types/database.types'
import type {
  CreateAssignmentInput,
  GradeSubmissionInput,
  UpdateAssignmentInput,
} from '@/schemas/assignment.schema'

export type AssignmentDialogMode = 'create' | 'edit' | 'delete' | 'grade'
export type AssignmentFormMode = 'create' | 'edit'

export type AssignmentData = {
  id: string
  title: string
  description: string | null
  dueDate: Date
  maxGrade: number | null
  status: AssignmentStatus
}

export type SubmissionData = {
  id: string
  content: string | null
  fileUrl: string | null
  grade: number | null
  feedback: string | null
  student: { fullName: string }
}

export type AssignmentFormData = {
  title: string
  description: string
  dueDate: string
  maxGrade: number
  status: AssignmentStatus
}

export type GradingFormData = {
  grade: number
  feedback: string
}

const EMPTY_ASSIGNMENT_FORM: AssignmentFormData = {
  title: '',
  description: '',
  dueDate: '',
  maxGrade: 100,
  status: 'draft',
}

const EMPTY_GRADING_FORM: GradingFormData = {
  grade: 0,
  feedback: '',
}

export function getAssignmentInitialValues(
  assignment: AssignmentData | undefined,
  mode: AssignmentDialogMode,
): AssignmentFormData {
  if (!assignment || mode === 'create') return { ...EMPTY_ASSIGNMENT_FORM }

  return {
    title: assignment.title,
    description: assignment.description ?? '',
    dueDate: new Date(assignment.dueDate).toISOString().slice(0, 16),
    maxGrade: assignment.maxGrade ?? 100,
    status: assignment.status,
  }
}

export function getGradingInitialValues(
  submission: SubmissionData | null | undefined,
): GradingFormData {
  if (!submission) return { ...EMPTY_GRADING_FORM }

  return {
    grade: submission.grade ?? 0,
    feedback: submission.feedback ?? '',
  }
}

export type AssignmentSubmitAction =
  | { kind: 'none' }
  | { kind: 'create'; data: CreateAssignmentInput }
  | { kind: 'update'; data: UpdateAssignmentInput }

export function buildAssignmentSubmitAction(params: {
  value: AssignmentFormData
  mode: AssignmentFormMode
  lessonId: string | undefined
  assignment: AssignmentData | undefined
}): AssignmentSubmitAction {
  const { value, mode, lessonId, assignment } = params

  const shared = {
    title: value.title,
    description: value.description || undefined,
    dueDate: value.dueDate,
    maxGrade: value.maxGrade > 0 ? value.maxGrade : undefined,
  }

  if (mode === 'create') {
    if (!lessonId) return { kind: 'none' }
    return { kind: 'create', data: { ...shared, lessonId } }
  }

  if (!assignment) return { kind: 'none' }
  return {
    kind: 'update',
    data: { ...shared, assignmentId: assignment.id, status: value.status },
  }
}

export function buildGradeSubmitData(params: {
  value: GradingFormData
  submission: SubmissionData | null | undefined
  assignment: AssignmentData | undefined
}): GradeSubmissionInput | null {
  const { value, submission, assignment } = params
  if (!submission || !assignment) return null

  return {
    submissionId: submission.id,
    assignmentId: assignment.id,
    grade: value.grade,
    feedback: value.feedback || undefined,
  }
}

export function getAssignmentFormCopy(mode: AssignmentFormMode): {
  title: string
  subtitle: string
  submitLabel: string
} {
  if (mode === 'create') {
    return {
      title: 'Create Assignment',
      subtitle: 'Add a new assignment for this lesson',
      submitLabel: 'Create Assignment',
    }
  }
  return {
    title: 'Edit Assignment',
    subtitle: 'Update the assignment information',
    submitLabel: 'Save Changes',
  }
}

export function resolveMaxGrade(
  assignment: AssignmentData | undefined,
): number {
  return assignment?.maxGrade ?? 100
}

export function getSubmissionPreviewModel(
  submission: SubmissionData | null | undefined,
): { contentText: string; fileUrl: string | null } {
  return {
    contentText: submission?.content || 'No content provided',
    fileUrl: submission?.fileUrl ?? null,
  }
}

export function getSubmissionStudentName(
  submission: SubmissionData | null | undefined,
): string {
  return submission?.student.fullName ?? ''
}

export function formatSubmissionCountWarning(submissionCount: number): string {
  const plural = submissionCount !== 1 ? 's' : ''
  return `This assignment has ${submissionCount} submission${plural}. Assignments with submissions cannot be deleted.`
}
