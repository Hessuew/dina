import { useRouter } from '@tanstack/react-router'
import { Trash2Icon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import type { ZoomLinkRow, ZoomLinkSection } from '@/utils/zoomLink/zoomLinks'
import facultyBackground from '@/assets/images/bg/bg_lecturers.webp'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogBody,
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
  createZoomLink,
  deleteZoomLink,
  updateZoomLink,
} from '@/utils/zoomLink/zoomLinks'

type ZoomCourse = { id: string; title: string }

type ZoomFormState = {
  title: string
  description: string
  section: ZoomLinkSection
  courseId: string
  zoomUrl: string
  meetingId: string
  passcode: string
  orderIndex: string
}

export type ZoomLinkDialogState =
  | { mode: 'create' }
  | { mode: 'edit'; link: ZoomLinkRow }
  | null

type ZoomLinkDialogProps = {
  courses: Array<ZoomCourse>
  dialogState: ZoomLinkDialogState
  onOpenChange: (open: boolean) => void
}

const emptyForm: ZoomFormState = {
  title: '',
  description: '',
  section: 'general_class_lecture',
  courseId: 'none',
  zoomUrl: '',
  meetingId: '',
  passcode: '',
  orderIndex: '0',
}

const sectionTitle: Record<ZoomLinkSection, string> = {
  general_class_lecture: 'General Class Lectures',
  discipleship_group: 'Discipleship Groups',
}

function linkToForm(link: ZoomLinkRow): ZoomFormState {
  return {
    title: link.title,
    description: link.description ?? '',
    section: link.section,
    courseId: link.courseId ?? 'none',
    zoomUrl: link.zoomUrl,
    meetingId: link.meetingId,
    passcode: link.passcode,
    orderIndex: String(link.orderIndex),
  }
}

function buildPayload(form: ZoomFormState) {
  return {
    title: form.title,
    description: form.description || undefined,
    section: form.section,
    courseId: form.courseId === 'none' ? undefined : form.courseId,
    zoomUrl: form.zoomUrl,
    meetingId: form.meetingId,
    passcode: form.passcode,
    orderIndex: Number(form.orderIndex || 0),
  }
}

export function ZoomLinkDialog({
  courses,
  dialogState,
  onOpenChange,
}: ZoomLinkDialogProps) {
  const router = useRouter()
  const [form, setForm] = useState<ZoomFormState>(emptyForm)
  const link = dialogState?.mode === 'edit' ? dialogState.link : null
  const open = dialogState !== null

  useEffect(() => {
    if (!open) return
    setForm(link ? linkToForm(link) : emptyForm)
  }, [link, open])

  const createMutation = useMutation({
    fn: createZoomLink,
    onSuccess: async () => {
      toast.success('Zoom link created')
      onOpenChange(false)
      await router.invalidate()
    },
  })
  const updateMutation = useMutation({
    fn: updateZoomLink,
    onSuccess: async () => {
      toast.success('Zoom link updated')
      onOpenChange(false)
      await router.invalidate()
    },
  })
  const deleteMutation = useMutation({
    fn: deleteZoomLink,
    onSuccess: async () => {
      toast.success('Zoom link deleted')
      onOpenChange(false)
      await router.invalidate()
    },
  })

  const isPending =
    createMutation.status === 'pending' ||
    updateMutation.status === 'pending' ||
    deleteMutation.status === 'pending'

  const handleSubmit = () => {
    if (!form.title || !form.zoomUrl || !form.meetingId || !form.passcode) {
      toast.error('Title, Zoom link, meeting ID, and passcode are required')
      return
    }

    if (link) {
      updateMutation.mutate({
        data: { zoomLinkId: link.id, ...buildPayload(form) },
      })
      return
    }

    createMutation.mutate({ data: buildPayload(form) })
  }

  const handleDelete = () => {
    if (!link) return
    deleteMutation.mutate({ data: { zoomLinkId: link.id } })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="rounded-none border border-white/10 text-[#F8F4EC] shadow-[0_42px_100px_-52px_rgba(0,0,0,0.82)] sm:max-w-2xl"
        style={{
          backgroundImage: `linear-gradient(180deg, rgba(10,10,11,0.92), rgba(16,16,17,0.96)), url(${facultyBackground})`,
          backgroundPosition: 'center',
          backgroundSize: 'cover',
        }}
        showCloseButton={false}
      >
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.04),transparent_38%,rgba(197,160,89,0.08)_100%)]" />
        <div className="relative flex min-h-0 flex-1 flex-col">
          <DialogHeader>
            <div>
              <div className="h-px w-8 bg-[#C5A059]/40" />
              <p className="mt-2 text-[0.68rem] font-medium tracking-[0.3em] text-[#8E816D] uppercase">
                {link ? 'Edit meeting details' : 'New meeting details'}
              </p>
            </div>
            <DialogTitle className="font-serif text-xl tracking-[-0.02em] text-[#F8F4EC]">
              {link ? 'Edit Zoom Link' : 'Add Zoom Link'}
            </DialogTitle>
            <DialogDescription className="text-[#AFA28F]">
              Add the Zoom URL, meeting ID, and passcode shown to students and
              teachers.
            </DialogDescription>
          </DialogHeader>

          <DialogBody>
            <FieldGroup className="mt-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel className="text-[#9B7A41]" htmlFor="zoom-section">
                    Section
                  </FieldLabel>
                  <Select
                    value={form.section}
                    onValueChange={(value) =>
                      setForm({ ...form, section: value as ZoomLinkSection })
                    }
                  >
                    <SelectTrigger className="w-full rounded-none border-white/12 bg-white/6 text-[#F8F4EC]">
                      <SelectValue>{sectionTitle[form.section]}</SelectValue>
                    </SelectTrigger>
                    <SelectContent className="rounded-none border-white/12">
                      <SelectItem value="general_class_lecture">
                        General Class Lectures
                      </SelectItem>
                      <SelectItem value="discipleship_group">
                        Discipleship Groups
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel className="text-[#9B7A41]" htmlFor="zoom-course">
                    Course
                  </FieldLabel>
                  <Select
                    value={form.courseId}
                    onValueChange={(value) =>
                      setForm({ ...form, courseId: value ?? 'none' })
                    }
                  >
                    <SelectTrigger className="w-full rounded-none border-white/12 bg-white/6 text-[#F8F4EC]">
                      <SelectValue>
                        {courseLabel(courses, form.courseId)}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="rounded-none border-white/12">
                      <SelectItem value="none">No course</SelectItem>
                      {courses.map((course) => (
                        <SelectItem key={course.id} value={course.id}>
                          {course.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <ZoomInput
                  form={form}
                  id="zoom-title"
                  label="Title"
                  placeholder="Ground course discipleship group"
                  setForm={setForm}
                  valueKey="title"
                  wide
                />
                <ZoomInput
                  form={form}
                  id="zoom-url"
                  label="Zoom Link"
                  placeholder="https://zoom.us/j/..."
                  setForm={setForm}
                  valueKey="zoomUrl"
                  wide
                />
                <ZoomInput
                  form={form}
                  id="zoom-meeting-id"
                  label="Meeting ID"
                  placeholder="123 456 7890"
                  setForm={setForm}
                  valueKey="meetingId"
                />
                <ZoomInput
                  form={form}
                  id="zoom-passcode"
                  label="Passcode"
                  placeholder="Passcode"
                  setForm={setForm}
                  valueKey="passcode"
                />
                <ZoomInput
                  form={form}
                  id="zoom-order"
                  inputType="number"
                  label="Order"
                  setForm={setForm}
                  valueKey="orderIndex"
                />
                <Field className="sm:col-span-2">
                  <FieldLabel
                    className="text-[#9B7A41]"
                    htmlFor="zoom-description"
                  >
                    Description
                  </FieldLabel>
                  <Textarea
                    id="zoom-description"
                    value={form.description}
                    rows={4}
                    className="rounded-none border-white/12 bg-white/6 text-[#F8F4EC] placeholder:text-[#8E816D] focus:border-[#C5A059]/50"
                    placeholder="Optional meeting note"
                    onChange={(event) =>
                      setForm({ ...form, description: event.target.value })
                    }
                  />
                </Field>
              </div>
            </FieldGroup>
          </DialogBody>

          <DialogFooter className="mt-6 rounded-none border-t border-white/8 bg-white/3 pt-6">
            {link && (
              <Button
                variant="destructive"
                className="mr-auto rounded-none"
                disabled={isPending}
                onClick={handleDelete}
              >
                <Trash2Icon className="size-4" />
                Delete
              </Button>
            )}
            <Button
              variant="outline"
              theme="dark"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button theme="dark" disabled={isPending} onClick={handleSubmit}>
              {isPending ? 'Saving...' : 'Save Link'}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function courseLabel(courses: Array<ZoomCourse>, courseId: string): string {
  if (courseId === 'none') return 'No course'
  return courses.find((course) => course.id === courseId)?.title ?? 'No course'
}

function ZoomInput({
  form,
  id,
  inputType = 'text',
  label,
  placeholder,
  setForm,
  valueKey,
  wide = false,
}: {
  form: ZoomFormState
  id: string
  inputType?: string
  label: string
  placeholder?: string
  setForm: React.Dispatch<React.SetStateAction<ZoomFormState>>
  valueKey: keyof Pick<
    ZoomFormState,
    'meetingId' | 'orderIndex' | 'passcode' | 'title' | 'zoomUrl'
  >
  wide?: boolean
}) {
  return (
    <Field className={wide ? 'sm:col-span-2' : undefined}>
      <FieldLabel className="text-[#9B7A41]" htmlFor={id}>
        {label}
      </FieldLabel>
      <Input
        id={id}
        type={inputType}
        min={inputType === 'number' ? '0' : undefined}
        value={form[valueKey]}
        className="rounded-none border-white/12 bg-white/6 text-[#F8F4EC] placeholder:text-[#8E816D] focus:border-[#C5A059]/50"
        placeholder={placeholder}
        onChange={(event) =>
          setForm({ ...form, [valueKey]: event.target.value })
        }
      />
    </Field>
  )
}
