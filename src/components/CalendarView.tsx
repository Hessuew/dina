import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
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
}

type CalendarViewProps = {
  events: Array<CalendarEvent>
}

export function CalendarView({ events }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date())

  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const calendarStart = startOfWeek(monthStart)
  const calendarEnd = endOfWeek(monthEnd)

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

  const getEventsForDay = (day: Date) => {
    return events.filter((event) => isSameDay(new Date(event.date), day))
  }

  const previousMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1),
    )
  }

  const nextMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1),
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{format(currentDate, 'MMMM yyyy')}</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={previousMonth}>
              <ChevronLeftIcon className="size-4" />
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
            const isCurrentMonth = day.getMonth() === currentDate.getMonth()
            const isToday = isSameDay(day, new Date())

            return (
              <div
                key={day.toISOString()}
                className={`min-h-24 rounded-lg border p-2 ${
                  isCurrentMonth ? 'bg-card' : 'bg-muted/50'
                } ${isToday ? 'border-primary ring-1 ring-primary' : ''}`}
              >
                <div className={`mb-1 text-sm ${isToday ? 'font-bold' : ''}`}>
                  {format(day, 'd')}
                </div>
                <div className="space-y-1">
                  {dayEvents.map((event) => (
                    <div
                      key={event.id}
                      className="truncate rounded px-1 py-0.5 text-xs"
                    >
                      <Badge
                        variant={
                          event.type === 'lesson' ? 'default' : 'secondary'
                        }
                        className="w-full justify-start text-xs"
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
