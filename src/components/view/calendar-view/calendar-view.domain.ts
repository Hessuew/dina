import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  isSameDay,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import type { CalendarEvent } from '@/utils/calendar/calendar'
import { cn } from '@/lib/utils'

export const MAX_VISIBLE_DAY_EVENTS = 3

export const EVENT_STYLES: Record<string, { dot: string; pill: string }> = {
  assignment: {
    dot: 'bg-[#C5A059]',
    pill: 'border-[#C5A059]/40 bg-[#C5A059]/10 text-[#E9D9B4] hover:bg-[#C5A059]/20',
  },
  chapel: {
    dot: 'bg-violet-400',
    pill: 'border-violet-500/30 bg-violet-950/50 text-violet-300 hover:bg-violet-950/70',
  },
  exam: {
    dot: 'bg-red-400',
    pill: 'border-red-500/30 bg-red-950/50 text-red-300 hover:bg-red-950/70',
  },
  lesson: {
    dot: 'bg-emerald-400',
    pill: 'border-emerald-500/30 bg-emerald-950/50 text-emerald-300 hover:bg-emerald-950/70',
  },
  personal: {
    dot: 'bg-sky-400',
    pill: 'border-sky-500/30 bg-sky-950/50 text-sky-300 hover:bg-sky-950/70',
  },
  other: {
    dot: 'bg-gray-400',
    pill: 'border-gray-500/30 bg-gray-950/50 text-gray-300 hover:bg-gray-950/70',
  },
}

export function getEventStyle(event: CalendarEvent) {
  if (event.type === 'special') {
    if (event.specialCategory) {
      return EVENT_STYLES[event.specialCategory]
    }
    return EVENT_STYLES.other
  }
  return EVENT_STYLES[event.type]
}

export function buildCalendarDays(currentDate: Date): Array<Date> {
  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const calendarStart = startOfWeek(monthStart)
  const calendarEnd = endOfWeek(monthEnd)
  return eachDayOfInterval({ start: calendarStart, end: calendarEnd })
}

export type CalendarEventPill = {
  event: CalendarEvent
  dotClassName: string
  pillClassName: string
}

export type CalendarDayCell = {
  isDayInCurrentMonth: boolean
  isToday: boolean
  isLastRow: boolean
  visibleEvents: Array<CalendarEventPill>
  overflowCount: number
  cellClassName: string
  dayNumberClassName: string
}

export function buildCalendarDayCell(params: {
  day: Date
  index: number
  totalDays: number
  currentDate: Date
  events: Array<CalendarEvent>
  hasEventClick: boolean
  today?: Date
}): CalendarDayCell {
  const { day, index, totalDays, currentDate, events, hasEventClick } = params
  const today = params.today ?? new Date()

  const dayEvents = events.filter((event) =>
    isSameDay(new Date(event.date), day),
  )
  const isDayInCurrentMonth = day.getMonth() === currentDate.getMonth()
  const isToday = isSameDay(day, today)
  const isLastRow = index >= totalDays - 7

  const visibleEvents = dayEvents
    .slice(0, MAX_VISIBLE_DAY_EVENTS)
    .map((event): CalendarEventPill => {
      const style = getEventStyle(event)
      return {
        event,
        dotClassName: cn('size-1.5 shrink-0 rounded-full', style.dot),
        pillClassName: cn(
          'flex w-full items-center gap-1 truncate border px-1.5 py-0.5 text-[0.6rem] leading-4 transition-colors',
          style.pill,
          !hasEventClick && 'pointer-events-none',
        ),
      }
    })
  const overflowCount = Math.max(
    dayEvents.length - MAX_VISIBLE_DAY_EVENTS,
    0,
  )

  return {
    isDayInCurrentMonth,
    isToday,
    isLastRow,
    visibleEvents,
    overflowCount,
    cellClassName: cn(
      'min-h-28 p-2',
      !isLastRow && 'border-b border-white/6',
      !isDayInCurrentMonth && 'bg-white/2',
      isToday && 'bg-[#C5A059]/6',
    ),
    dayNumberClassName: cn(
      'mb-1.5 flex size-6 items-center justify-center text-[0.72rem]',
      isToday
        ? 'bg-[#C5A059] font-semibold text-[#0F0E0C]'
        : isDayInCurrentMonth
          ? 'text-[#D6CCBE]'
          : 'text-[#8E816D]/50',
    ),
  }
}
