import { createFileRoute } from '@tanstack/react-router'
import {
  AlertTriangleIcon,
  CalendarDaysIcon,
  HeartHandshakeIcon,
  UserIcon,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import type {
  CalendarCourse,
  CalendarEvent,
  SpecialEventCategory,
} from '@/utils/calendar'
import {
  deriveCalendarCourses,
  deriveUpcomingEvents,
  deriveUpcomingSpecials,
  filterCalendarEvents,
  getCalendarEvents,
  parseCalendarMonth,
} from '@/utils/calendar'
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

type CalendarSearch = {
  month?: string
}

export const Route = createFileRoute('/_authed/calendar')({
  validateSearch: (search: Record<string, unknown>): CalendarSearch => {
    return {
      month: typeof search.month === 'string' ? search.month : undefined,
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

const TYPE_LABELS: Record<string, string> = {
  all: 'All Events',
  assignment: 'Assignments',
  lesson: 'Lessons',
  special: 'Special',
}

type CalendarFilterProps = {
  selectedType: string
  setSelectedType: (value: string) => void
  selectedCourse: string
  setSelectedCourse: (value: string) => void
  courses: Array<CalendarCourse>
}

function CalendarTypeFilter({
  selectedType,
  setSelectedType,
}: Pick<CalendarFilterProps, 'selectedType' | 'setSelectedType'>) {
  return (
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
  )
}

function CalendarCourseFilter({
  selectedCourse,
  setSelectedCourse,
  courses,
}: Pick<
  CalendarFilterProps,
  'selectedCourse' | 'setSelectedCourse' | 'courses'
>) {
  return (
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
          <SelectItem className="text-black" key={course.id} value={course.id}>
            {course.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function CalendarPageHeader(props: CalendarFilterProps) {
  return (
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
        <div className="flex gap-2">
          <CalendarTypeFilter
            selectedType={props.selectedType}
            setSelectedType={props.setSelectedType}
          />
          {props.courses.length > 0 && (
            <CalendarCourseFilter
              selectedCourse={props.selectedCourse}
              setSelectedCourse={props.setSelectedCourse}
              courses={props.courses}
            />
          )}
        </div>
      </div>
    </div>
  )
}

function SpecialEventBadge({ event }: { event: CalendarEvent }) {
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
}

function CalendarEventSidebar({
  upcomingSpecials,
  upcomingEvents,
  onEventClick,
}: {
  upcomingSpecials: Array<CalendarEvent>
  upcomingEvents: Array<CalendarEvent>
  onEventClick: (event: CalendarEvent) => void
}) {
  return (
    <div className="order-1 w-full sm:order-2 sm:w-64 sm:shrink-0">
      <div className="flex flex-col gap-4">
        <EventListSidebar
          title="Special Events"
          events={upcomingSpecials}
          emptyMessage="No upcoming special events"
          onEventClick={onEventClick}
          renderBadge={(event: CalendarEvent) => (
            <SpecialEventBadge event={event} />
          )}
        />
        <EventListSidebar
          title="Upcoming"
          events={upcomingEvents}
          emptyMessage="No upcoming events"
          onEventClick={onEventClick}
          renderBadge={(event: CalendarEvent) => (
            <span className="text-[0.58rem] font-medium tracking-[0.14em] text-[#C5A059] uppercase">
              {event.type}
            </span>
          )}
        />
      </div>
    </div>
  )
}

function useCalendarPage() {
  const { events } = Route.useLoaderData()
  const navigate = Route.useNavigate()
  const search = Route.useSearch()
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedCourse, setSelectedCourse] = useState<string>('all')
  const [selectedType, setSelectedType] = useState<string>('all')
  const [currentMonth, setCurrentMonth] = useState<Date>(() =>
    parseCalendarMonth(search.month),
  )

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
    setCurrentMonth(parseCalendarMonth(search.month))
  }, [search.month])

  return {
    selectedEvent,
    modalOpen,
    setModalOpen,
    selectedCourse,
    setSelectedCourse,
    selectedType,
    setSelectedType,
    currentMonth,
    courses: deriveCalendarCourses(events),
    filteredEvents: filterCalendarEvents(events, selectedCourse, selectedType),
    upcomingSpecials: deriveUpcomingSpecials(events),
    upcomingEvents: deriveUpcomingEvents(events),
    handleEventClick,
    handleDateChange,
  }
}

function CalendarComponent() {
  const page = useCalendarPage()

  return (
    <PageLayout>
      <CalendarPageHeader
        selectedType={page.selectedType}
        setSelectedType={page.setSelectedType}
        selectedCourse={page.selectedCourse}
        setSelectedCourse={page.setSelectedCourse}
        courses={page.courses}
      />

      <div className="flex flex-col gap-6 sm:flex-row">
        <CalendarEventSidebar
          upcomingSpecials={page.upcomingSpecials}
          upcomingEvents={page.upcomingEvents}
          onEventClick={page.handleEventClick}
        />

        <div className="order-2 min-w-0 flex-1 sm:order-1">
          <CalendarView
            events={page.filteredEvents}
            onEventClick={page.handleEventClick}
            initialDate={page.currentMonth}
            onDateChange={page.handleDateChange}
          />
        </div>
      </div>

      <EventPreviewModal
        event={page.selectedEvent}
        open={page.modalOpen}
        onOpenChange={page.setModalOpen}
        currentMonth={page.currentMonth}
      />
    </PageLayout>
  )
}
