import { useEffect } from 'react'
import {
  AlertTriangleIcon,
  CalendarIcon,
  ClockIcon,
  HeartHandshakeIcon,
  MapPinIcon,
  UserIcon,
  VideoIcon,
} from 'lucide-react'
import { z } from 'zod'
import { format } from 'date-fns'
import type { CalendarEventRow } from '@/utils/event/events'
import { createEventSchema } from '@/schemas/event.schema'
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
import { FieldGroup } from '@/components/ui/field'
import { SelectItem } from '@/components/ui/select'
import { useAppForm, withForm } from '@/hooks/form'
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

type EventFormFieldsProps = Omit<EventDialogProps, 'mode'> & {
  mode: 'create' | 'edit'
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

const dialogStyle = {
  backgroundImage: `linear-gradient(180deg, rgba(10,10,11,0.9), rgba(16,16,17,0.95)), url(${facultyBackground})`,
  backgroundSize: 'cover',
  backgroundPosition: 'center',
}

const requiredDateTimeString = z.string().min(1, 'This field is required')

type EventFormValues = {
  title: string
  description: string
  startTime: string
  endTime: string
  location: string
  zoomLink: string
  category: string
}

function getDefaultValues(
  mode: EventDialogMode,
  event?: CalendarEventRow,
): EventFormValues {
  if ((mode === 'edit' || mode === 'view') && event) {
    return {
      title: event.title,
      description: event.description ?? '',
      startTime: new Date(event.startTime).toISOString().slice(0, 16),
      endTime: new Date(event.endTime).toISOString().slice(0, 16),
      location: event.location ?? '',
      zoomLink: event.zoomLink ?? '',
      category: event.category ?? '',
    }
  }
  return {
    title: '',
    description: '',
    startTime: '',
    endTime: '',
    location: '',
    zoomLink: '',
    category: '',
  }
}

function buildEventInput(value: EventFormValues) {
  return {
    title: value.title,
    description: value.description || undefined,
    startTime: new Date(value.startTime),
    endTime: new Date(value.endTime),
    location: value.location || undefined,
    zoomLink: value.zoomLink || undefined,
    category: (value.category || undefined) as
      | 'exam'
      | 'chapel'
      | 'personal'
      | undefined,
  }
}

function EventViewMode({
  event,
  open,
  onOpenChange,
}: {
  event: CalendarEventRow
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
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

const EventFormFieldsContent = withForm({
  defaultValues: getDefaultValues('create'),
  render: ({ form }) => (
    <FieldGroup className="mt-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <form.AppField
          name="title"
          validators={{ onSubmit: createEventSchema.shape.title }}
        >
          {(field) => (
            <field.TextField
              id="event-title"
              label="Title"
              required
              className="sm:col-span-2"
              placeholder="Event title"
            />
          )}
        </form.AppField>
        <form.AppField
          name="startTime"
          validators={{ onSubmit: requiredDateTimeString }}
        >
          {(field) => (
            <field.TextField
              id="event-start"
              label="Start Time"
              required
              type="datetime-local"
            />
          )}
        </form.AppField>
        <form.AppField
          name="endTime"
          validators={{
            onSubmit: ({ value, fieldApi }) => {
              if (!value) return 'End time is required'
              const startTime = fieldApi.form.state.values.startTime
              if (startTime && new Date(value) <= new Date(startTime)) {
                return 'End time must be after start time'
              }
              return undefined
            },
          }}
        >
          {(field) => (
            <field.TextField
              id="event-end"
              label="End Time"
              required
              type="datetime-local"
            />
          )}
        </form.AppField>
        <form.AppField name="category">
          {(field) => (
            <field.SelectField
              id="event-category"
              label="Category"
              placeholder="Select category"
            >
              <SelectItem value="chapel">Chapel</SelectItem>
              <SelectItem value="exam">Exam</SelectItem>
              <SelectItem value="personal">Personal</SelectItem>
            </field.SelectField>
          )}
        </form.AppField>
        <form.AppField name="location">
          {(field) => (
            <field.TextField
              id="event-location"
              label="Location"
              placeholder="Room or address"
            />
          )}
        </form.AppField>
        <form.AppField name="zoomLink">
          {(field) => (
            <field.TextField
              id="event-zoom"
              label="Zoom Link"
              className="sm:col-span-2"
              placeholder="https://zoom.us/j/..."
            />
          )}
        </form.AppField>
        <form.AppField name="description">
          {(field) => (
            <field.TextAreaField
              id="event-description"
              label="Description"
              className="sm:col-span-2"
              placeholder="Event description"
              rows={5}
            />
          )}
        </form.AppField>
      </div>
    </FieldGroup>
  ),
})

function EventFormFields({
  mode,
  event,
  open,
  onOpenChange,
}: EventFormFieldsProps) {
  const { createMutation, updateMutation, isAnyPending } = useEntityMutation({
    createFn: createEvent,
    updateFn: updateEvent,
    deleteFn: deleteEvent,
    onSuccess: () => {
      onOpenChange(false)
    },
  })

  const form = useAppForm({
    defaultValues: getDefaultValues(mode, event),
    onSubmit: ({ value }) => {
      const shared = buildEventInput(value)

      if (mode === 'create') {
        createMutation.mutate({ data: shared })
        return
      }

      if (!event) return
      updateMutation.mutate({ data: { ...shared, eventId: event.id } })
    },
  })

  useEffect(() => {
    if (!open) return
    form.reset(getDefaultValues(mode, event))
  }, [open, mode, event, form])

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
      onSubmit={() => void form.handleSubmit()}
      isSubmitting={isAnyPending}
      submitLabel={mode === 'create' ? 'Create Event' : 'Save Changes'}
    >
      <DialogBody>
        <EventFormFieldsContent form={form} />
      </DialogBody>
    </FormDialog>
  )
}

export function EventDialog({
  event,
  mode,
  open,
  onOpenChange,
}: EventDialogProps) {
  const { deleteMutation } = useEntityMutation({
    createFn: createEvent,
    updateFn: updateEvent,
    deleteFn: deleteEvent,
    onSuccess: () => {
      onOpenChange(false)
    },
  })

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
    return (
      <EventViewMode event={event} open={open} onOpenChange={onOpenChange} />
    )
  }

  if (mode === 'create' || mode === 'edit') {
    return (
      <EventFormFields
        mode={mode}
        event={event}
        open={open}
        onOpenChange={onOpenChange}
      />
    )
  }

  return null
}
