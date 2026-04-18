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
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type CalendarEvent = {
  id: string
  title: string
  date: Date
  type: 'lesson' | 'assignment'
  courseId: string
  courseName: string
  description?: string | null
  duration?: number | null
  maxGrade?: number | null
}

type CalendarViewProps = {
  events: Array<CalendarEvent>
  onEventClick?: (event: CalendarEvent) => void
  initialDate?: Date
  onDateChange?: (date: Date) => void
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

  const getEventsForDay = (day: Date) => {
    return events.filter((event) => isSameDay(new Date(event.date), day))
  }

  const previousMonth = () => {
    const newDate = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() - 1,
    )
    setCurrentDate(newDate)
    onDateChange?.(newDate)
  }

  const nextMonth = () => {
    const newDate = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() + 1,
    )
    setCurrentDate(newDate)
    onDateChange?.(newDate)
  }

  const goToToday = () => {
    const today = new Date()
    setCurrentDate(today)
    onDateChange?.(today)
  }

  const isCurrentMonth = isSameMonth(currentDate, new Date())

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{format(currentDate, 'MMMM yyyy')}</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={previousMonth}>
              <ChevronLeftIcon className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={goToToday}
              disabled={isCurrentMonth}
            >
              <CalendarIcon className="mr-2 size-4" />
              Today
            </Button>
            <Button variant="outline" size="icon" onClick={nextMonth}>
              <ChevronRightIcon className="size-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div
              key={day}
              className="text-muted-foreground text-center text-sm font-medium"
            >
              {day}
            </div>
          ))}
          {days.map((day) => {
            const dayEvents = getEventsForDay(day)
            const isDayInCurrentMonth =
              day.getMonth() === currentDate.getMonth()
            const isToday = isSameDay(day, new Date())

            return (
              <div
                key={day.toISOString()}
                className={`min-h-24 rounded-lg border p-2 ${
                  isDayInCurrentMonth ? 'bg-card' : 'bg-muted/50'
                } ${isToday ? 'border-primary ring-1 ring-primary' : ''}`}
              >
                <div className={`mb-1 text-sm ${isToday ? 'font-bold' : ''}`}>
                  {format(day, 'd')}
                </div>
                <div className="space-y-1">
                  {dayEvents.map((event) => (
                    <div
                      key={event.id}
                      className={`truncate rounded px-1 py-0.5 text-xs ${
                        onEventClick ? 'cursor-pointer' : ''
                      }`}
                      onClick={() => onEventClick?.(event)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          onEventClick?.(event)
                        }
                      }}
                      role={onEventClick ? 'button' : undefined}
                      tabIndex={onEventClick ? 0 : undefined}
                    >
                      <Badge
                        variant={
                          event.type === 'lesson' ? 'default' : 'secondary'
                        }
                        className={`w-full justify-start text-xs ${
                          onEventClick
                            ? 'transition-opacity hover:opacity-80'
                            : ''
                        }`}
                      >
                        {event.title}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
        {events.length === 0 && (
          <div className="text-muted-foreground mt-8 text-center">
            No upcoming events
          </div>
        )}
      </CardContent>
    </Card>
  )
}
