import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import { useState } from 'react'
import type { CalendarEvent } from '@/utils/calendar'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type CalendarViewProps = {
  events: Array<CalendarEvent>
  onEventClick?: (event: CalendarEvent) => void
  initialDate?: Date
  onDateChange?: (date: Date) => void
}

const EVENT_STYLES: Record<string, { dot: string; pill: string }> = {
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
}

function getEventStyle(event: CalendarEvent) {
  if (event.type === 'special' && event.specialCategory) {
    return EVENT_STYLES[event.specialCategory]
  }
  return EVENT_STYLES[event.type]
}

export function CalendarView({
  events,
  onEventClick,
  initialDate,
  onDateChange,
}: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(initialDate ?? new Date())

  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const calendarStart = startOfWeek(monthStart)
  const calendarEnd = endOfWeek(monthEnd)
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

  const getEventsForDay = (day: Date) =>
    events.filter((event) => isSameDay(new Date(event.date), day))

  const previousMonth = () => {
    const d = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1)
    setCurrentDate(d)
    onDateChange?.(d)
  }

  const nextMonth = () => {
    const d = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1)
    setCurrentDate(d)
    onDateChange?.(d)
  }

  const goToToday = () => {
    const today = new Date()
    setCurrentDate(today)
    onDateChange?.(today)
  }

  const isCurrentMonth = isSameMonth(currentDate, new Date())

  return (
    <div className="border border-white/10 bg-[#151515]/88 shadow-[0_22px_44px_-28px_rgba(0,0,0,0.6)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
        <span className="font-serif text-xl tracking-[-0.02em] text-[#F8F4EC]">
          {format(currentDate, 'MMMM yyyy')}
        </span>
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            theme="dark"
            size="icon"
            className="h-8 w-8"
            onClick={previousMonth}
          >
            <ChevronLeftIcon className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            theme="dark"
            size="sm"
            className="h-8 gap-1.5 text-[0.72rem] tracking-[0.12em] uppercase"
            onClick={goToToday}
            disabled={isCurrentMonth}
          >
            <CalendarIcon className="size-3" />
            Today
          </Button>
          <Button
            variant="ghost"
            theme="dark"
            size="icon"
            className="h-8 w-8"
            onClick={nextMonth}
          >
            <ChevronRightIcon className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-white/8">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div
            key={day}
            className="py-2.5 text-center text-[0.62rem] font-medium tracking-[0.2em] text-[#8E816D] uppercase"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 divide-x divide-white/6">
        {days.map((day, idx) => {
          const dayEvents = getEventsForDay(day)
          const isDayInCurrentMonth = day.getMonth() === currentDate.getMonth()
          const isToday = isSameDay(day, new Date())
          const isLastRow = idx >= days.length - 7

          return (
            <div
              key={day.toISOString()}
              className={cn(
                'min-h-28 p-2',
                !isLastRow && 'border-b border-white/6',
                !isDayInCurrentMonth && 'bg-white/2',
                isToday && 'bg-[#C5A059]/6',
              )}
            >
              <div
                className={cn(
                  'mb-1.5 flex size-6 items-center justify-center text-[0.72rem]',
                  isToday
                    ? 'bg-[#C5A059] font-semibold text-[#0F0E0C]'
                    : isDayInCurrentMonth
                      ? 'text-[#D6CCBE]'
                      : 'text-[#8E816D]/50',
                )}
              >
                {format(day, 'd')}
              </div>
              <div className="space-y-0.5">
                {dayEvents.slice(0, 3).map((event) => {
                  const style = getEventStyle(event)
                  return (
                    <button
                      key={event.id}
                      type="button"
                      onClick={() => onEventClick?.(event)}
                      className={cn(
                        'flex w-full items-center gap-1 truncate border px-1.5 py-0.5 text-[0.6rem] leading-4 transition-colors',
                        style.pill,
                        !onEventClick && 'pointer-events-none',
                      )}
                    >
                      <span
                        className={cn(
                          'size-1.5 shrink-0 rounded-full',
                          style.dot,
                        )}
                      />
                      <span className="truncate">{event.title}</span>
                    </button>
                  )
                })}
                {dayEvents.length > 3 && (
                  <div className="px-1.5 text-[0.58rem] text-[#8E816D]">
                    +{dayEvents.length - 3} more
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {events.length === 0 && (
        <div className="py-12 text-center text-sm text-[#8E816D]">
          No events this month
        </div>
      )}
    </div>
  )
}
