import { useEffect } from 'react'
import { toast } from 'sonner'
import {
  MAX_LESSONS_PER_COURSE,
  buildLessonCreateInput,
  buildLessonDialogConfig,
  buildLessonUpdateInput,
  getLessonInitialValues,
} from './lesson-dialog.domain'
import type { DeleteLessonInput } from '@/schemas/lesson.schema'
import type { MutationReturn } from '@/hooks/useEntityMutation/domain/entity-mutation.domain'
import type { LessonInitialData } from './lesson-dialog.domain'
import { createLessonSchema } from '@/schemas/lesson.schema'
import { DeleteConfirmDialog } from '@/components/ui/delete-confirm-dialog'
import { FieldGroup } from '@/components/ui/field'
import { FormDialog } from '@/components/ui/form-dialog/FormDialog'
import { useAppForm, withForm } from '@/hooks/form'
import { useEntityMutation } from '@/hooks/useEntityMutation'
import { createLesson, deleteLesson, updateLesson } from '@/utils/courses'

type LessonDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'create' | 'edit' | 'delete'
  courseId: string
  lessonCount?: number
  initialData?: LessonInitialData
}

type LessonDeleteDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  courseId: string
  initialData?: LessonInitialData
  deleteMutation: MutationReturn<{ data: DeleteLessonInput }>
}

function LessonDeleteDialog({
  open,
  onOpenChange,
  courseId,
  initialData,
  deleteMutation,
}: LessonDeleteDialogProps) {
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

const LessonFormFields = withForm({
  defaultValues: getLessonInitialValues(undefined, 'create'),
  render: ({ form }) => (
    <FieldGroup className="mt-6 gap-8">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <form.AppField
          name="title"
          validators={{ onSubmit: createLessonSchema.shape.title }}
        >
          {(field) => (
            <field.TextField
              id="lesson-title"
              label="Title"
              required
              className="sm:col-span-2"
              placeholder="Lesson title"
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
            />
          )}
        </form.AppField>
        <form.AppField name="duration">
          {(field) => (
            <field.NumberField
              id="lesson-duration"
              label="Duration (minutes)"
              placeholder="60"
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
            <field.SwitchField id="lesson-published" label="Publish lesson" />
          )}
        </form.AppField>
      </div>
    </FieldGroup>
  ),
})

type UseLessonDialogFormArgs = {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'create' | 'edit' | 'delete'
  courseId: string
  lessonCount: number
  initialData?: LessonInitialData
}

function useLessonDialogForm({
  open,
  onOpenChange,
  mode,
  courseId,
  lessonCount,
  initialData,
}: UseLessonDialogFormArgs) {
  const { createMutation, updateMutation, deleteMutation, isAnyPending } =
    useEntityMutation({
      createFn: createLesson,
      updateFn: updateLesson,
      deleteFn: deleteLesson,
      onSuccess: () => onOpenChange(false),
    })

  const form = useAppForm({
    defaultValues: getLessonInitialValues(initialData, mode),
    onSubmit: ({ value }) => {
      if (mode === 'create') {
        if (lessonCount >= MAX_LESSONS_PER_COURSE) {
          toast.error('Maximum 3 lessons allowed per course')
          return
        }
        createMutation.mutate({
          data: buildLessonCreateInput(value, courseId, lessonCount),
        })
        return
      }

      if (!initialData) return
      updateMutation.mutate({
        data: buildLessonUpdateInput(value, initialData.lessonId, courseId),
      })
    },
  })

  useEffect(() => {
    if (!open) return
    form.reset(getLessonInitialValues(initialData, mode))
  }, [open, initialData, mode, form])

  return { form, deleteMutation, isAnyPending }
}

export function LessonDialog({
  open,
  onOpenChange,
  mode,
  courseId,
  lessonCount = 0,
  initialData,
}: LessonDialogProps) {
  const { form, deleteMutation, isAnyPending } = useLessonDialogForm({
    open,
    onOpenChange,
    mode,
    courseId,
    lessonCount,
    initialData,
  })

  if (mode === 'delete') {
    return (
      <LessonDeleteDialog
        open={open}
        onOpenChange={onOpenChange}
        courseId={courseId}
        initialData={initialData}
        deleteMutation={deleteMutation}
      />
    )
  }

  const config = buildLessonDialogConfig(mode)
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      mode={mode}
      title={config.title}
      subtitle={config.subtitle}
      maxWidth="3xl"
      onSubmit={() => void form.handleSubmit()}
      isSubmitting={isAnyPending}
      submitLabel={config.submitLabel}
    >
      <LessonFormFields form={form} />
    </FormDialog>
  )
}
