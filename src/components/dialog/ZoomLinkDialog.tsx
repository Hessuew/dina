import { Trash2Icon } from 'lucide-react'
import { useEffect, useState } from 'react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useEntityMutation } from '@/hooks/useEntityMutation'
import { useAppForm } from '@/hooks/form'
import {
  createZoomLink,
  deleteZoomLink,
  updateZoomLink,
} from '@/utils/zoomLink/zoomLinks'
import {
  createZoomLinkSchema,
  updateZoomLinkSchema,
} from '@/schemas/zoomLink.schema'

type ZoomCourse = { id: string; title: string }

type ZoomFormData = {
  title: string
  description: string
  section: string
  courseId: string
  zoomUrl: string
  meetingId: string
  passcode: string
  orderIndex: number
}

type ZoomFormErrors = Partial<Record<keyof ZoomFormData, string>>

export type ZoomLinkDialogState =
  | { mode: 'create' }
  | { mode: 'edit'; link: ZoomLinkRow }
  | null

type ZoomLinkDialogProps = {
  courses: Array<ZoomCourse>
  dialogState: ZoomLinkDialogState
  onOpenChange: (open: boolean) => void
}

const emptyZoomForm: ZoomFormData = {
  title: '',
  description: '',
  section: 'general_class_lecture',
  courseId: 'none',
  zoomUrl: '',
  meetingId: '',
  passcode: '',
  orderIndex: 0,
}

const sectionTitle: Record<ZoomLinkSection, string> = {
  general_class_lecture: 'General Class Lectures',
  discipleship_group: 'Discipleship Groups',
}

function getInitialValues(dialogState: ZoomLinkDialogState): ZoomFormData {
  if (dialogState?.mode === 'edit') {
    const link = dialogState.link
    return {
      title: link.title,
      description: link.description ?? '',
      section: link.section,
      courseId: link.courseId ?? 'none',
      zoomUrl: link.zoomUrl,
      meetingId: link.meetingId,
      passcode: link.passcode,
      orderIndex: link.orderIndex,
    }
  }
  return emptyZoomForm
}

function extractZoomErrors(
  issues: Array<{ path: Array<PropertyKey>; message: string }>,
): ZoomFormErrors {
  const errors: ZoomFormErrors = {}

  for (const issue of issues) {
    const key = issue.path[0]
    if (typeof key !== 'string' || !(key in emptyZoomForm)) continue

    const field = key as keyof ZoomFormData
    if (!errors[field]) errors[field] = issue.message
  }

  return errors
}

export function ZoomLinkDialog({
  courses,
  dialogState,
  onOpenChange,
}: ZoomLinkDialogProps) {
  const [submitErrors, setSubmitErrors] = useState<ZoomFormErrors>({})
  const link = dialogState?.mode === 'edit' ? dialogState.link : null
  const open = dialogState !== null

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
    defaultValues: getInitialValues(dialogState),
    onSubmit: ({ value }) => {
      const payload = {
        title: value.title,
        description: value.description || undefined,
        section: value.section as ZoomLinkSection,
        courseId: value.courseId === 'none' ? undefined : value.courseId,
        zoomUrl: value.zoomUrl,
        meetingId: value.meetingId,
        passcode: value.passcode,
        orderIndex: Number.isFinite(value.orderIndex)
          ? value.orderIndex
          : undefined,
      }

      if (link) {
        const result = updateZoomLinkSchema.safeParse({
          zoomLinkId: link.id,
          ...payload,
        })

        if (!result.success) {
          setSubmitErrors(extractZoomErrors(result.error.issues))
          return
        }

        setSubmitErrors({})
        updateMutation.mutate({ data: result.data })
        return
      }

      const result = createZoomLinkSchema.safeParse(payload)

      if (!result.success) {
        setSubmitErrors(extractZoomErrors(result.error.issues))
        return
      }

      setSubmitErrors({})
      createMutation.mutate({ data: result.data })
    },
  })

  const clearZoomError = (field: keyof ZoomFormData) => {
    if (!submitErrors[field]) return
    setSubmitErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  const handleDelete = () => {
    if (!link) return
    deleteMutation.mutate({ data: { zoomLinkId: link.id } })
  }

  useEffect(() => {
    if (!open) return
    setSubmitErrors({})
    zoomForm.reset(getInitialValues(dialogState))
  }, [open, dialogState, zoomForm])

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
                <zoomForm.AppField name="section">
                  {(field) => (
                    <Field>
                      <FieldLabel
                        className="text-[#9B7A41]"
                        htmlFor="zoom-section"
                      >
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
                </zoomForm.AppField>
                <zoomForm.AppField name="courseId">
                  {(field) => (
                    <Field>
                      <FieldLabel
                        className="text-[#9B7A41]"
                        htmlFor="zoom-course"
                      >
                        Course
                      </FieldLabel>
                      <Select
                        value={field.state.value}
                        onValueChange={(value) =>
                          field.handleChange(value ?? 'none')
                        }
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
                </zoomForm.AppField>
                <zoomForm.AppField name="title">
                  {(field) => (
                    <field.TextField
                      id="zoom-title"
                      label="Title"
                      placeholder="Ground course discipleship group"
                      required
                      error={submitErrors.title}
                      onValueChange={() => clearZoomError('title')}
                      className="sm:col-span-2"
                    />
                  )}
                </zoomForm.AppField>
                <zoomForm.AppField name="zoomUrl">
                  {(field) => (
                    <field.TextField
                      id="zoom-url"
                      label="Zoom Link"
                      placeholder="https://zoom.us/j/..."
                      required
                      error={submitErrors.zoomUrl}
                      onValueChange={() => clearZoomError('zoomUrl')}
                      className="sm:col-span-2"
                    />
                  )}
                </zoomForm.AppField>
                <zoomForm.AppField name="meetingId">
                  {(field) => (
                    <field.TextField
                      id="zoom-meeting-id"
                      label="Meeting ID"
                      placeholder="123 456 7890"
                      required
                      error={submitErrors.meetingId}
                      onValueChange={() => clearZoomError('meetingId')}
                    />
                  )}
                </zoomForm.AppField>
                <zoomForm.AppField name="passcode">
                  {(field) => (
                    <field.TextField
                      id="zoom-passcode"
                      label="Passcode"
                      placeholder="Passcode"
                      required
                      error={submitErrors.passcode}
                      onValueChange={() => clearZoomError('passcode')}
                    />
                  )}
                </zoomForm.AppField>
                <zoomForm.AppField name="orderIndex">
                  {(field) => (
                    <field.NumberField id="zoom-order" label="Order" min={0} />
                  )}
                </zoomForm.AppField>
                <zoomForm.AppField name="description">
                  {(field) => (
                    <field.TextAreaField
                      id="zoom-description"
                      label="Description"
                      placeholder="Optional meeting note"
                      rows={4}
                      className="sm:col-span-2"
                    />
                  )}
                </zoomForm.AppField>
              </div>
            </FieldGroup>
          </DialogBody>

          <DialogFooter className="mt-6 rounded-none border-t border-white/8 bg-white/3 pt-6">
            {link && (
              <Button
                variant="destructive"
                className="mr-auto rounded-none"
                disabled={isAnyPending}
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
            <Button
              theme="dark"
              disabled={isAnyPending}
              onClick={() => void zoomForm.handleSubmit()}
            >
              {isAnyPending ? 'Saving...' : 'Save Link'}
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
