import { format, isSameMonth } from 'date-fns'
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import { useState } from 'react'
import { buildCalendarDayCell, buildCalendarDays } from './calendar-view.domain'
import type { CalendarEvent } from '@/utils/calendar/calendar'
import { Button } from '@/components/ui/button'

type CalendarViewProps = {
  events: Array<CalendarEvent>
  onEventClick?: (event: CalendarEvent) => void
  initialDate?: Date
  onDateChange?: (date: Date) => void
}

type CalendarHeaderProps = {
  currentDate: Date
  isCurrentMonth: boolean
  onPrevious: () => void
  onNext: () => void
  onToday: () => void
}

function CalendarHeader({
  currentDate,
  isCurrentMonth,
  onPrevious,
  onNext,
  onToday,
}: CalendarHeaderProps) {
  return (
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
          onClick={onPrevious}
        >
          <ChevronLeftIcon className="size-3.5" />
        </Button>
        <Button
          variant="ghost"
          theme="dark"
          size="sm"
          className="h-8 gap-1.5 text-[0.72rem] tracking-[0.12em] uppercase"
          onClick={onToday}
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
          onClick={onNext}
        >
          <ChevronRightIcon className="size-3.5" />
        </Button>
      </div>
    </div>
  )
}

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function CalendarWeekdayHeader() {
  return (
    <div className="grid grid-cols-7 border-b border-white/8">
      {WEEKDAY_LABELS.map((day) => (
        <div
          key={day}
          className="py-2.5 text-center text-[0.62rem] font-medium tracking-[0.2em] text-[#8E816D] uppercase"
        >
          {day}
        </div>
      ))}
    </div>
  )
}

type CalendarDayCellViewProps = {
  day: Date
  index: number
  totalDays: number
  currentDate: Date
  events: Array<CalendarEvent>
  onEventClick?: (event: CalendarEvent) => void
}

function CalendarDayCellView({
  day,
  index,
  totalDays,
  currentDate,
  events,
  onEventClick,
}: CalendarDayCellViewProps) {
  const cell = buildCalendarDayCell({
    day,
    index,
    totalDays,
    currentDate,
    events,
    hasEventClick: Boolean(onEventClick),
  })

  return (
    <div className={cell.cellClassName}>
      <div className={cell.dayNumberClassName}>{format(day, 'd')}</div>
      <div className="space-y-0.5">
        {cell.visibleEvents.map(({ event, dotClassName, pillClassName }) => (
          <button
            key={event.id}
            type="button"
            onClick={() => onEventClick?.(event)}
            className={pillClassName}
          >
            <span className={dotClassName} />
            <span className="truncate">{event.title}</span>
          </button>
        ))}
        {cell.overflowCount > 0 && (
          <div className="px-1.5 text-[0.58rem] text-[#8E816D]">
            +{cell.overflowCount} more
          </div>
        )}
      </div>
    </div>
  )
}

type CalendarDayGridProps = {
  days: Array<Date>
  currentDate: Date
  events: Array<CalendarEvent>
  onEventClick?: (event: CalendarEvent) => void
}

function CalendarDayGrid({
  days,
  currentDate,
  events,
  onEventClick,
}: CalendarDayGridProps) {
  return (
    <div className="grid grid-cols-7 divide-x divide-white/6">
      {days.map((day, idx) => (
        <CalendarDayCellView
          key={day.toISOString()}
          day={day}
          index={idx}
          totalDays={days.length}
          currentDate={currentDate}
          events={events}
          onEventClick={onEventClick}
        />
      ))}
    </div>
  )
}

export function CalendarView({
  events,
  onEventClick,
  initialDate,
  onDateChange,
}: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(initialDate ?? new Date())

  const days = buildCalendarDays(currentDate)

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
      <CalendarHeader
        currentDate={currentDate}
        isCurrentMonth={isCurrentMonth}
        onPrevious={previousMonth}
        onNext={nextMonth}
        onToday={goToToday}
      />
      <CalendarWeekdayHeader />
      <CalendarDayGrid
        days={days}
        currentDate={currentDate}
        events={events}
        onEventClick={onEventClick}
      />
      {events.length === 0 && (
        <div className="py-12 text-center text-sm text-[#8E816D]">
          No events this month
        </div>
      )}
    </div>
  )
}
