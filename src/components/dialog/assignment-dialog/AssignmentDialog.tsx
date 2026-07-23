import { useEffect } from 'react'
import { useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'
import {
  buildAssignmentSubmitAction,
  buildGradeSubmitData,
  formatSubmissionCountWarning,
  getAssignmentFormCopy,
  getAssignmentInitialValues,
  getGradingInitialValues,
  getSubmissionPreviewModel,
  getSubmissionStudentName,
  resolveMaxGrade,
} from './assignment-dialog.domain'
import type { DeleteAssignmentInput } from '@/schemas/assignment.schema'
import type { MutationReturn } from '@/hooks/useEntityMutation/domain/entity-mutation.domain'
import type {
  AssignmentData,
  AssignmentDialogMode,
  AssignmentFormMode,
  SubmissionData,
} from './assignment-dialog.domain'
import {
  createAssignmentSchema,
  gradeSubmissionSchema,
} from '@/schemas/assignment.schema'
import { Button } from '@/components/ui/button'
import { DeleteConfirmDialog } from '@/components/ui/delete-confirm-dialog'
import { FormDialog } from '@/components/ui/form-dialog/FormDialog'
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
import { useAppForm, withForm } from '@/hooks/form'
import {
  createAssignment,
  deleteAssignment,
  gradeSubmission,
  updateAssignment,
} from '@/utils/assignments/assignments'
import facultyBackground from '@/assets/images/bg/bg_lecturers.webp'

type AssignmentDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: AssignmentDialogMode
  lessonId?: string
  assignment?: AssignmentData
  submission?: SubmissionData | null
  submissionCount?: number
  onDeleteSuccess?: () => void
}

const dialogStyle = {
  backgroundImage: `linear-gradient(180deg, rgba(10,10,11,0.9), rgba(16,16,17,0.95)), url(${facultyBackground})`,
  backgroundSize: 'cover',
  backgroundPosition: 'center',
}

function DeleteWithSubmissionsWarning({
  open,
  onOpenChange,
  submissionCount,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  submissionCount: number
}) {
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
              {formatSubmissionCountWarning(submissionCount)}
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

function DeleteAssignmentFlow({
  open,
  onOpenChange,
  submissionCount,
  assignment,
  deleteMutation,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  submissionCount: number
  assignment: AssignmentData | undefined
  deleteMutation: MutationReturn<{ data: DeleteAssignmentInput }>
}) {
  if (submissionCount > 0) {
    return (
      <DeleteWithSubmissionsWarning
        open={open}
        onOpenChange={onOpenChange}
        submissionCount={submissionCount}
      />
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

function SubmissionPreview({
  submission,
}: {
  submission: SubmissionData | null | undefined
}) {
  const { contentText } = getSubmissionPreviewModel(submission)

  return (
    <div>
      <div className="text-[0.62rem] font-medium tracking-[0.3em] text-[#8E816D] uppercase">
        Student's Answer
      </div>
      <div className="mt-2 border border-white/10 bg-white/4 px-4 py-3">
        <p className="text-sm whitespace-pre-wrap text-[#AFA28F]">
          {contentText}
        </p>
      </div>
    </div>
  )
}

type GradeDialogExtraProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  submission: SubmissionData | null | undefined
  studentName: string
  maxGrade: number
  isSaving: boolean
}

const GradeFormFields = withForm({
  defaultValues: getGradingInitialValues(null),
  props: {} as { maxGrade: number },
  render: ({ form, maxGrade }) => (
    <FieldGroup>
      <form.AppField
        name="grade"
        validators={{ onSubmit: gradeSubmissionSchema.shape.grade }}
      >
        {(field) => (
          <field.NumberField
            id="grade"
            label={`Grade (max: ${maxGrade})`}
            min={0}
            max={maxGrade}
            placeholder="0"
          />
        )}
      </form.AppField>
      <form.AppField name="feedback">
        {(field) => (
          <field.TextAreaField
            id="feedback"
            label="Feedback"
            placeholder="Provide feedback to the student..."
            rows={4}
          />
        )}
      </form.AppField>
    </FieldGroup>
  ),
})

function GradeDialogFooter({
  onOpenChange,
  onSave,
  isSaving,
}: {
  onOpenChange: (open: boolean) => void
  onSave: () => void
  isSaving: boolean
}) {
  return (
    <DialogFooter className="mt-6 rounded-none border-t border-white/8 bg-white/3 pt-6">
      <Button
        variant="outline"
        theme="dark"
        onClick={() => onOpenChange(false)}
      >
        Cancel
      </Button>
      <Button theme="dark" onClick={onSave} disabled={isSaving}>
        {isSaving ? 'Saving...' : 'Save Grade'}
      </Button>
    </DialogFooter>
  )
}

const GradeSubmissionDialog = withForm({
  defaultValues: getGradingInitialValues(null),
  props: {} as GradeDialogExtraProps,
  render: ({
    form,
    open,
    onOpenChange,
    submission,
    studentName,
    maxGrade,
    isSaving,
  }) => (
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
              {studentName}
            </DialogTitle>
          </DialogHeader>

          <DialogBody>
            <div className="mt-4 space-y-4">
              <SubmissionPreview submission={submission} />
              <GradeFormFields form={form} maxGrade={maxGrade} />
            </div>
          </DialogBody>

          <GradeDialogFooter
            onOpenChange={onOpenChange}
            onSave={() => void form.handleSubmit()}
            isSaving={isSaving}
          />
        </div>
      </DialogContent>
    </Dialog>
  ),
})

function useAssignmentMutations({
  onOpenChange,
  onDeleteSuccess,
}: {
  onOpenChange: (open: boolean) => void
  onDeleteSuccess?: () => void
}) {
  const router = useRouter()
  const entityMutations = useEntityMutation({
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

  return { ...entityMutations, gradeMutation }
}

type AssignmentMutations = ReturnType<typeof useAssignmentMutations>

function useAssignmentForms({
  open,
  mode,
  lessonId,
  assignment,
  submission,
  mutations,
}: {
  open: boolean
  mode: AssignmentDialogMode
  lessonId?: string
  assignment?: AssignmentData
  submission?: SubmissionData | null
  mutations: AssignmentMutations
}) {
  const { createMutation, updateMutation, gradeMutation } = mutations

  const assignmentForm = useAppForm({
    defaultValues: getAssignmentInitialValues(assignment, mode),
    onSubmit: ({ value }) => {
      const action = buildAssignmentSubmitAction({
        value,
        mode: mode as AssignmentFormMode,
        lessonId,
        assignment,
      })
      if (action.kind === 'create') createMutation.mutate({ data: action.data })
      else if (action.kind === 'update')
        updateMutation.mutate({ data: action.data })
    },
  })

  const gradeForm = useAppForm({
    defaultValues: getGradingInitialValues(submission),
    onSubmit: ({ value }) => {
      const data = buildGradeSubmitData({ value, submission, assignment })
      if (data) gradeMutation.mutate({ data })
    },
  })

  useEffect(() => {
    if (!open) return
    assignmentForm.reset(getAssignmentInitialValues(assignment, mode))
    gradeForm.reset(getGradingInitialValues(submission))
  }, [open, mode, assignment, submission, assignmentForm, gradeForm])

  return { assignmentForm, gradeForm }
}

function useAssignmentDialog({
  open,
  onOpenChange,
  mode,
  lessonId,
  assignment,
  submission,
  onDeleteSuccess,
}: AssignmentDialogProps) {
  const mutations = useAssignmentMutations({ onOpenChange, onDeleteSuccess })
  const forms = useAssignmentForms({
    open,
    mode,
    lessonId,
    assignment,
    submission,
    mutations,
  })
  return { mutations, ...forms }
}

const AssignmentCoreFields = withForm({
  defaultValues: getAssignmentInitialValues(undefined, 'create'),
  render: ({ form }) => (
    <>
      <form.AppField
        name="title"
        validators={{ onSubmit: createAssignmentSchema.shape.title }}
      >
        {(field) => (
          <field.TextField
            id="title"
            label="Title"
            required
            className="sm:col-span-2"
          />
        )}
      </form.AppField>
      <form.AppField
        name="dueDate"
        validators={{ onSubmit: createAssignmentSchema.shape.dueDate }}
      >
        {(field) => (
          <field.TextField
            id="dueDate"
            label="Due Date"
            required
            type="datetime-local"
          />
        )}
      </form.AppField>
      <form.AppField name="maxGrade">
        {(field) => (
          <field.NumberField
            id="maxGrade"
            label="Maximum Grade"
            min={0}
            placeholder="100"
          />
        )}
      </form.AppField>
      <form.AppField name="status">
        {(field) => (
          <field.SelectField id="status" label="Status">
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </field.SelectField>
        )}
      </form.AppField>
    </>
  ),
})

const AssignmentFormFields = withForm({
  defaultValues: getAssignmentInitialValues(undefined, 'create'),
  render: ({ form }) => (
    <FieldGroup className="mt-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <AssignmentCoreFields form={form} />
        <form.AppField name="description">
          {(field) => (
            <field.TextAreaField
              id="description"
              label="Description"
              className="sm:col-span-2"
              rows={5}
            />
          )}
        </form.AppField>
      </div>
    </FieldGroup>
  ),
})

export function AssignmentDialog(props: AssignmentDialogProps) {
  const { open, onOpenChange, mode, assignment, submission } = props
  const { submissionCount = 0 } = props
  const { mutations, assignmentForm, gradeForm } = useAssignmentDialog(props)

  if (mode === 'delete') {
    return (
      <DeleteAssignmentFlow
        open={open}
        onOpenChange={onOpenChange}
        submissionCount={submissionCount}
        assignment={assignment}
        deleteMutation={mutations.deleteMutation}
      />
    )
  }

  if (mode === 'grade') {
    return (
      <GradeSubmissionDialog
        form={gradeForm}
        open={open}
        onOpenChange={onOpenChange}
        submission={submission}
        studentName={getSubmissionStudentName(submission)}
        maxGrade={resolveMaxGrade(assignment)}
        isSaving={mutations.gradeMutation.isPending}
      />
    )
  }

  const copy = getAssignmentFormCopy(mode)

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      mode={mode}
      title={copy.title}
      subtitle={copy.subtitle}
      maxWidth="3xl"
      onSubmit={() => void assignmentForm.handleSubmit()}
      isSubmitting={mutations.isAnyPending}
      submitLabel={copy.submitLabel}
    >
      <AssignmentFormFields form={assignmentForm} />
    </FormDialog>
  )
}
