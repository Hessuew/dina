import { useEffect, useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useMutation } from '@/hooks/useMutation'
import {
  createAssignment,
  deleteAssignment,
  gradeSubmission,
  updateAssignment,
} from '@/utils/assignments'
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

  const createMutation = useMutation({
    fn: createAssignment,
    onSuccess: async () => {
      toast.success('Assignment created successfully!')
      onOpenChange(false)
      await router.invalidate()
    },
  })

  const updateMutation = useMutation({
    fn: updateAssignment,
    onSuccess: async () => {
      toast.success('Assignment updated successfully!')
      onOpenChange(false)
      await router.invalidate()
    },
  })

  const deleteMutation = useMutation({
    fn: deleteAssignment,
    onSuccess: async () => {
      toast.success('Assignment deleted successfully!')
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

  const isPending =
    createMutation.status === 'pending' ||
    updateMutation.status === 'pending' ||
    deleteMutation.status === 'pending' ||
    gradeMutation.status === 'pending'

  const dialogStyle = {
    backgroundImage: `linear-gradient(180deg, rgba(10,10,11,0.9), rgba(16,16,17,0.95)), url(${facultyBackground})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  }

  if (mode === 'delete') {
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
                {submissionCount > 0 ? (
                  <>
                    This assignment has {submissionCount} submission
                    {submissionCount !== 1 ? 's' : ''}. Assignments with
                    submissions cannot be deleted.
                  </>
                ) : (
                  <>
                    Are you sure you want to delete "{assignment?.title}"? This
                    action cannot be undone.
                  </>
                )}
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
              {submissionCount === 0 && (
                <Button
                  variant="destructive"
                  className="rounded-none"
                  onClick={() =>
                    assignment &&
                    deleteMutation.mutate({
                      data: { assignmentId: assignment.id },
                    })
                  }
                  disabled={isPending}
                >
                  {isPending ? 'Deleting...' : 'Delete'}
                </Button>
              )}
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
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
          <div className="relative">
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
                <Field>
                  <FieldLabel
                    htmlFor="grade"
                    className="text-[0.68rem] font-medium tracking-[0.18em] text-[#9B7A41] uppercase"
                  >
                    Grade (max: {assignment?.maxGrade ?? 100})
                  </FieldLabel>
                  <Input
                    id="grade"
                    type="number"
                    min="0"
                    max={assignment?.maxGrade ?? 100}
                    value={gradingData.grade}
                    className="rounded-none border-white/12 bg-white/6 text-[#F8F4EC] focus:border-[#C5A059]/50"
                    onChange={(e) =>
                      setGradingData({
                        ...gradingData,
                        grade: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </Field>
                <Field>
                  <FieldLabel
                    htmlFor="feedback"
                    className="text-[0.68rem] font-medium tracking-[0.18em] text-[#9B7A41] uppercase"
                  >
                    Feedback
                  </FieldLabel>
                  <Textarea
                    id="feedback"
                    rows={4}
                    placeholder="Provide feedback to the student..."
                    value={gradingData.feedback}
                    className="rounded-none border-white/12 bg-white/6 text-[#F8F4EC] placeholder:text-[#8E816D] focus:border-[#C5A059]/50"
                    onChange={(e) =>
                      setGradingData({
                        ...gradingData,
                        feedback: e.target.value,
                      })
                    }
                  />
                </Field>
              </FieldGroup>
            </div>

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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="overflow-y-auto rounded-none border border-white/10 text-[#F8F4EC] shadow-[0_42px_100px_-52px_rgba(0,0,0,0.82)] sm:max-w-3xl"
        style={dialogStyle}
        showCloseButton={false}
      >
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.04),transparent_38%,rgba(197,160,89,0.08)_100%)]" />
        <div className="relative">
          <DialogHeader>
            <div className="mb-1">
              <div className="h-px w-8 bg-[#C5A059]/40" />
              <div className="mt-2 text-[0.68rem] font-medium tracking-[0.3em] text-[#8E816D] uppercase">
                {mode === 'create' ? 'New assignment' : 'Edit assignment'}
              </div>
            </div>
            <DialogTitle className="font-serif text-xl tracking-[-0.02em] text-[#F8F4EC]">
              {mode === 'create' ? 'Create Assignment' : 'Edit Assignment'}
            </DialogTitle>
            <DialogDescription className="text-[#AFA28F]">
              {mode === 'create'
                ? 'Add a new assignment for this lesson'
                : 'Update the assignment information'}
            </DialogDescription>
          </DialogHeader>

          <FieldGroup className="mt-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field className="sm:col-span-2">
                <FieldLabel
                  htmlFor="title"
                  className="text-[0.68rem] font-medium tracking-[0.18em] text-[#9B7A41] uppercase"
                >
                  Title <span className="text-[#C5A059]">*</span>
                </FieldLabel>
                <Input
                  id="title"
                  value={formData.title}
                  className="rounded-none border-white/12 bg-white/6 text-[#F8F4EC] focus:border-[#C5A059]/50"
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                />
              </Field>
              <Field>
                <FieldLabel
                  htmlFor="dueDate"
                  className="text-[0.68rem] font-medium tracking-[0.18em] text-[#9B7A41] uppercase"
                >
                  Due Date <span className="text-[#C5A059]">*</span>
                </FieldLabel>
                <Input
                  id="dueDate"
                  type="datetime-local"
                  value={formData.dueDate}
                  className="rounded-none border-white/12 bg-white/6 text-[#F8F4EC] focus:border-[#C5A059]/50"
                  onChange={(e) =>
                    setFormData({ ...formData, dueDate: e.target.value })
                  }
                />
              </Field>
              <Field>
                <FieldLabel
                  htmlFor="maxGrade"
                  className="text-[0.68rem] font-medium tracking-[0.18em] text-[#9B7A41] uppercase"
                >
                  Maximum Grade
                </FieldLabel>
                <Input
                  id="maxGrade"
                  type="number"
                  value={formData.maxGrade.toString()}
                  className="rounded-none border-white/12 bg-white/6 text-[#F8F4EC] focus:border-[#C5A059]/50"
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      maxGrade: parseInt(e.target.value) || 100,
                    })
                  }
                />
              </Field>
              <Field>
                <FieldLabel
                  htmlFor="status"
                  className="text-[0.68rem] font-medium tracking-[0.18em] text-[#9B7A41] uppercase"
                >
                  Status
                </FieldLabel>
                <Select
                  value={formData.status}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      status: value as 'draft' | 'published' | 'closed',
                    })
                  }
                >
                  <SelectTrigger className="rounded-none border-white/12 bg-white/6 text-[#F8F4EC]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-none border-white/12 bg-[#1C1A17]">
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field className="sm:col-span-2">
                <FieldLabel
                  htmlFor="description"
                  className="text-[0.68rem] font-medium tracking-[0.18em] text-[#9B7A41] uppercase"
                >
                  Description
                </FieldLabel>
                <Textarea
                  id="description"
                  rows={8}
                  value={formData.description}
                  className="rounded-none border-white/12 bg-white/6 text-[#F8F4EC] placeholder:text-[#8E816D] focus:border-[#C5A059]/50"
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                />
              </Field>
            </div>
          </FieldGroup>

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
                if (!formData.title || !formData.dueDate) {
                  toast.error('Title and due date are required')
                  return
                }
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
              }}
              disabled={isPending}
            >
              {isPending
                ? 'Saving...'
                : mode === 'create'
                  ? 'Create Assignment'
                  : 'Save Changes'}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
