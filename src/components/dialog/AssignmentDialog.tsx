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
import {
  FormFieldInput,
  FormFieldNumberInput,
  FormFieldSelect,
  FormFieldTextarea,
} from '@/components/ui/form-field'
import { useMutation } from '@/hooks/useMutation'
import { useEntityMutation } from '@/hooks/useEntityMutation'
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
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const emptyForm = {
    title: '',
    description: '',
    dueDate: '',
    maxGrade: 100,
    status: 'draft' as const,
  }

  const [formData, setFormData] = useState(
    mode === 'create'
      ? emptyForm
      : {
          title: assignment?.title ?? '',
          description: assignment?.description || '',
          dueDate: assignment
            ? new Date(assignment.dueDate).toISOString().slice(0, 16)
            : '',
          maxGrade: assignment?.maxGrade ?? 100,
          status: assignment?.status ?? ('draft' as const),
        },
  )

  const [gradingData, setGradingData] = useState({
    grade: submission?.grade ?? 0,
    feedback: submission?.feedback ?? '',
  })

  useEffect(() => {
    if (open) {
      setFieldErrors({})
      if (mode === 'create') {
        setFormData(emptyForm)
      } else if (mode === 'edit' && assignment) {
        setFormData({
          title: assignment.title,
          description: assignment.description || '',
          dueDate: new Date(assignment.dueDate).toISOString().slice(0, 16),
          maxGrade: assignment.maxGrade ?? 100,
          status: assignment.status,
        })
      }
      if (mode === 'grade' && submission) {
        setGradingData({
          grade: submission.grade ?? 0,
          feedback: submission.feedback ?? '',
        })
      }
    }
  }, [open, mode, assignment, submission])

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

  const isPending = isAnyPending

  const handleSubmit = () => {
    const parseResult =
      mode === 'create'
        ? createAssignmentSchema.safeParse({
            lessonId: lessonId ?? '',
            title: formData.title,
            description: formData.description || undefined,
            dueDate: formData.dueDate,
            maxGrade: formData.maxGrade || undefined,
          })
        : updateAssignmentSchema.safeParse({
            assignmentId: assignment?.id ?? '',
            title: formData.title,
            description: formData.description || undefined,
            dueDate: formData.dueDate,
            maxGrade: formData.maxGrade || undefined,
            status: formData.status,
          })

    if (!parseResult.success) {
      const errors: Record<string, string> = {}
      for (const issue of parseResult.error.issues) {
        const key = issue.path[0] as string
        if (!errors[key]) errors[key] = issue.message
      }
      setFieldErrors(errors)
      return
    }

    setFieldErrors({})

    if (mode === 'create') {
      if (!lessonId) return
      createMutation.mutate({
        data: {
          lessonId,
          title: formData.title,
          description: formData.description,
          dueDate: formData.dueDate,
          maxGrade: formData.maxGrade,
        },
      })
    } else {
      if (!assignment) return
      updateMutation.mutate({
        data: {
          assignmentId: assignment.id,
          title: formData.title,
          description: formData.description,
          dueDate: formData.dueDate,
          maxGrade: formData.maxGrade,
          status: formData.status,
        },
      })
    }
  }

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
                  <FormFieldNumberInput
                    id="grade"
                    label={`Grade (max: ${assignment?.maxGrade ?? 100})`}
                    min={0}
                    max={assignment?.maxGrade ?? 100}
                    value={gradingData.grade}
                    onChange={(value) => {
                      setGradingData({
                        ...gradingData,
                        grade: value,
                      })
                      if (fieldErrors.grade)
                        setFieldErrors({ ...fieldErrors, grade: '' })
                    }}
                    error={fieldErrors.grade}
                    placeholder="0"
                  />
                  <FormFieldTextarea
                    id="feedback"
                    label="Feedback"
                    value={gradingData.feedback}
                    onChange={(value) =>
                      setGradingData({
                        ...gradingData,
                        feedback: value,
                      })
                    }
                    placeholder="Provide feedback to the student..."
                    rows={4}
                  />
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
                onClick={() => {
                  if (!submission) return
                  const gradeParseResult = gradeSubmissionSchema.safeParse({
                    submissionId: submission.id,
                    assignmentId: assignment?.id ?? '',
                    grade: gradingData.grade,
                    feedback: gradingData.feedback,
                  })
                  if (!gradeParseResult.success) {
                    const errors: Record<string, string> = {}
                    for (const issue of gradeParseResult.error.issues) {
                      const key = issue.path[0] as string
                      if (!errors[key]) errors[key] = issue.message
                    }
                    setFieldErrors(errors)
                    return
                  }
                  setFieldErrors({})
                  gradeMutation.mutate({
                    data: {
                      submissionId: submission.id,
                      assignmentId: assignment?.id ?? '',
                      grade: gradingData.grade,
                      feedback: gradingData.feedback,
                    },
                  })
                }}
                disabled={isPending}
              >
                {isPending ? 'Saving...' : 'Save Grade'}
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
      onSubmit={handleSubmit}
      isSubmitting={isPending}
      submitLabel={mode === 'create' ? 'Create Assignment' : 'Save Changes'}
    >
      <DialogBody>
        <FieldGroup className="mt-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormFieldInput
              id="title"
              label="Title"
              required
              className="sm:col-span-2"
              value={formData.title}
              onChange={(value) => {
                setFormData({ ...formData, title: value })
                if (fieldErrors.title)
                  setFieldErrors({ ...fieldErrors, title: '' })
              }}
              error={fieldErrors.title}
            />
            <FormFieldInput
              id="dueDate"
              label="Due Date"
              required
              type="datetime-local"
              value={formData.dueDate}
              onChange={(value) => {
                setFormData({ ...formData, dueDate: value })
                if (fieldErrors.dueDate)
                  setFieldErrors({ ...fieldErrors, dueDate: '' })
              }}
              error={fieldErrors.dueDate}
            />
            <FormFieldNumberInput
              id="maxGrade"
              label="Maximum Grade"
              min={0}
              value={formData.maxGrade}
              onChange={(value) => {
                setFormData({
                  ...formData,
                  maxGrade: value,
                })
                if (fieldErrors.maxGrade)
                  setFieldErrors({ ...fieldErrors, maxGrade: '' })
              }}
              error={fieldErrors.maxGrade}
              placeholder="100"
            />
            <FormFieldSelect
              id="status"
              label="Status"
              value={formData.status}
              onChange={(value) =>
                setFormData({
                  ...formData,
                  status: value as typeof formData.status,
                })
              }
            >
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </FormFieldSelect>
            <FormFieldTextarea
              id="description"
              label="Description"
              className="sm:col-span-2"
              value={formData.description}
              onChange={(value) =>
                setFormData({ ...formData, description: value })
              }
              rows={5}
            />
          </div>
        </FieldGroup>
      </DialogBody>
    </FormDialog>
  )
}
