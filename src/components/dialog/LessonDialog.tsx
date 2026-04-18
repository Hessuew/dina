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
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { useMutation } from '@/hooks/useMutation'
import { createLesson, deleteLesson, updateLesson } from '@/utils/courses'
import marbleTexture from '@/assets/images/bg/bg_hero.webp'

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
    isPublished: boolean
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
  const router = useRouter()
  const [formData, setFormData] = useState<LessonFormData>({ ...emptyFormData })

  useEffect(() => {
    if (open) {
      if (initialData && mode !== 'create') {
        setFormData({
          title: initialData.title,
          content: initialData.content || '',
          scheduledTime: initialData.scheduledTime
            ? new Date(initialData.scheduledTime).toISOString().slice(0, 16)
            : '',
          duration: initialData.duration?.toString() || '',
          isPublished: initialData.isPublished,
        })
      } else {
        setFormData({ ...emptyFormData })
      }
    }
  }, [open, initialData, mode])

  const createMutation = useMutation({
    fn: createLesson,
    onSuccess: async () => {
      toast.success('Lesson created successfully!')
      onOpenChange(false)
      await router.invalidate()
    },
  })

  const updateMutation = useMutation({
    fn: updateLesson,
    onSuccess: async () => {
      toast.success('Lesson updated successfully!')
      onOpenChange(false)
      await router.invalidate()
    },
  })

  const deleteMutation = useMutation({
    fn: deleteLesson,
    onSuccess: async () => {
      toast.success('Lesson deleted successfully!')
      onOpenChange(false)
      await router.invalidate()
    },
  })

  const isPending =
    createMutation.status === 'pending' ||
    updateMutation.status === 'pending' ||
    deleteMutation.status === 'pending'

  const handleSubmit = () => {
    if (mode === 'delete') {
      if (!initialData) return
      deleteMutation.mutate({
        data: { lessonId: initialData.lessonId, courseId },
      })
      return
    }

    if (!formData.title || !formData.scheduledTime) {
      toast.error('Title and scheduled time are required')
      return
    }

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
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="rounded-none border border-[#C5A059]/20 text-[#1C1815] shadow-[0_28px_60px_-32px_rgba(0,0,0,0.22)]"
          style={{
            backgroundImage: `linear-gradient(180deg, rgba(247,244,238,0.97), rgba(247,244,238,0.99)), url(${marbleTexture})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
          showCloseButton={false}
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(197,160,89,0.08),transparent_40%)]" />
          <div className="relative">
            <DialogHeader>
              <div className="mb-1">
                <div className="h-px w-8 bg-[#C5A059]/40" />
                <div className="mt-2 text-[0.68rem] font-medium tracking-[0.3em] text-[#8E816D] uppercase">
                  Confirm action
                </div>
              </div>
              <DialogTitle className="font-serif text-xl tracking-[-0.02em] text-[#1C1815]">
                Delete Lesson
              </DialogTitle>
              <DialogDescription className="text-[#4E463D]">
                Are you sure you want to delete "
                {initialData?.title ?? 'this lesson'}"? This action cannot be
                undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="mt-6">
              <Button
                variant="outline"
                className="rounded-none border-[#1A1A1A]/12 bg-transparent text-[#6B5F4D] hover:border-[#1A1A1A]/20 hover:bg-white/50 hover:text-[#1C1815]"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                className="rounded-none"
                onClick={handleSubmit}
                disabled={isPending}
              >
                {isPending ? 'Deleting...' : 'Delete'}
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
        className="overflow-y-auto rounded-none border border-[#C5A059]/20 text-[#1C1815] shadow-[0_28px_60px_-32px_rgba(0,0,0,0.22)] sm:max-w-3xl"
        style={{
          backgroundImage: `linear-gradient(180deg, rgba(247,244,238,0.97), rgba(247,244,238,0.99)), url(${marbleTexture})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
        showCloseButton={false}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(197,160,89,0.08),transparent_40%)]" />

        <div className="relative">
          <DialogHeader>
            <div className="mb-1">
              <div className="h-px w-8 bg-[#C5A059]/40" />
              <div className="mt-2 text-[0.68rem] font-medium tracking-[0.3em] text-[#8E816D] uppercase">
                {mode === 'create' ? 'New lesson' : 'Edit lesson'}
              </div>
            </div>
            <DialogTitle className="font-serif text-xl tracking-[-0.02em] text-[#1C1815]">
              {mode === 'create' ? 'Create Lesson' : 'Edit Lesson'}
            </DialogTitle>
            <DialogDescription className="text-[#4E463D]">
              {mode === 'create'
                ? 'Add a new lesson to this course'
                : 'Update the lesson information'}
            </DialogDescription>
          </DialogHeader>

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
                  className="rounded-none border-[#1A1A1A]/15 bg-white/70 text-[#1C1815] placeholder:text-[#9B8C7C] focus:border-[#C5A059]/50"
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                />
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
                  className="rounded-none border-[#1A1A1A]/15 bg-white/70 text-[#1C1815] focus:border-[#C5A059]/50"
                  onChange={(e) =>
                    setFormData({ ...formData, scheduledTime: e.target.value })
                  }
                />
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
                  className="rounded-none border-[#1A1A1A]/15 bg-white/70 text-[#1C1815] placeholder:text-[#9B8C7C] focus:border-[#C5A059]/50"
                  onChange={(e) =>
                    setFormData({ ...formData, duration: e.target.value })
                  }
                />
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
                  className="rounded-none border-[#1A1A1A]/15 bg-white/70 text-[#1C1815] placeholder:text-[#9B8C7C] focus:border-[#C5A059]/50"
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
                    className="text-sm text-[#4E463D]"
                  >
                    Publish lesson
                  </FieldLabel>
                </div>
              </Field>
            </div>
          </FieldGroup>

          <DialogFooter className="mt-6 rounded-none border-[#C5A059]/15 bg-[#F0EBE1]/60">
            <Button
              variant="outline"
              className="rounded-none border-[#1A1A1A]/12 bg-transparent text-[#6B5F4D] hover:border-[#1A1A1A]/20 hover:bg-white/50 hover:text-[#1C1815]"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button theme="light" onClick={handleSubmit} disabled={isPending}>
              {isPending
                ? mode === 'create'
                  ? 'Creating...'
                  : 'Saving...'
                : mode === 'create'
                  ? 'Create Lesson'
                  : 'Save Changes'}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
