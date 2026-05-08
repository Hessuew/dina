import { useEffect, useState } from 'react'
import {
  AlertTriangleIcon,
  CalendarIcon,
  ClockIcon,
  HeartHandshakeIcon,
  MapPinIcon,
  UserIcon,
  VideoIcon,
} from 'lucide-react'
import { format } from 'date-fns'
import type { CalendarEventRow } from '@/utils/event/events'
import { createEventSchema, updateEventSchema } from '@/schemas/event.schema'
import facultyBackground from '@/assets/images/bg/bg_lecturers.webp'
import { Button } from '@/components/ui/button'
import { DeleteConfirmDialog } from '@/components/ui/delete-confirm-dialog'
import { FormDialog } from '@/components/ui/form-dialog'
import {
  Dialog,
  DialogBody,
  DialogContent,
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
import { useEntityMutation } from '@/hooks/useEntityMutation'
import { createEvent, deleteEvent, updateEvent } from '@/utils/event/events'
import { cn } from '@/lib/utils'

type EventDialogMode = 'view' | 'create' | 'edit' | 'delete'

type EventDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: EventDialogMode
  event?: CalendarEventRow
}

const CATEGORY_LABELS: Record<string, string> = {
  chapel: 'Chapel',
  exam: 'Exam',
  personal: 'Personal',
}

const CATEGORY_ICON: Record<string, React.ElementType> = {
  chapel: HeartHandshakeIcon,
  exam: AlertTriangleIcon,
  personal: UserIcon,
}

const CATEGORY_CHIP: Record<string, string> = {
  chapel: 'border-violet-500/30 bg-violet-950/40 text-violet-300',
  exam: 'border-red-500/30 bg-red-950/40 text-red-300',
  personal: 'border-sky-500/30 bg-sky-950/40 text-sky-300',
}

type EventFormData = {
  title: string
  description: string
  startTime: string
  endTime: string
  location: string
  zoomLink: string
  category: 'exam' | 'chapel' | 'personal' | ''
}

const emptyForm: EventFormData = {
  title: '',
  description: '',
  startTime: '',
  endTime: '',
  location: '',
  zoomLink: '',
  category: '',
}

const dialogStyle = {
  backgroundImage: `linear-gradient(180deg, rgba(10,10,11,0.9), rgba(16,16,17,0.95)), url(${facultyBackground})`,
  backgroundSize: 'cover',
  backgroundPosition: 'center',
}

export function EventDialog({
  open,
  onOpenChange,
  mode,
  event,
}: EventDialogProps) {
  const [formData, setFormData] = useState<EventFormData>(emptyForm)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!open) return
    setFieldErrors({})
    if ((mode === 'edit' || mode === 'view') && event) {
      setFormData({
        title: event.title,
        description: event.description ?? '',
        startTime: new Date(event.startTime).toISOString().slice(0, 16),
        endTime: new Date(event.endTime).toISOString().slice(0, 16),
        location: event.location ?? '',
        zoomLink: event.zoomLink ?? '',
        category: event.category ?? '',
      })
    } else {
      setFormData(emptyForm)
    }
  }, [open, mode, event])

  const { createMutation, updateMutation, deleteMutation } = useEntityMutation({
    createFn: createEvent,
    updateFn: updateEvent,
    deleteFn: deleteEvent,
    onSuccess: () => {
      onOpenChange(false)
    },
  })

  const isPending = createMutation.isPending || updateMutation.isPending

  const handleSubmit = () => {
    const parseData = {
      title: formData.title,
      description: formData.description,
      startTime: formData.startTime ? new Date(formData.startTime) : undefined,
      endTime: formData.endTime ? new Date(formData.endTime) : undefined,
      location: formData.location,
      zoomLink: formData.zoomLink,
      category: formData.category || undefined,
      eventId: event?.id ?? '',
    }

    const parseResult =
      mode === 'create'
        ? createEventSchema.safeParse(parseData)
        : updateEventSchema.safeParse(parseData)

    if (!parseResult.success) {
      const errors: Record<string, string> = {}
      for (const issue of parseResult.error.issues) {
        const key = issue.path[0] as string
        if (!errors[key]) errors[key] = issue.message
      }
      setFieldErrors(errors)
      return
    }

    const startDate = new Date(formData.startTime)
    const endDate = new Date(formData.endTime)
    if (endDate <= startDate) {
      setFieldErrors({ endTime: 'End time must be after start time' })
      return
    }

    setFieldErrors({})

    const payload = {
      title: formData.title,
      description: formData.description || undefined,
      startTime: startDate,
      endTime: endDate,
      location: formData.location || undefined,
      zoomLink: formData.zoomLink || undefined,
      category: formData.category || undefined,
    }
    if (mode === 'create') {
      createMutation.mutate({ data: payload })
    } else if (mode === 'edit' && event) {
      updateMutation.mutate({ data: { eventId: event.id, ...payload } })
    }
  }

  if (mode === 'delete') {
    return (
      <DeleteConfirmDialog
        open={open}
        onOpenChange={onOpenChange}
        entityName="Event"
        onConfirm={() =>
          event && deleteMutation.mutate({ data: { eventId: event.id } })
        }
        isDeleting={deleteMutation.isPending}
      />
    )
  }

  if (mode === 'view' && event) {
    const CategoryIcon = event.category
      ? CATEGORY_ICON[event.category]
      : CalendarIcon
    const chipClass = event.category ? CATEGORY_CHIP[event.category] : ''

    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="rounded-none border border-white/10 text-[#F8F4EC] shadow-[0_42px_100px_-52px_rgba(0,0,0,0.82)] sm:max-w-md"
          style={dialogStyle}
          showCloseButton={false}
        >
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.04),transparent_38%,rgba(197,160,89,0.08)_100%)]" />
          <div className="relative flex min-h-0 flex-1 flex-col">
            <DialogHeader>
              <div className="mb-1 flex items-center justify-between">
                <div>
                  <div className="h-px w-8 bg-[#C5A059]/40" />
                  <div className="mt-2 text-[0.68rem] font-medium tracking-[0.3em] text-[#8E816D] uppercase">
                    Event details
                  </div>
                </div>
                {event.category && (
                  <span
                    className={cn(
                      'inline-flex items-center gap-1.5 border px-2 py-0.5 text-[0.62rem] font-medium tracking-[0.15em] uppercase',
                      chipClass,
                    )}
                  >
                    <CategoryIcon className="size-2.5" />
                    {CATEGORY_LABELS[event.category]}
                  </span>
                )}
              </div>
              <DialogTitle className="font-serif text-xl tracking-[-0.02em] text-[#F8F4EC]">
                {event.title}
              </DialogTitle>
              {event.courseName && (
                <p className="text-[0.78rem] text-[#AFA28F]">
                  {event.courseName}
                </p>
              )}
            </DialogHeader>

            <DialogBody>
              <div className="mt-4 space-y-3">
                <div className="flex items-center gap-2.5 text-sm">
                  <CalendarIcon className="size-3.5 shrink-0 text-[#8E816D]" />
                  <span className="text-[#D6CCBE]">
                    {format(new Date(event.startTime), 'PPP')}
                  </span>
                </div>
                <div className="flex items-center gap-2.5 text-sm">
                  <ClockIcon className="size-3.5 shrink-0 text-[#8E816D]" />
                  <span className="text-[#D6CCBE]">
                    {format(new Date(event.startTime), 'p')} –{' '}
                    {format(new Date(event.endTime), 'p')}
                  </span>
                </div>
                {event.location && (
                  <div className="flex items-center gap-2.5 text-sm">
                    <MapPinIcon className="size-3.5 shrink-0 text-[#8E816D]" />
                    <span className="text-[#D6CCBE]">{event.location}</span>
                  </div>
                )}
                {event.zoomLink && (
                  <div className="flex items-center gap-2.5 text-sm">
                    <VideoIcon className="size-3.5 shrink-0 text-[#8E816D]" />
                    <a
                      href={event.zoomLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="truncate text-[#9B7A41] hover:underline"
                    >
                      {event.zoomLink}
                    </a>
                  </div>
                )}
                {event.description && (
                  <div className="mt-4 border border-white/8 bg-white/4 p-3">
                    <p className="line-clamp-6 text-[0.82rem] leading-relaxed text-[#AFA28F]">
                      {event.description}
                    </p>
                  </div>
                )}
              </div>
            </DialogBody>

            <DialogFooter className="mt-6 rounded-none border-t border-white/8 bg-white/3 pt-6">
              <Button
                variant="outline"
                theme="dark"
                onClick={() => onOpenChange(false)}
              >
                Close
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      mode={mode}
      title={mode === 'create' ? 'Create Event' : 'Edit Event'}
      subtitle={
        mode === 'create'
          ? 'Add a new school event to the calendar'
          : 'Update the event information'
      }
      maxWidth="2xl"
      onSubmit={handleSubmit}
      isSubmitting={isPending}
      submitLabel={mode === 'create' ? 'Create Event' : 'Save Changes'}
    >
      <DialogBody>
        <FieldGroup className="mt-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field className="sm:col-span-2">
              <FieldLabel
                htmlFor="event-title"
                className="text-[0.68rem] font-medium tracking-[0.18em] text-[#9B7A41] uppercase"
              >
                Title <span className="text-[#C5A059]">*</span>
              </FieldLabel>
              <Input
                id="event-title"
                placeholder="Event title"
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
                htmlFor="event-start"
                className="text-[0.68rem] font-medium tracking-[0.18em] text-[#9B7A41] uppercase"
              >
                Start Time <span className="text-[#C5A059]">*</span>
              </FieldLabel>
              <Input
                id="event-start"
                type="datetime-local"
                value={formData.startTime}
                className={`rounded-none border-white/12 bg-white/6 text-[#F8F4EC] focus:border-[#C5A059]/50${fieldErrors.startTime ? 'border-red-500/60' : ''}`}
                onChange={(e) => {
                  setFormData({ ...formData, startTime: e.target.value })
                  if (fieldErrors.startTime)
                    setFieldErrors({ ...fieldErrors, startTime: '' })
                }}
              />
              {fieldErrors.startTime && (
                <p className="text-[0.68rem] text-red-400">
                  {fieldErrors.startTime}
                </p>
              )}
            </Field>
            <Field>
              <FieldLabel
                htmlFor="event-end"
                className="text-[0.68rem] font-medium tracking-[0.18em] text-[#9B7A41] uppercase"
              >
                End Time <span className="text-[#C5A059]">*</span>
              </FieldLabel>
              <Input
                id="event-end"
                type="datetime-local"
                value={formData.endTime}
                className={`rounded-none border-white/12 bg-white/6 text-[#F8F4EC] focus:border-[#C5A059]/50${fieldErrors.endTime ? 'border-red-500/60' : ''}`}
                onChange={(e) => {
                  setFormData({ ...formData, endTime: e.target.value })
                  if (fieldErrors.endTime)
                    setFieldErrors({ ...fieldErrors, endTime: '' })
                }}
              />
              {fieldErrors.endTime && (
                <p className="text-[0.68rem] text-red-400">
                  {fieldErrors.endTime}
                </p>
              )}
            </Field>
            <Field>
              <FieldLabel
                htmlFor="event-category"
                className="text-[0.68rem] font-medium tracking-[0.18em] text-[#9B7A41] uppercase"
              >
                Category
              </FieldLabel>
              <Select
                value={formData.category}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    category: value as EventFormData['category'],
                  })
                }
              >
                <SelectTrigger className="rounded-none border-white/12 bg-white/6 text-[#F8F4EC]">
                  <SelectValue placeholder="Select category">
                    {formData.category
                      ? formData.category.charAt(0).toUpperCase() +
                        formData.category.slice(1)
                      : 'Select category'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="rounded-none border-white/12">
                  <SelectItem value="chapel">Chapel</SelectItem>
                  <SelectItem value="exam">Exam</SelectItem>
                  <SelectItem value="personal">Personal</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel
                htmlFor="event-location"
                className="text-[0.68rem] font-medium tracking-[0.18em] text-[#9B7A41] uppercase"
              >
                Location
              </FieldLabel>
              <Input
                id="event-location"
                placeholder="Room or address"
                value={formData.location}
                className="rounded-none border-white/12 bg-white/6 text-[#F8F4EC] placeholder:text-[#8E816D] focus:border-[#C5A059]/50"
                onChange={(e) =>
                  setFormData({ ...formData, location: e.target.value })
                }
              />
            </Field>
            <Field className="sm:col-span-2">
              <FieldLabel
                htmlFor="event-zoom"
                className="text-[0.68rem] font-medium tracking-[0.18em] text-[#9B7A41] uppercase"
              >
                Zoom Link
              </FieldLabel>
              <Input
                id="event-zoom"
                placeholder="https://zoom.us/j/..."
                value={formData.zoomLink}
                className="rounded-none border-white/12 bg-white/6 text-[#F8F4EC] placeholder:text-[#8E816D] focus:border-[#C5A059]/50"
                onChange={(e) =>
                  setFormData({ ...formData, zoomLink: e.target.value })
                }
              />
            </Field>
            <Field className="sm:col-span-2">
              <FieldLabel
                htmlFor="event-description"
                className="text-[0.68rem] font-medium tracking-[0.18em] text-[#9B7A41] uppercase"
              >
                Description
              </FieldLabel>
              <Textarea
                id="event-description"
                rows={5}
                placeholder="Event description"
                value={formData.description}
                className="rounded-none border-white/12 bg-white/6 text-[#F8F4EC] placeholder:text-[#8E816D] focus:border-[#C5A059]/50"
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />
            </Field>
          </div>
        </FieldGroup>
      </DialogBody>
    </FormDialog>
  )
}
