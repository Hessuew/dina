import { useEffect, useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'
import {
  createAssignmentSchema,
  gradeSubmissionSchema,
  updateAssignmentSchema,
} from '@/schemas/assignment.schema'
import { Button } from '@/components/ui/button'
import { DeleteConfirmDialog } from '@/components/ui/delete-confirm-dialog'
import { FormDialog } from '@/components/ui/form-dialog'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { FieldGroup } from '@/components/ui/field'
import { SelectItem } from '@/components/ui/select'
import { useMutation } from '@/hooks/useMutation'
import { useEntityMutation } from '@/hooks/useEntityMutation'
import { useAppForm } from '@/hooks/form'
import {
  createAssignment,
  deleteAssignment,
  gradeSubmission,
  updateAssignment,
} from '@/utils/assignments/assignments'
import facultyBackground from '@/assets/images/bg/bg_lecturers.webp'

type AssignmentFormData = {
  title: string
  description: string
  dueDate: string
  maxGrade: number
  status: string
}

type AssignmentFormErrors = Partial<Record<keyof AssignmentFormData, string>>

const emptyAssignmentForm: AssignmentFormData = {
  title: '',
  description: '',
  dueDate: '',
  maxGrade: 100,
  status: 'draft',
}

type GradingFormData = {
  grade: number
  feedback: string
}

type GradingFormErrors = Partial<Record<keyof GradingFormData, string>>

const emptyGradingForm: GradingFormData = {
  grade: 0,
  feedback: '',
}

type AssignmentDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'create' | 'edit' | 'delete' | 'grade'
  lessonId?: string
  assignment?: {
    id: string
    title: string
    description: string | null
    dueDate: Date
    maxGrade: number | null
    status: 'draft' | 'published' | 'closed'
  }
  submission?: {
    id: string
    content: string | null
    fileUrl: string | null
    grade: number | null
    feedback: string | null
    student: { fullName: string }
  } | null
  submissionCount?: number
  onDeleteSuccess?: () => void
}

function getAssignmentInitialValues(
  assignment: AssignmentDialogProps['assignment'],
  mode: AssignmentDialogProps['mode'],
): AssignmentFormData {
  if (!assignment || mode === 'create') return { ...emptyAssignmentForm }

  return {
    title: assignment.title,
    description: assignment.description ?? '',
    dueDate: new Date(assignment.dueDate).toISOString().slice(0, 16),
    maxGrade: assignment.maxGrade ?? 100,
    status: assignment.status,
  }
}

function getGradingInitialValues(
  submission: AssignmentDialogProps['submission'],
): GradingFormData {
  if (!submission) return { ...emptyGradingForm }

  return {
    grade: submission.grade ?? 0,
    feedback: submission.feedback ?? '',
  }
}

function extractAssignmentErrors(
  issues: Array<{ path: Array<PropertyKey>; message: string }>,
): AssignmentFormErrors {
  const errors: AssignmentFormErrors = {}

  for (const issue of issues) {
    const key = issue.path[0]
    if (typeof key !== 'string' || !(key in emptyAssignmentForm)) continue

    const field = key as keyof AssignmentFormData
    if (!errors[field]) errors[field] = issue.message
  }

  return errors
}

function extractGradingErrors(
  issues: Array<{ path: Array<PropertyKey>; message: string }>,
): GradingFormErrors {
  const errors: GradingFormErrors = {}

  for (const issue of issues) {
    const key = issue.path[0]
    if (typeof key !== 'string' || !(key in emptyGradingForm)) continue

    const field = key as keyof GradingFormData
    if (!errors[field]) errors[field] = issue.message
  }

  return errors
}

export function AssignmentDialog({
  open,
  onOpenChange,
  mode,
  lessonId,
  assignment,
  submission,
  submissionCount = 0,
  onDeleteSuccess,
}: AssignmentDialogProps) {
  const router = useRouter()
  const [submitErrors, setSubmitErrors] = useState<AssignmentFormErrors>({})
  const [gradeErrors, setGradeErrors] = useState<GradingFormErrors>({})

  const { createMutation, updateMutation, deleteMutation, isAnyPending } =
    useEntityMutation({
      createFn: createAssignment,
      updateFn: updateAssignment,
      deleteFn: deleteAssignment,
      invalidateRouter: false,
      onSuccess: async () => {
        onOpenChange(false)
        if (onDeleteSuccess) {
          onDeleteSuccess()
        } else {
          await router.invalidate()
        }
      },
    })

  const gradeMutation = useMutation({
    fn: gradeSubmission,
    onSuccess: async () => {
      toast.success('Submission graded successfully!')
      onOpenChange(false)
      await router.invalidate()
    },
  })

  const assignmentForm = useAppForm({
    defaultValues: getAssignmentInitialValues(assignment, mode),
    onSubmit: ({ value }) => {
      const shared = {
        title: value.title,
        description: value.description || undefined,
        dueDate: value.dueDate,
        maxGrade: value.maxGrade > 0 ? value.maxGrade : undefined,
      }

      if (mode === 'create') {
        if (!lessonId) return

        const result = createAssignmentSchema.safeParse({
          ...shared,
          lessonId,
        })

        if (!result.success) {
          setSubmitErrors(extractAssignmentErrors(result.error.issues))
          return
        }

        setSubmitErrors({})
        createMutation.mutate({ data: result.data })
        return
      }

      if (!assignment) return

      const result = updateAssignmentSchema.safeParse({
        ...shared,
        assignmentId: assignment.id,
        status: value.status as 'draft' | 'published' | 'closed',
      })

      if (!result.success) {
        setSubmitErrors(extractAssignmentErrors(result.error.issues))
        return
      }

      setSubmitErrors({})
      updateMutation.mutate({ data: result.data })
    },
  })

  const gradeForm = useAppForm({
    defaultValues: getGradingInitialValues(submission),
    onSubmit: ({ value }) => {
      if (!submission || !assignment) return

      const result = gradeSubmissionSchema.safeParse({
        submissionId: submission.id,
        assignmentId: assignment.id,
        grade: value.grade,
        feedback: value.feedback || undefined,
      })

      if (!result.success) {
        setGradeErrors(extractGradingErrors(result.error.issues))
        return
      }

      setGradeErrors({})
      gradeMutation.mutate({ data: result.data })
    },
  })

  const clearSubmitError = (field: keyof AssignmentFormData) => {
    if (!submitErrors[field]) return
    setSubmitErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  useEffect(() => {
    if (!open) return
    setSubmitErrors({})
    setGradeErrors({})
    assignmentForm.reset(getAssignmentInitialValues(assignment, mode))
    gradeForm.reset(getGradingInitialValues(submission))
  }, [open, mode, assignment, submission, assignmentForm, gradeForm])

  const dialogStyle = {
    backgroundImage: `linear-gradient(180deg, rgba(10,10,11,0.9), rgba(16,16,17,0.95)), url(${facultyBackground})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  }

  if (mode === 'delete') {
    if (submissionCount > 0) {
      return (
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent
            className="rounded-none border border-white/10 text-[#F8F4EC] shadow-[0_42px_100px_-52px_rgba(0,0,0,0.82)]"
            style={dialogStyle}
            showCloseButton={false}
          >
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.04),transparent_38%,rgba(197,160,89,0.08)_100%)]" />
            <div className="relative">
              <DialogHeader>
                <div className="mb-1">
                  <div className="h-px w-8 bg-[#C5A059]/40" />
                  <div className="mt-2 text-[0.68rem] font-medium tracking-[0.3em] text-[#8E816D] uppercase">
                    Confirm action
                  </div>
                </div>
                <DialogTitle className="font-serif text-xl tracking-[-0.02em] text-[#F8F4EC]">
                  Delete Assignment
                </DialogTitle>
                <DialogDescription className="text-[#AFA28F]">
                  This assignment has {submissionCount} submission
                  {submissionCount !== 1 ? 's' : ''}. Assignments with
                  submissions cannot be deleted.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="mt-6 rounded-none border-t border-white/8 bg-white/3 pt-6">
                <Button
                  variant="outline"
                  theme="dark"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
      )
    }

    return (
      <DeleteConfirmDialog
        open={open}
        onOpenChange={onOpenChange}
        entityName="Assignment"
        onConfirm={() =>
          assignment &&
          deleteMutation.mutate({
            data: { assignmentId: assignment.id },
          })
        }
        isDeleting={deleteMutation.isPending}
      />
    )
  }

  if (mode === 'grade') {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="rounded-none border border-white/10 text-[#F8F4EC] shadow-[0_42px_100px_-52px_rgba(0,0,0,0.82)]"
          style={dialogStyle}
          showCloseButton={false}
        >
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.04),transparent_38%,rgba(197,160,89,0.08)_100%)]" />
          <div className="relative flex min-h-0 flex-1 flex-col">
            <DialogHeader>
              <div className="mb-1">
                <div className="h-px w-8 bg-[#C5A059]/40" />
                <div className="mt-2 text-[0.68rem] font-medium tracking-[0.3em] text-[#8E816D] uppercase">
                  Grade submission
                </div>
              </div>
              <DialogTitle className="font-serif text-xl tracking-[-0.02em] text-[#F8F4EC]">
                {submission?.student.fullName}
              </DialogTitle>
            </DialogHeader>

            <DialogBody>
              <div className="mt-4 space-y-4">
                <div>
                  <div className="text-[0.62rem] font-medium tracking-[0.3em] text-[#8E816D] uppercase">
                    Student's Answer
                  </div>
                  <div className="mt-2 border border-white/10 bg-white/4 px-4 py-3">
                    <p className="text-sm whitespace-pre-wrap text-[#AFA28F]">
                      {submission?.content || 'No content provided'}
                    </p>
                  </div>
                </div>
                {submission?.fileUrl && (
                  <div>
                    <div className="text-[0.62rem] font-medium tracking-[0.3em] text-[#8E816D] uppercase">
                      File URL
                    </div>
                    <a
                      href={submission.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 block text-sm text-[#9B7A41] hover:underline"
                    >
                      {submission.fileUrl}
                    </a>
                  </div>
                )}
                <FieldGroup>
                  <gradeForm.AppField name="grade">
                    {(field) => (
                      <field.NumberField
                        id="grade"
                        label={`Grade (max: ${assignment?.maxGrade ?? 100})`}
                        min={0}
                        max={assignment?.maxGrade ?? 100}
                        placeholder="0"
                        error={gradeErrors.grade}
                        onValueChange={() => {
                          if (gradeErrors.grade)
                            setGradeErrors((prev) => ({
                              ...prev,
                              grade: undefined,
                            }))
                        }}
                      />
                    )}
                  </gradeForm.AppField>
                  <gradeForm.AppField name="feedback">
                    {(field) => (
                      <field.TextAreaField
                        id="feedback"
                        label="Feedback"
                        placeholder="Provide feedback to the student..."
                        rows={4}
                      />
                    )}
                  </gradeForm.AppField>
                </FieldGroup>
              </div>
            </DialogBody>

            <DialogFooter className="mt-6 rounded-none border-t border-white/8 bg-white/3 pt-6">
              <Button
                variant="outline"
                theme="dark"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                theme="dark"
                onClick={() => void gradeForm.handleSubmit()}
                disabled={gradeMutation.isPending}
              >
                {gradeMutation.isPending ? 'Saving...' : 'Save Grade'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      mode={mode}
      title={mode === 'create' ? 'Create Assignment' : 'Edit Assignment'}
      subtitle={
        mode === 'create'
          ? 'Add a new assignment for this lesson'
          : 'Update the assignment information'
      }
      maxWidth="3xl"
      onSubmit={() => void assignmentForm.handleSubmit()}
      isSubmitting={isAnyPending}
      submitLabel={mode === 'create' ? 'Create Assignment' : 'Save Changes'}
    >
      <DialogBody>
        <FieldGroup className="mt-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <assignmentForm.AppField name="title">
              {(field) => (
                <field.TextField
                  id="title"
                  label="Title"
                  required
                  className="sm:col-span-2"
                  error={submitErrors.title}
                  onValueChange={() => clearSubmitError('title')}
                />
              )}
            </assignmentForm.AppField>
            <assignmentForm.AppField name="dueDate">
              {(field) => (
                <field.TextField
                  id="dueDate"
                  label="Due Date"
                  required
                  type="datetime-local"
                  error={submitErrors.dueDate}
                  onValueChange={() => clearSubmitError('dueDate')}
                />
              )}
            </assignmentForm.AppField>
            <assignmentForm.AppField name="maxGrade">
              {(field) => (
                <field.NumberField
                  id="maxGrade"
                  label="Maximum Grade"
                  min={0}
                  placeholder="100"
                  error={submitErrors.maxGrade}
                  onValueChange={() => clearSubmitError('maxGrade')}
                />
              )}
            </assignmentForm.AppField>
            <assignmentForm.AppField name="status">
              {(field) => (
                <field.SelectField id="status" label="Status">
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </field.SelectField>
              )}
            </assignmentForm.AppField>
            <assignmentForm.AppField name="description">
              {(field) => (
                <field.TextAreaField
                  id="description"
                  label="Description"
                  className="sm:col-span-2"
                  rows={5}
                />
              )}
            </assignmentForm.AppField>
          </div>
        </FieldGroup>
      </DialogBody>
    </FormDialog>
  )
}
