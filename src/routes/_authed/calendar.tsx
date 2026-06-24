import { createFileRoute } from '@tanstack/react-router'
import { isAfter } from 'date-fns'
import {
  AlertTriangleIcon,
  CalendarDaysIcon,
  HeartHandshakeIcon,
  UserIcon,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import type { CalendarEvent, SpecialEventCategory } from '@/utils/calendar'
import { CalendarView } from '@/components/view/calendar-view/CalendarView'
import { EventPreviewModal } from '@/components/dialog/event-preview-modal/EventPreviewModal'
import { EventListSidebar } from '@/components/calendar/EventListSidebar'
import { PageLayout } from '@/components/layout/page-layout'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
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
    return { events: data.events }
  },
  component: CalendarComponent,
})

const SPECIAL_ICON: Record<SpecialEventCategory, React.ElementType> = {
  chapel: HeartHandshakeIcon,
  exam: AlertTriangleIcon,
  personal: UserIcon,
  other: CalendarDaysIcon,
}

const SPECIAL_STYLES: Record<
  SpecialEventCategory,
  { dot: string; label: string; chip: string }
> = {
  chapel: {
    chip: 'border-violet-500/30 bg-violet-950/40 text-violet-300',
    dot: 'bg-violet-400',
    label: 'Chapel',
  },
  exam: {
    chip: 'border-red-500/30 bg-red-950/40 text-red-300',
    dot: 'bg-red-400',
    label: 'Exam',
  },
  personal: {
    chip: 'border-sky-500/30 bg-sky-950/40 text-sky-300',
    dot: 'bg-sky-400',
    label: 'Personal',
  },
  other: {
    chip: 'border-gray-500/30 bg-gray-950/40 text-gray-300',
    dot: 'bg-gray-400',
    label: 'Other',
  },
}

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
      events
        .filter((e: CalendarEvent) => e.courseId)
        .map((e: CalendarEvent) => [
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

  const upcomingSpecials = events
    .filter(
      (e: CalendarEvent) =>
        e.type === 'special' && isAfter(new Date(e.date), new Date()),
    )
    .slice(0, 3)

  const upcomingEvents = events
    .filter((e: CalendarEvent) => isAfter(new Date(e.date), new Date()))
    .slice(0, 5)

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event)
    setModalOpen(true)
  }

  const handleDateChange = (date: Date) => {
    setCurrentMonth(date)
    navigate({
      search: { month: date.toISOString() },
      replace: true,
      resetScroll: false,
    })
  }

  useEffect(() => {
    if (search.month) {
      setCurrentMonth(new Date(search.month))
    }
  }, [search.month])

  const TYPE_LABELS: Record<string, string> = {
    all: 'All Events',
    assignment: 'Assignments',
    lesson: 'Lessons',
    special: 'Special',
  }

  return (
    <PageLayout>
      {/* Page header */}
      <div className="mb-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="h-px w-10 bg-[#C5A059]/50" />
            <h1 className="mt-3 font-serif text-3xl tracking-[-0.02em] text-[#1C1815]">
              Calendar
            </h1>
            <p className="mt-2 text-[0.72rem] font-medium tracking-[0.22em] text-[#8E816D] uppercase">
              Lessons, assignments &amp; special events
            </p>
          </div>
          {/* Filters */}
          <div className="flex gap-2">
            <Select
              value={selectedType}
              onValueChange={(value) => setSelectedType(value ?? 'all')}
            >
              <SelectTrigger className="w-[148px] rounded-none border-[#1A1A1A]/12 bg-white/70 text-[#4E463D] hover:border-[#C5A059]/40">
                <SelectValue>{TYPE_LABELS[selectedType]}</SelectValue>
              </SelectTrigger>
              <SelectContent className="rounded-none">
                <SelectItem textClass="text-black" value="all">
                  All Events
                </SelectItem>
                <SelectItem textClass="text-black" value="lesson">
                  Lessons
                </SelectItem>
                <SelectItem textClass="text-black" value="assignment">
                  Assignments
                </SelectItem>
                <SelectItem textClass="text-black" value="special">
                  Special
                </SelectItem>
              </SelectContent>
            </Select>
            {courses.length > 0 && (
              <Select
                value={selectedCourse}
                onValueChange={(value) => setSelectedCourse(value ?? 'all')}
              >
                <SelectTrigger className="w-[200px] rounded-none border-[#1A1A1A]/12 bg-white/70 text-[#4E463D] hover:border-[#C5A059]/40">
                  <SelectValue>
                    {selectedCourse === 'all'
                      ? 'All Courses'
                      : courses.find((c) => c.id === selectedCourse)?.name ||
                        'All Courses'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="rounded-none">
                  <SelectItem textClass="text-black" value="all">
                    All Courses
                  </SelectItem>
                  {courses.map((course) => (
                    <SelectItem
                      className="text-black"
                      key={course.id}
                      value={course.id}
                    >
                      {course.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="flex flex-col gap-6 sm:flex-row">
        {/* Sidebar — shows first on sm */}
        <div className="order-1 w-full sm:order-2 sm:w-64 sm:shrink-0">
          <div className="flex flex-col gap-4">
            {/* Upcoming special events */}
            <EventListSidebar
              title="Special Events"
              events={upcomingSpecials}
              emptyMessage="No upcoming special events"
              onEventClick={handleEventClick}
              renderBadge={(event: CalendarEvent) => {
                const cat = event.specialCategory || 'other'
                const s = SPECIAL_STYLES[cat]
                const Icon = SPECIAL_ICON[cat]
                return (
                  <>
                    <span className={cn('size-1.5 rounded-full', s.dot)} />
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 border px-1.5 py-0.5 text-[0.58rem] font-medium tracking-[0.14em] uppercase',
                        s.chip,
                      )}
                    >
                      <Icon className="size-2.5" />
                      {s.label}
                    </span>
                  </>
                )
              }}
            />

            {/* Upcoming events */}
            <EventListSidebar
              title="Upcoming"
              events={upcomingEvents}
              emptyMessage="No upcoming events"
              onEventClick={handleEventClick}
              renderBadge={(event: CalendarEvent) => (
                <span className="text-[0.58rem] font-medium tracking-[0.14em] text-[#C5A059] uppercase">
                  {event.type}
                </span>
              )}
            />
          </div>
        </div>

        {/* Calendar — takes all remaining width, shows second on sm */}
        <div className="order-2 min-w-0 flex-1 sm:order-1">
          <CalendarView
            events={filteredEvents}
            onEventClick={handleEventClick}
            initialDate={currentMonth}
            onDateChange={handleDateChange}
          />
        </div>
      </div>

      <EventPreviewModal
        event={selectedEvent}
        open={modalOpen}
        onOpenChange={setModalOpen}
        currentMonth={currentMonth}
      />
    </PageLayout>
  )
}
