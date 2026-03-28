import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import type { CalendarEvent } from '@/utils/calendar'
import { CalendarView } from '@/components/CalendarView'
import { EventPreviewModal } from '@/components/EventPreviewModal'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getCalendarEvents } from '@/utils/calendar'

type CalendarSearch = {
  month?: string
}

export const Route = createFileRoute('/_authed/calendar')({
  validateSearch: (search: Record<string, unknown>): CalendarSearch => {
    return {
      month: search.month as string | undefined,
    }
  },
  loader: async () => {
    const data = await getCalendarEvents()
    return {
      events: data.events,
    }
  },
  component: CalendarComponent,
})

function CalendarComponent() {
  const { events } = Route.useLoaderData()
  const navigate = Route.useNavigate()
  const search = Route.useSearch()
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedCourse, setSelectedCourse] = useState<string>('all')
  const [selectedType, setSelectedType] = useState<string>('all')

  const initialDate = search.month ? new Date(search.month) : new Date()
  const [currentMonth, setCurrentMonth] = useState<Date>(initialDate)

  const courses = Array.from(
    new Map(
      events.map((e: CalendarEvent) => [
        e.courseId,
        { id: e.courseId, name: e.courseName },
      ]),
    ).values(),
  ).sort((a: { id: string; name: string }, b: { id: string; name: string }) =>
    a.name.localeCompare(b.name),
  )

  const filteredEvents = events.filter((event: CalendarEvent) => {
    const courseMatch =
      selectedCourse === 'all' || event.courseId === selectedCourse
    const typeMatch = selectedType === 'all' || event.type === selectedType
    return courseMatch && typeMatch
  })

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event)
    setModalOpen(true)
  }

  const handleDateChange = (date: Date) => {
    setCurrentMonth(date)
    navigate({
      search: { month: date.toISOString() },
      replace: true,
    })
  }

  useEffect(() => {
    if (search.month) {
      setCurrentMonth(new Date(search.month))
    }
  }, [search.month])

  return (
    <div className="mx-auto w-full max-w-7xl p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between pb-2">
          <div>
            <h1 className="text-3xl font-bold">Calendar</h1>
            <p className="text-muted-foreground mt-1">
              View all published lessons and assignments
            </p>
          </div>
          <div className="flex gap-2">
            <Select
              value={selectedType}
              onValueChange={(value) => setSelectedType(value ?? 'all')}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Event type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Events</SelectItem>
                <SelectItem value="lesson">Lessons</SelectItem>
                <SelectItem value="assignment">Assignments</SelectItem>
              </SelectContent>
            </Select>
            {courses.length > 0 && (
              <Select
                value={selectedCourse}
                onValueChange={(value) => setSelectedCourse(value ?? 'all')}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filter by course" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Courses</SelectItem>
                  {courses.map((course) => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
      </div>

      <CalendarView
        events={filteredEvents}
        onEventClick={handleEventClick}
        initialDate={currentMonth}
        onDateChange={handleDateChange}
      />

      <EventPreviewModal
        event={selectedEvent}
        open={modalOpen}
        onOpenChange={setModalOpen}
        currentMonth={currentMonth}
      />
    </div>
  )
}
