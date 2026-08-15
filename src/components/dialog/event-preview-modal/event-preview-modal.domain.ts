import { format, isSameDay } from 'date-fns'
import type { CalendarEvent } from '@/utils/calendar/calendar'

const TYPE_CHIP: Record<string, { label: string; classes: string }> = {
  assignment: {
    label: 'Assignment',
    classes: 'border-[#C5A059]/40 bg-[#C5A059]/10 text-[#E9D9B4]',
  },
  chapel: {
    label: 'Chapel',
    classes: 'border-violet-500/30 bg-violet-950/50 text-violet-300',
  },
  exam: {
    label: 'Exam',
    classes: 'border-red-500/30 bg-red-950/50 text-red-300',
  },
  lesson: {
    label: 'Lesson',
    classes: 'border-emerald-500/30 bg-emerald-950/50 text-emerald-300',
  },
  personal: {
    label: 'Personal',
    classes: 'border-sky-500/30 bg-sky-950/50 text-sky-300',
  },
  other: {
    label: 'Other',
    classes: 'border-gray-500/30 bg-gray-950/50 text-gray-300',
  },
}

export function getEventChip(event: CalendarEvent): {
  label: string
  classes: string
} {
  if (event.type === 'special') {
    if (event.specialCategory) {
      return TYPE_CHIP[event.specialCategory] ?? TYPE_CHIP.other
    }
    return TYPE_CHIP.other
  }
  /* c8 ignore next */ // Escape-hatch: defensive fallback if new event type is added without updating TYPE_CHIP
  return TYPE_CHIP[event.type] ?? TYPE_CHIP.other
}

export function isEventOverdue(
  event: CalendarEvent,
  now: Date = new Date(),
): boolean {
  return event.type === 'assignment' && new Date(event.date) < now
}

export function canNavigateToEvent(event: CalendarEvent | null): boolean {
  return event?.type === 'lesson' || event?.type === 'assignment'
}

export type EventNavigation = {
  to: '/lessons/$lessonId' | '/assignments/$assignmentId'
  params: { lessonId: string } | { assignmentId: string }
  search: { fromCalendar: true; calendarMonth: string | undefined }
}

export function buildEventNavigation(
  event: CalendarEvent | null,
  currentMonth: Date | undefined,
): EventNavigation | null {
  if (event?.type !== 'lesson' && event?.type !== 'assignment') return null
  return {
    to:
      event.type === 'lesson'
        ? '/lessons/$lessonId'
        : '/assignments/$assignmentId',
    params:
      event.type === 'lesson'
        ? { lessonId: event.id }
        : { assignmentId: event.id },
    search: {
      fromCalendar: true,
      calendarMonth: currentMonth?.toISOString(),
    },
  }
}

export type EventDetailIconKey =
  'clock' | 'book' | 'graduation' | 'mappin' | 'video'

export type EventDetailRow = {
  iconKey: EventDetailIconKey
  text: string
  href?: string
}

export type EventDetailsViewModel = {
  dateLabel: string
  isOverdue: boolean
  rows: Array<EventDetailRow>
  description: string | null
}

function formatSpecialTimeRange(event: CalendarEvent): string {
  const start = format(new Date(event.date), 'p')
  if (!event.endDate) return start
  const endDate = new Date(event.endDate)
  const endFormat = isSameDay(new Date(event.date), endDate) ? 'p' : 'PPp'
  return `${start} – ${format(endDate, endFormat)}`
}

function buildSpecialTimeRows(event: CalendarEvent): Array<EventDetailRow> {
  if (event.type !== 'special') return []
  return [{ iconKey: 'clock', text: formatSpecialTimeRange(event) }]
}

function buildLessonRows(event: CalendarEvent): Array<EventDetailRow> {
  if (event.type !== 'lesson') return []
  const rows: Array<EventDetailRow> = []
  if (event.duration) {
    rows.push({
      iconKey: 'clock',
      text: `${format(new Date(event.date), 'p')} · ${event.duration} min`,
    })
  }
  rows.push({ iconKey: 'book', text: 'Lesson' })
  return rows
}

function buildAssignmentRows(event: CalendarEvent): Array<EventDetailRow> {
  if (event.type !== 'assignment' || event.maxGrade == null) return []
  return [
    {
      iconKey: 'graduation',
      text: `Max grade: ${event.maxGrade} pts`,
    },
  ]
}

function buildLocationRows(event: CalendarEvent): Array<EventDetailRow> {
  if (!event.location) return []
  return [{ iconKey: 'mappin', text: event.location }]
}

function buildZoomRows(event: CalendarEvent): Array<EventDetailRow> {
  if (!event.zoomLink) return []
  return [
    {
      iconKey: 'video',
      text: event.zoomLink,
      href: event.zoomLink,
    },
  ]
}

export function buildEventDetailsViewModel(
  event: CalendarEvent,
  isOverdue: boolean,
): EventDetailsViewModel {
  return {
    dateLabel: format(new Date(event.date), 'PPPP'),
    isOverdue,
    rows: [
      ...buildSpecialTimeRows(event),
      ...buildLessonRows(event),
      ...buildAssignmentRows(event),
      ...buildLocationRows(event),
      ...buildZoomRows(event),
    ],
    description: event.description ?? null,
  }
}
