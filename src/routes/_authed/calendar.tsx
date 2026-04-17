import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import type { CalendarEvent } from '@/utils/calendar'
import facultyBackground from '@/assets/images/bg/bg_lecturers.webp'
import { CalendarView } from '@/components/view/CalendarView'
import { EventPreviewModal } from '@/components/modal/EventPreviewModal'
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
    <div
      className="relative isolate min-h-screen overflow-hidden"
      style={{
        backgroundImage: `linear-gradient(to bottom, rgba(255,255,255,0.92), rgba(255,255,255,0.92)), url(${facultyBackground})`,
        backgroundPosition: 'center',
        backgroundSize: 'cover',
      }}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(197,160,89,0.10),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.22),transparent_22%)]" />
      <div className="relative mx-auto max-w-7xl px-6 py-10 sm:px-8 sm:py-12">
        <div className="mb-10">
          <div className="flex items-end justify-between gap-6">
            <div>
              <div className="h-px w-10 bg-[#C5A059]/50" />
              <h1 className="mt-3 font-serif text-3xl tracking-[-0.02em] text-[#1C1815]">
                Calendar
              </h1>
              <p className="mt-2 text-[0.72rem] font-medium tracking-[0.22em] text-[#8E816D] uppercase">
                View all published lessons and assignments
              </p>
            </div>
            <div className="flex gap-2">
              <Select
                value={selectedType}
                onValueChange={(value) => setSelectedType(value ?? 'all')}
              >
                <SelectTrigger className="w-[150px] rounded-none border-[#1A1A1A]/12 bg-white/70 text-[#4E463D] hover:border-[#C5A059]/40">
                  <SelectValue placeholder="Event type" />
                </SelectTrigger>
                <SelectContent className="rounded-none">
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
                  <SelectTrigger className="w-[200px] rounded-none border-[#1A1A1A]/12 bg-white/70 text-[#4E463D] hover:border-[#C5A059]/40">
                    <SelectValue placeholder="Filter by course" />
                  </SelectTrigger>
                  <SelectContent className="rounded-none">
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
    </div>
  )
}
