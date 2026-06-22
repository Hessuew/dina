import { Trash2Icon } from 'lucide-react'
import { useEffect } from 'react'
import {
  buildZoomLinkPayload,
  emptyZoomForm,
  getZoomLinkDialogConfig,
  getZoomLinkInitialValues,
  resolveZoomLink,
} from './zoom-link-dialog.domain'
import type { ZoomLinkDialogState } from './zoom-link-dialog.domain'
import type { ZoomLinkRow, ZoomLinkSection } from '@/utils/zoomLink'
import { createZoomLinkSchema } from '@/schemas/zoomLink.schema'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useEntityMutation } from '@/hooks/useEntityMutation'
import { useAppForm, withForm } from '@/hooks/form'
import {
  createZoomLink,
  deleteZoomLink,
  updateZoomLink,
} from '@/utils/zoomLink'

export type { ZoomLinkDialogState } from './zoom-link-dialog.domain'

type ZoomCourse = { id: string; title: string }

type ZoomLinkDialogProps = {
  courses: Array<ZoomCourse>
  dialogState: ZoomLinkDialogState
  onOpenChange: (open: boolean) => void
}

const sectionTitle: Record<ZoomLinkSection, string> = {
  general_class_lecture: 'General Class Lectures',
  discipleship_group: 'Discipleship Groups',
}

const ZoomSectionField = withForm({
  defaultValues: emptyZoomForm,
  render: ({ form }) => (
    <form.AppField name="section">
      {(field) => (
        <Field>
          <FieldLabel className="text-[#9B7A41]" htmlFor="zoom-section">
            Section
          </FieldLabel>
          <Select
            value={field.state.value}
            onValueChange={(value) =>
              field.handleChange(value ?? field.state.value)
            }
          >
            <SelectTrigger className="w-full rounded-none border-white/12 bg-white/6 text-[#F8F4EC]">
              <SelectValue>
                {sectionTitle[field.state.value as ZoomLinkSection]}
              </SelectValue>
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
      )}
    </form.AppField>
  ),
})

const ZoomCourseField = withForm({
  defaultValues: emptyZoomForm,
  props: {} as { courses: Array<ZoomCourse> },
  render: ({ form, courses }) => (
    <form.AppField name="courseId">
      {(field) => (
        <Field>
          <FieldLabel className="text-[#9B7A41]" htmlFor="zoom-course">
            Course
          </FieldLabel>
          <Select
            value={field.state.value}
            onValueChange={(value) => field.handleChange(value ?? 'none')}
          >
            <SelectTrigger className="w-full rounded-none border-white/12 bg-white/6 text-[#F8F4EC]">
              <SelectValue>
                {courseLabel(courses, field.state.value)}
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
      )}
    </form.AppField>
  ),
})

const ZoomMeetingFields = withForm({
  defaultValues: emptyZoomForm,
  render: ({ form }) => (
    <>
      <form.AppField
        name="title"
        validators={{ onSubmit: createZoomLinkSchema.shape.title }}
      >
        {(field) => (
          <field.TextField
            id="zoom-title"
            label="Title"
            placeholder="Ground course discipleship group"
            required
            className="sm:col-span-2"
          />
        )}
      </form.AppField>
      <form.AppField
        name="zoomUrl"
        validators={{ onSubmit: createZoomLinkSchema.shape.zoomUrl }}
      >
        {(field) => (
          <field.TextField
            id="zoom-url"
            label="Zoom Link"
            placeholder="https://zoom.us/j/..."
            required
            className="sm:col-span-2"
          />
        )}
      </form.AppField>
    </>
  ),
})

const ZoomAccessFields = withForm({
  defaultValues: emptyZoomForm,
  render: ({ form }) => (
    <>
      <form.AppField
        name="meetingId"
        validators={{ onSubmit: createZoomLinkSchema.shape.meetingId }}
      >
        {(field) => (
          <field.TextField
            id="zoom-meeting-id"
            label="Meeting ID"
            placeholder="123 456 7890"
            required
          />
        )}
      </form.AppField>
      <form.AppField
        name="passcode"
        validators={{ onSubmit: createZoomLinkSchema.shape.passcode }}
      >
        {(field) => (
          <field.TextField
            id="zoom-passcode"
            label="Passcode"
            placeholder="Passcode"
            required
          />
        )}
      </form.AppField>
    </>
  ),
})

const ZoomNoteFields = withForm({
  defaultValues: emptyZoomForm,
  render: ({ form }) => (
    <>
      <form.AppField name="orderIndex">
        {(field) => (
          <field.NumberField id="zoom-order" label="Order" min={0} />
        )}
      </form.AppField>
      <form.AppField name="description">
        {(field) => (
          <field.TextAreaField
            id="zoom-description"
            label="Description"
            placeholder="Optional meeting note"
            rows={4}
            className="sm:col-span-2"
          />
        )}
      </form.AppField>
    </>
  ),
})

const ZoomLinkFields = withForm({
  defaultValues: emptyZoomForm,
  props: {} as { courses: Array<ZoomCourse> },
  render: ({ form, courses }) => (
    <FieldGroup className="mt-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <ZoomSectionField form={form} />
        <ZoomCourseField form={form} courses={courses} />
        <ZoomMeetingFields form={form} />
        <ZoomAccessFields form={form} />
        <ZoomNoteFields form={form} />
      </div>
    </FieldGroup>
  ),
})

function ZoomLinkHeader({
  config,
}: {
  config: ReturnType<typeof getZoomLinkDialogConfig>
}) {
  return (
    <DialogHeader>
      <div>
        <div className="h-px w-8 bg-[#C5A059]/40" />
        <p className="mt-2 text-[0.68rem] font-medium tracking-[0.3em] text-[#8E816D] uppercase">
          {config.subtitle}
        </p>
      </div>
      <DialogTitle className="font-serif text-xl tracking-[-0.02em] text-[#F8F4EC]">
        {config.title}
      </DialogTitle>
      <DialogDescription className="text-[#AFA28F]">
        Add the Zoom URL, meeting ID, and passcode shown to students and
        teachers.
      </DialogDescription>
    </DialogHeader>
  )
}

function ZoomLinkFooter({
  link,
  isAnyPending,
  onDelete,
  onCancel,
  onSubmit,
}: {
  link: ZoomLinkRow | null
  isAnyPending: boolean
  onDelete: () => void
  onCancel: () => void
  onSubmit: () => void
}) {
  return (
    <DialogFooter className="mt-6 rounded-none border-t border-white/8 bg-white/3 pt-6">
      {link && (
        <Button
          variant="destructive"
          className="mr-auto rounded-none"
          disabled={isAnyPending}
          onClick={onDelete}
        >
          <Trash2Icon className="size-4" />
          Delete
        </Button>
      )}
      <Button variant="outline" theme="dark" onClick={onCancel}>
        Cancel
      </Button>
      <Button theme="dark" disabled={isAnyPending} onClick={onSubmit}>
        {isAnyPending ? 'Saving...' : 'Save Link'}
      </Button>
    </DialogFooter>
  )
}

function useZoomLinkDialog(
  dialogState: ZoomLinkDialogState,
  onOpenChange: (open: boolean) => void,
) {
  const link = resolveZoomLink(dialogState)
  const open = dialogState !== null
  const config = getZoomLinkDialogConfig(link !== null)

  const { createMutation, updateMutation, deleteMutation, isAnyPending } =
    useEntityMutation({
      createFn: createZoomLink,
      updateFn: updateZoomLink,
      deleteFn: deleteZoomLink,
      onSuccessMessage: (mode) => `Zoom link ${mode}d`,
      onSuccess: () => {
        onOpenChange(false)
      },
    })

  const zoomForm = useAppForm({
    defaultValues: getZoomLinkInitialValues(dialogState),
    onSubmit: ({ value }) => {
      const payload = buildZoomLinkPayload(value)
      if (link) {
        updateMutation.mutate({ data: { zoomLinkId: link.id, ...payload } })
        return
      }
      createMutation.mutate({ data: payload })
    },
  })

  const handleDelete = () => {
    if (!link) return
    deleteMutation.mutate({ data: { zoomLinkId: link.id } })
  }

  useEffect(() => {
    if (!open) return
    zoomForm.reset(getZoomLinkInitialValues(dialogState))
  }, [open, dialogState, zoomForm])

  return { link, open, config, zoomForm, isAnyPending, handleDelete }
}

export function ZoomLinkDialog({
  courses,
  dialogState,
  onOpenChange,
}: ZoomLinkDialogProps) {
  const { link, open, config, zoomForm, isAnyPending, handleDelete } =
    useZoomLinkDialog(dialogState, onOpenChange)

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
          <ZoomLinkHeader config={config} />
          <DialogBody>
            <ZoomLinkFields form={zoomForm} courses={courses} />
          </DialogBody>
          <ZoomLinkFooter
            link={link}
            isAnyPending={isAnyPending}
            onDelete={handleDelete}
            onCancel={() => onOpenChange(false)}
            onSubmit={() => void zoomForm.handleSubmit()}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}

function courseLabel(courses: Array<ZoomCourse>, courseId: string): string {
  if (courseId === 'none') return 'No course'
  return courses.find((course) => course.id === courseId)?.title ?? 'No course'
}
