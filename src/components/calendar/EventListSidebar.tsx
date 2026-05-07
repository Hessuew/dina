import { format } from 'date-fns'
import { CalendarDaysIcon } from 'lucide-react'
import type { CalendarEvent } from '@/utils/calendar'

type EventListSidebarProps = {
  title: string
  events: Array<CalendarEvent>
  emptyMessage: string
  renderBadge: (event: CalendarEvent) => React.ReactNode
  onEventClick: (event: CalendarEvent) => void
}

export function EventListSidebar({
  title,
  events,
  emptyMessage,
  renderBadge,
  onEventClick,
}: EventListSidebarProps) {
  return (
    <div className="border border-white/10 bg-[#151515]/88 shadow-[0_22px_44px_-28px_rgba(0,0,0,0.6)]">
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3.5">
        <CalendarDaysIcon className="size-3.5 text-[#C5A059]" />
        <span className="text-[0.65rem] font-medium tracking-[0.22em] text-[#8E816D] uppercase">
          {title}
        </span>
      </div>
      {events.length === 0 ? (
        <div className="px-4 py-8 text-center text-[0.78rem] text-[#8E816D]">
          {emptyMessage}
        </div>
      ) : (
        <div className="divide-y divide-white/6">
          {events.map((event: CalendarEvent) => (
            <button
              key={event.id}
              type="button"
              onClick={() => onEventClick(event)}
              className="w-full px-4 py-3.5 text-left transition-colors hover:bg-white/4"
            >
              <div className="mb-1.5 flex items-center gap-1.5">
                {renderBadge(event)}
              </div>
              <div className="truncate text-[0.82rem] font-medium text-[#F8F4EC]">
                {event.title}
              </div>
              <div className="mt-0.5 text-[0.68rem] text-[#8E816D]">
                {format(new Date(event.date), 'MMM d, yyyy')}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
