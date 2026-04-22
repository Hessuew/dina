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
import facultyBackground from '@/assets/images/bg/bg_lecturers.webp'

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
          className="rounded-none border border-white/10 text-[#F8F4EC] shadow-[0_42px_100px_-52px_rgba(0,0,0,0.82)]"
          style={{
            backgroundImage: `linear-gradient(180deg, rgba(10,10,11,0.9), rgba(16,16,17,0.95)), url(${facultyBackground})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
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
                Delete Lesson
              </DialogTitle>
              <DialogDescription className="text-[#AFA28F]">
                Are you sure you want to delete "
                {initialData?.title ?? 'this lesson'}"? This action cannot be
                undone.
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
        className="overflow-y-auto rounded-none border border-white/10 text-[#F8F4EC] shadow-[0_42px_100px_-52px_rgba(0,0,0,0.82)] sm:max-w-3xl"
        style={{
          backgroundImage: `linear-gradient(180deg, rgba(10,10,11,0.9), rgba(16,16,17,0.95)), url(${facultyBackground})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
        showCloseButton={false}
      >
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.04),transparent_38%,rgba(197,160,89,0.08)_100%)]" />

        <div className="relative">
          <DialogHeader>
            <div className="mb-1">
              <div className="h-px w-8 bg-[#C5A059]/40" />
              <div className="mt-2 text-[0.68rem] font-medium tracking-[0.3em] text-[#8E816D] uppercase">
                {mode === 'create' ? 'New lesson' : 'Edit lesson'}
              </div>
            </div>
            <DialogTitle className="font-serif text-xl tracking-[-0.02em] text-[#F8F4EC]">
              {mode === 'create' ? 'Create Lesson' : 'Edit Lesson'}
            </DialogTitle>
            <DialogDescription className="text-[#AFA28F]">
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
                  className="rounded-none border-white/12 bg-white/6 text-[#F8F4EC] placeholder:text-[#8E816D] focus:border-[#C5A059]/50"
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
                  className="rounded-none border-white/12 bg-white/6 text-[#F8F4EC] focus:border-[#C5A059]/50"
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
                  className="rounded-none border-white/12 bg-white/6 text-[#F8F4EC] placeholder:text-[#8E816D] focus:border-[#C5A059]/50"
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

          <DialogFooter className="mt-6 rounded-none border-t border-white/8 bg-white/3 pt-6">
            <Button
              variant="outline"
              theme="dark"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button theme="dark" onClick={handleSubmit} disabled={isPending}>
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
