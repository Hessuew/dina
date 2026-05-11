import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { createLessonSchema, updateLessonSchema } from '@/schemas/lesson.schema'
import { DeleteConfirmDialog } from '@/components/ui/delete-confirm-dialog'
import { DialogBody } from '@/components/ui/dialog'
import { FieldGroup } from '@/components/ui/field'
import { FormDialog } from '@/components/ui/form-dialog'
import { useAppForm } from '@/hooks/form'
import { useEntityMutation } from '@/hooks/useEntityMutation'
import { createLesson, deleteLesson, updateLesson } from '@/utils/courses'

type LessonFormData = {
  title: string
  content: string
  scheduledTime: string
  duration: number
  isPublished: boolean
}

type LessonFieldErrors = Partial<Record<keyof LessonFormData, string>>

const emptyFormData: LessonFormData = {
  title: '',
  content: '',
  scheduledTime: '',
  duration: 0,
  isPublished: false,
}

type LessonDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'create' | 'edit' | 'delete'
  courseId: string
  lessonCount?: number
  initialData?: {
    lessonId: string
    title: string
    content: string | null
    scheduledTime: Date | null
    duration: number | null
    isPublished: boolean | null
    orderIndex: number
  }
}

function getInitialValues(
  initialData: LessonDialogProps['initialData'],
  mode: LessonDialogProps['mode'],
): LessonFormData {
  if (!initialData || mode === 'create') return { ...emptyFormData }

  return {
    title: initialData.title,
    content: initialData.content ?? '',
    scheduledTime: initialData.scheduledTime
      ? new Date(initialData.scheduledTime).toISOString().slice(0, 16)
      : '',
    duration: initialData.duration ?? 0,
    isPublished: initialData.isPublished ?? false,
  }
}

function extractFieldErrors(
  issues: Array<{ path: Array<PropertyKey>; message: string }>,
): LessonFieldErrors {
  const errors: LessonFieldErrors = {}

  for (const issue of issues) {
    const key = issue.path[0]
    if (typeof key !== 'string' || !(key in emptyFormData)) continue

    const field = key as keyof LessonFormData
    if (!errors[field]) errors[field] = issue.message
  }

  return errors
}

export function LessonDialog({
  open,
  onOpenChange,
  mode,
  courseId,
  lessonCount = 0,
  initialData,
}: LessonDialogProps) {
  const [submitErrors, setSubmitErrors] = useState<LessonFieldErrors>({})

  const { createMutation, updateMutation, deleteMutation, isAnyPending } =
    useEntityMutation({
      createFn: createLesson,
      updateFn: updateLesson,
      deleteFn: deleteLesson,
      onSuccess: () => onOpenChange(false),
    })

  const form = useAppForm({
    defaultValues: getInitialValues(initialData, mode),
    onSubmit: ({ value }) => {
      const shared = {
        title: value.title,
        content: value.content || undefined,
        scheduledTime: value.scheduledTime
          ? new Date(value.scheduledTime)
          : undefined,
        duration: value.duration > 0 ? value.duration : undefined,
        isPublished: value.isPublished,
      }

      if (mode === 'create') {
        const result = createLessonSchema.safeParse({
          ...shared,
          courseId,
          orderIndex: lessonCount,
        })

        if (!result.success) {
          setSubmitErrors(extractFieldErrors(result.error.issues))
          return
        }

        if (lessonCount >= 3) {
          toast.error('Maximum 3 lessons allowed per course')
          return
        }

        setSubmitErrors({})
        createMutation.mutate({ data: result.data })
        return
      }

      if (!initialData) return

      const result = updateLessonSchema.safeParse({
        ...shared,
        lessonId: initialData.lessonId,
        courseId,
      })

      if (!result.success) {
        setSubmitErrors(extractFieldErrors(result.error.issues))
        return
      }

      setSubmitErrors({})
      updateMutation.mutate({ data: result.data })
    },
  })

  useEffect(() => {
    if (!open) return
    setSubmitErrors({})
    form.reset(getInitialValues(initialData, mode))
  }, [open, initialData, mode, form])

  const clearError = (field: keyof LessonFormData) => {
    if (!submitErrors[field]) return
    setSubmitErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  if (mode === 'delete') {
    return (
      <DeleteConfirmDialog
        open={open}
        onOpenChange={onOpenChange}
        entityName="Lesson"
        onConfirm={() => {
          if (!initialData) return
          deleteMutation.mutate({
            data: { lessonId: initialData.lessonId, courseId },
          })
        }}
        isDeleting={deleteMutation.isPending}
      />
    )
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      mode={mode}
      title={mode === 'create' ? 'Create Lesson' : 'Edit Lesson'}
      subtitle={
        mode === 'create'
          ? 'Add a new lesson to this course'
          : 'Update the lesson information'
      }
      maxWidth="3xl"
      onSubmit={() => void form.handleSubmit()}
      isSubmitting={isAnyPending}
      submitLabel={mode === 'create' ? 'Create Lesson' : 'Save Changes'}
    >
      <DialogBody>
        <FieldGroup className="mt-6 gap-8">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <form.AppField name="title">
              {(field) => (
                <field.TextField
                  id="lesson-title"
                  label="Title"
                  required
                  className="sm:col-span-2"
                  placeholder="Lesson title"
                  error={submitErrors.title}
                  onValueChange={() => clearError('title')}
                />
              )}
            </form.AppField>
            <form.AppField name="scheduledTime">
              {(field) => (
                <field.TextField
                  id="lesson-time"
                  label="Scheduled Time"
                  required
                  type="datetime-local"
                  error={submitErrors.scheduledTime}
                  onValueChange={() => clearError('scheduledTime')}
                />
              )}
            </form.AppField>
            <form.AppField name="duration">
              {(field) => (
                <field.NumberField
                  id="lesson-duration"
                  label="Duration (minutes)"
                  placeholder="60"
                  error={submitErrors.duration}
                  onValueChange={() => clearError('duration')}
                />
              )}
            </form.AppField>
            <form.AppField name="content">
              {(field) => (
                <field.TextAreaField
                  id="lesson-content"
                  label="Content"
                  className="sm:col-span-2"
                  placeholder="Lesson content or description"
                  rows={8}
                />
              )}
            </form.AppField>
            <form.AppField name="isPublished">
              {(field) => (
                <field.SwitchField
                  id="lesson-published"
                  label="Publish lesson"
                />
              )}
            </form.AppField>
          </div>
        </FieldGroup>
      </DialogBody>
    </FormDialog>
  )
}
