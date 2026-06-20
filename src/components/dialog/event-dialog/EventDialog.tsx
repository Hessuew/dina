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
import type { CalendarEventRow } from '@/utils/event/events'
import type {
  EventCategory,
  EventCategoryDisplay,
  EventDetailIconKey,
  EventDetailRow,
  EventDialogMode,
  EventFormValues,
} from '@/components/dialog/event-dialog/event-dialog.domain'
import { createEventSchema } from '@/schemas/event.schema'
import facultyBackground from '@/assets/images/bg/bg_lecturers.webp'
import { Button } from '@/components/ui/button'
import { DeleteConfirmDialog } from '@/components/ui/delete-confirm-dialog'
import { FormDialog } from '@/components/ui/form-dialog/FormDialog'
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
import {
  buildEventViewModel,
  getEventDefaultValues,
} from '@/components/dialog/event-dialog/event-dialog.domain'
import { cn } from '@/lib/utils'

type EventDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: EventDialogMode
  event?: CalendarEventRow
}

type EventFormFieldsProps = Omit<EventDialogProps, 'mode'> & {
  mode: 'create' | 'edit'
}

const CATEGORY_ICON: Record<EventCategory, React.ElementType> = {
  chapel: HeartHandshakeIcon,
  exam: AlertTriangleIcon,
  personal: UserIcon,
}

const DETAIL_ICON: Record<EventDetailIconKey, React.ElementType> = {
  calendar: CalendarIcon,
  clock: ClockIcon,
  mappin: MapPinIcon,
  video: VideoIcon,
}

const dialogStyle = {
  backgroundImage: `linear-gradient(180deg, rgba(10,10,11,0.9), rgba(16,16,17,0.95)), url(${facultyBackground})`,
  backgroundSize: 'cover',
  backgroundPosition: 'center',
}

const requiredDateTimeString = z.string().min(1, 'This field is required')

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

function EventCategoryChip({ category }: { category: EventCategoryDisplay }) {
  const CategoryIcon = CATEGORY_ICON[category.iconKey]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 border px-2 py-0.5 text-[0.62rem] font-medium tracking-[0.15em] uppercase',
        category.chipClass,
      )}
    >
      <CategoryIcon className="size-2.5" />
      {category.label}
    </span>
  )
}

function EventDetailRowItem({ row }: { row: EventDetailRow }) {
  const Icon = DETAIL_ICON[row.iconKey]
  return (
    <div className="flex items-center gap-2.5 text-sm">
      <Icon className="size-3.5 shrink-0 text-[#8E816D]" />
      {row.href ? (
        <a
          href={row.href}
          target="_blank"
          rel="noopener noreferrer"
          className="truncate text-[#9B7A41] hover:underline"
        >
          {row.text}
        </a>
      ) : (
        <span className="text-[#D6CCBE]">{row.text}</span>
      )}
    </div>
  )
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
  const vm = buildEventViewModel(event)

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
              {vm.category && <EventCategoryChip category={vm.category} />}
            </div>
            <DialogTitle className="font-serif text-xl tracking-[-0.02em] text-[#F8F4EC]">
              {event.title}
            </DialogTitle>
            {vm.courseName && (
              <p className="text-[0.78rem] text-[#AFA28F]">{vm.courseName}</p>
            )}
          </DialogHeader>

          <DialogBody>
            <div className="mt-4 space-y-3">
              {vm.detailRows.map((row) => (
                <EventDetailRowItem key={row.iconKey} row={row} />
              ))}
              {vm.description && (
                <div className="mt-4 border border-white/8 bg-white/4 p-3">
                  <p className="line-clamp-6 text-[0.82rem] leading-relaxed text-[#AFA28F]">
                    {vm.description}
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
  defaultValues: getEventDefaultValues('create'),
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
    defaultValues: getEventDefaultValues(mode, event),
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
    form.reset(getEventDefaultValues(mode, event))
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
