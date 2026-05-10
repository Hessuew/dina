import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { createLessonSchema, updateLessonSchema } from '@/schemas/lesson.schema'
import { DeleteConfirmDialog } from '@/components/ui/delete-confirm-dialog'
import { FormDialog } from '@/components/ui/form-dialog'
import { DialogBody } from '@/components/ui/dialog'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Switch } from '@/components/ui/switch'
import {
  FormFieldInput,
  FormFieldNumberInput,
  FormFieldTextarea,
} from '@/components/ui/form-field'
import { useEntityMutation } from '@/hooks/useEntityMutation'
import { createLesson, deleteLesson, updateLesson } from '@/utils/courses'

type LessonFormData = {
  title: string
  content: string
  scheduledTime: string
  duration: string
  isPublished: boolean
}

const emptyFormData: LessonFormData = {
  title: '',
  content: '',
  scheduledTime: '',
  duration: '',
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

export function LessonDialog({
  open,
  onOpenChange,
  mode,
  courseId,
  lessonCount = 0,
  initialData,
}: LessonDialogProps) {
  const [formData, setFormData] = useState<LessonFormData>({ ...emptyFormData })
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (open) {
      setFieldErrors({})
      if (initialData && mode !== 'create') {
        setFormData({
          title: initialData.title,
          content: initialData.content || '',
          scheduledTime: initialData.scheduledTime
            ? new Date(initialData.scheduledTime).toISOString().slice(0, 16)
            : '',
          duration: initialData.duration?.toString() || '',
          isPublished: initialData.isPublished ?? false,
        })
      } else {
        setFormData({ ...emptyFormData })
      }
    }
  }, [open, initialData, mode])

  const { createMutation, updateMutation, deleteMutation, isAnyPending } =
    useEntityMutation({
      createFn: createLesson,
      updateFn: updateLesson,
      deleteFn: deleteLesson,
      onSuccess: () => {
        onOpenChange(false)
      },
    })

  const isPending = isAnyPending

  const handleSubmit = () => {
    const schema = mode === 'create' ? createLessonSchema : updateLessonSchema
    const parseData = {
      lessonId: initialData?.lessonId ?? '',
      courseId,
      title: formData.title,
      content: formData.content || undefined,
      scheduledTime: formData.scheduledTime
        ? new Date(formData.scheduledTime)
        : undefined,
      duration: formData.duration ? parseInt(formData.duration) : undefined,
      orderIndex: lessonCount,
      isPublished: formData.isPublished,
    }

    const parseResult = schema.safeParse(parseData)
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
      if (lessonCount >= 3) {
        toast.error('Maximum 3 lessons allowed per course')
        return
      }
      createMutation.mutate({
        data: {
          courseId,
          title: formData.title,
          content: formData.content || undefined,
          scheduledTime: new Date(formData.scheduledTime),
          duration: formData.duration ? parseInt(formData.duration) : undefined,
          orderIndex: lessonCount,
          isPublished: formData.isPublished,
        },
      })
    } else if (initialData) {
      updateMutation.mutate({
        data: {
          lessonId: initialData.lessonId,
          courseId,
          title: formData.title,
          content: formData.content || undefined,
          scheduledTime: new Date(formData.scheduledTime),
          duration: formData.duration ? parseInt(formData.duration) : undefined,
          isPublished: formData.isPublished,
        },
      })
    }
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
      onSubmit={handleSubmit}
      isSubmitting={isPending}
      submitLabel={mode === 'create' ? 'Create Lesson' : 'Save Changes'}
    >
      <DialogBody>
        <FieldGroup className="mt-6 gap-8">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormFieldInput
              id="lesson-title"
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
              placeholder="Lesson title"
            />
            <FormFieldInput
              id="lesson-time"
              label="Scheduled Time"
              required
              type="datetime-local"
              value={formData.scheduledTime}
              onChange={(value) => {
                setFormData({
                  ...formData,
                  scheduledTime: value,
                })
                if (fieldErrors.scheduledTime)
                  setFieldErrors({ ...fieldErrors, scheduledTime: '' })
              }}
              error={fieldErrors.scheduledTime}
            />
            <FormFieldNumberInput
              id="lesson-duration"
              label="Duration (minutes)"
              placeholder="60"
              value={formData.duration === '' ? 0 : Number(formData.duration)}
              onChange={(value) => {
                setFormData({ ...formData, duration: String(value) })
                if (fieldErrors.duration)
                  setFieldErrors({ ...fieldErrors, duration: '' })
              }}
              error={fieldErrors.duration}
            />
            <FormFieldTextarea
              id="lesson-content"
              label="Content"
              className="sm:col-span-2"
              value={formData.content}
              onChange={(value) => setFormData({ ...formData, content: value })}
              placeholder="Lesson content or description"
              rows={8}
            />
            <Field>
              <div className="flex items-center gap-3">
                <Switch
                  id="lesson-published"
                  checked={formData.isPublished}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, isPublished: checked })
                  }
                />
                <FieldLabel
                  htmlFor="lesson-published"
                  className="text-sm text-[#AFA28F]"
                >
                  Publish lesson
                </FieldLabel>
              </div>
            </Field>
          </div>
        </FieldGroup>
      </DialogBody>
    </FormDialog>
  )
}
