import { format } from 'date-fns'
import type { CalendarEventRow } from '@/utils/event/events'
import { toDatetimeLocalValue } from '@/utils/datetime'

export type EventDialogMode = 'view' | 'create' | 'edit' | 'delete'

export type EventFormValues = {
  title: string
  description: string
  startTime: string
  endTime: string
  location: string
  zoomLink: string
  category: string
}

export function getEventDefaultValues(
  mode: EventDialogMode,
  event?: CalendarEventRow,
): EventFormValues {
  if ((mode === 'edit' || mode === 'view') && event) {
    return {
      title: event.title,
      description: event.description ?? '',
      startTime: toDatetimeLocalValue(event.startTime),
      endTime: toDatetimeLocalValue(event.endTime),
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

export type EventCategory = NonNullable<CalendarEventRow['category']>

const CATEGORY_LABELS: Record<EventCategory, string> = {
  chapel: 'Chapel',
  exam: 'Exam',
  personal: 'Personal',
}

const CATEGORY_CHIP: Record<EventCategory, string> = {
  chapel: 'border-violet-500/30 bg-violet-950/40 text-violet-300',
  exam: 'border-red-500/30 bg-red-950/40 text-red-300',
  personal: 'border-sky-500/30 bg-sky-950/40 text-sky-300',
}

export type EventCategoryDisplay = {
  iconKey: EventCategory
  label: string
  chipClass: string
}

export type EventDetailIconKey = 'calendar' | 'clock' | 'mappin' | 'video'

export type EventDetailRow = {
  iconKey: EventDetailIconKey
  text: string
  href: string | null
}

export type EventViewModel = {
  category: EventCategoryDisplay | null
  courseName: string | null
  detailRows: Array<EventDetailRow>
  description: string | null
}

export function buildEventViewModel(event: CalendarEventRow): EventViewModel {
  const detailRows: Array<EventDetailRow> = [
    {
      iconKey: 'calendar',
      text: format(new Date(event.startTime), 'PPP'),
      href: null,
    },
    {
      iconKey: 'clock',
      text: `${format(new Date(event.startTime), 'p')} – ${format(
        new Date(event.endTime),
        'p',
      )}`,
      href: null,
    },
  ]
  if (event.location) {
    detailRows.push({ iconKey: 'mappin', text: event.location, href: null })
  }
  if (event.zoomLink) {
    detailRows.push({
      iconKey: 'video',
      text: event.zoomLink,
      href: event.zoomLink,
    })
  }
  return {
    category: event.category
      ? {
          iconKey: event.category,
          label: CATEGORY_LABELS[event.category],
          chipClass: CATEGORY_CHIP[event.category],
        }
      : null,
    courseName: event.courseName ?? null,
    detailRows,
    description: event.description ?? null,
  }
}
