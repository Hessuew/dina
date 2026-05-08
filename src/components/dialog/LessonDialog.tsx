import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { createLessonSchema, updateLessonSchema } from '@/schemas/lesson.schema'
import { DeleteConfirmDialog } from '@/components/ui/delete-confirm-dialog'
import { FormDialog } from '@/components/ui/form-dialog'
import { DialogBody } from '@/components/ui/dialog'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
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

  const { createMutation, updateMutation, deleteMutation } = useEntityMutation({
    createFn: createLesson,
    updateFn: updateLesson,
    deleteFn: deleteLesson,
    onSuccess: () => {
      onOpenChange(false)
    },
  })

  const isPending = createMutation.isPending || updateMutation.isPending

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
            <Field className="sm:col-span-2">
              <FieldLabel
                htmlFor="lesson-title"
                className="text-[0.68rem] font-medium tracking-[0.18em] text-[#9B7A41] uppercase"
              >
                Title <span className="text-[#C5A059]">*</span>
              </FieldLabel>
              <Input
                id="lesson-title"
                placeholder="Lesson title"
                value={formData.title}
                className={`rounded-none border-white/12 bg-white/6 text-[#F8F4EC] placeholder:text-[#8E816D] focus:border-[#C5A059]/50${fieldErrors.title ? 'border-red-500/60' : ''}`}
                onChange={(e) => {
                  setFormData({ ...formData, title: e.target.value })
                  if (fieldErrors.title)
                    setFieldErrors({ ...fieldErrors, title: '' })
                }}
              />
              {fieldErrors.title && (
                <p className="text-[0.68rem] text-red-400">
                  {fieldErrors.title}
                </p>
              )}
            </Field>
            <Field>
              <FieldLabel
                htmlFor="lesson-time"
                className="text-[0.68rem] font-medium tracking-[0.18em] text-[#9B7A41] uppercase"
              >
                Scheduled Time <span className="text-[#C5A059]">*</span>
              </FieldLabel>
              <Input
                id="lesson-time"
                type="datetime-local"
                value={formData.scheduledTime}
                className={`rounded-none border-white/12 bg-white/6 text-[#F8F4EC] focus:border-[#C5A059]/50${fieldErrors.scheduledTime ? 'border-red-500/60' : ''}`}
                onChange={(e) => {
                  setFormData({
                    ...formData,
                    scheduledTime: e.target.value,
                  })
                  if (fieldErrors.scheduledTime)
                    setFieldErrors({ ...fieldErrors, scheduledTime: '' })
                }}
              />
              {fieldErrors.scheduledTime && (
                <p className="text-[0.68rem] text-red-400">
                  {fieldErrors.scheduledTime}
                </p>
              )}
            </Field>
            <Field>
              <FieldLabel
                htmlFor="lesson-duration"
                className="text-[0.68rem] font-medium tracking-[0.18em] text-[#9B7A41] uppercase"
              >
                Duration (minutes)
              </FieldLabel>
              <Input
                id="lesson-duration"
                type="number"
                placeholder="60"
                value={formData.duration}
                className={`rounded-none border-white/12 bg-white/6 text-[#F8F4EC] placeholder:text-[#8E816D] focus:border-[#C5A059]/50${fieldErrors.duration ? 'border-red-500/60' : ''}`}
                onChange={(e) => {
                  setFormData({ ...formData, duration: e.target.value })
                  if (fieldErrors.duration)
                    setFieldErrors({ ...fieldErrors, duration: '' })
                }}
              />
              {fieldErrors.duration && (
                <p className="text-[0.68rem] text-red-400">
                  {fieldErrors.duration}
                </p>
              )}
            </Field>
            <Field className="sm:col-span-2">
              <FieldLabel
                htmlFor="lesson-content"
                className="text-[0.68rem] font-medium tracking-[0.18em] text-[#9B7A41] uppercase"
              >
                Content
              </FieldLabel>
              <Textarea
                id="lesson-content"
                placeholder="Lesson content or description"
                rows={8}
                value={formData.content}
                className="rounded-none border-white/12 bg-white/6 text-[#F8F4EC] placeholder:text-[#8E816D] focus:border-[#C5A059]/50"
                onChange={(e) =>
                  setFormData({ ...formData, content: e.target.value })
                }
              />
            </Field>
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
