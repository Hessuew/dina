import { useRouter } from '@tanstack/react-router'
import {
  AlertTriangleIcon,
  BookOpenIcon,
  CalendarIcon,
  ClockIcon,
  GraduationCapIcon,
  HeartHandshakeIcon,
  UserIcon,
} from 'lucide-react'
import {
  buildEventDetailsViewModel,
  buildEventNavigation,
  canNavigateToEvent,
  getEventChip,
  isEventOverdue,
} from './domain/event-preview-modal.domain'
import type { EventDetailIconKey } from './domain/event-preview-modal.domain'
import type {
  CalendarEvent,
  SpecialEventCategory,
} from '@/utils/calendar/calendar'
import facultyBackground from '@/assets/images/bg/bg_lecturers.webp'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

type EventPreviewModalProps = {
  event: CalendarEvent | null
  open: boolean
  onOpenChange: (open: boolean) => void
  currentMonth?: Date
}

const SPECIAL_ICONS: Record<SpecialEventCategory, React.ElementType> = {
  chapel: HeartHandshakeIcon,
  exam: AlertTriangleIcon,
  personal: UserIcon,
  other: CalendarIcon,
}

const ROW_ICONS: Record<EventDetailIconKey, React.ElementType> = {
  clock: ClockIcon,
  book: BookOpenIcon,
  graduation: GraduationCapIcon,
}

function useEventNavigation(
  event: CalendarEvent | null,
  currentMonth: Date | undefined,
  onClose: () => void,
) {
  const router = useRouter()
  return () => {
    const nav = buildEventNavigation(event, currentMonth)
    if (!nav) return
    router.navigate(nav)
    onClose()
  }
}

function EventTypeChip({ event }: { event: CalendarEvent }) {
  const chip = getEventChip(event)
  const SpecialIcon =
    event.type === 'special' && event.specialCategory
      ? SPECIAL_ICONS[event.specialCategory]
      : null
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 border px-2 py-0.5 text-[0.62rem] font-medium tracking-[0.15em] uppercase',
        chip.classes,
      )}
    >
      {SpecialIcon && <SpecialIcon className="size-2.5" />}
      {chip.label}
    </span>
  )
}

function EventDetailsSection({
  event,
  isOverdue,
}: {
  event: CalendarEvent
  isOverdue: boolean
}) {
  const vm = buildEventDetailsViewModel(event, isOverdue)
  return (
    <div className="mt-4 space-y-3">
      <div className="flex items-center gap-2.5 text-sm">
        <CalendarIcon className="size-3.5 shrink-0 text-[#8E816D]" />
        <span
          className={
            vm.isOverdue ? 'font-medium text-red-400' : 'text-[#D6CCBE]'
          }
        >
          {vm.dateLabel}
          {vm.isOverdue && (
            <span className="ml-2 text-[0.65rem] tracking-wider text-red-400/80 uppercase">
              Overdue
            </span>
          )}
        </span>
      </div>

      {vm.rows.map((row) => {
        const Icon = ROW_ICONS[row.iconKey]
        return (
          <div key={row.iconKey} className="flex items-center gap-2.5 text-sm">
            <Icon className="size-3.5 shrink-0 text-[#8E816D]" />
            <span className="text-[#D6CCBE]">{row.text}</span>
          </div>
        )
      })}

      {vm.description && (
        <div className="mt-4 border border-white/8 bg-white/4 p-3">
          <p className="line-clamp-4 text-[0.82rem] leading-relaxed text-[#AFA28F]">
            {vm.description}
          </p>
        </div>
      )}
    </div>
  )
}

export function EventPreviewModal({
  event,
  open,
  onOpenChange,
  currentMonth,
}: EventPreviewModalProps) {
  const handleViewDetails = useEventNavigation(event, currentMonth, () =>
    onOpenChange(false),
  )

  if (!event) return null

  const isOverdue = isEventOverdue(event)

  const canNavigate = canNavigateToEvent(event)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="rounded-none border border-white/10 text-[#F8F4EC] shadow-[0_42px_100px_-52px_rgba(0,0,0,0.82)] sm:max-w-md"
        style={{
          backgroundImage: `linear-gradient(180deg, rgba(10,10,11,0.9), rgba(16,16,17,0.95)), url(${facultyBackground})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
        showCloseButton={false}
      >
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.04),transparent_38%,rgba(197,160,89,0.08)_100%)]" />
        <div className="relative flex min-h-0 flex-1 flex-col">
          <DialogHeader>
            <div className="mb-1 flex items-center justify-between">
              <div>
                <div className="h-px w-8 bg-[#C5A059]/40" />
                <div className="mt-2 text-[0.68rem] font-medium tracking-[0.3em] text-[#8E816D] uppercase">
                  Event details
                </div>
              </div>
              <EventTypeChip event={event} />
            </div>
            <DialogTitle className="font-serif text-xl tracking-[-0.02em] text-[#F8F4EC]">
              {event.title}
            </DialogTitle>
            {event.courseName && (
              <p className="text-[0.78rem] text-[#AFA28F]">
                {event.courseName}
              </p>
            )}
          </DialogHeader>

          <DialogBody>
            <EventDetailsSection event={event} isOverdue={isOverdue} />
          </DialogBody>

          <DialogFooter className="mt-6 rounded-none border-t border-white/8 bg-white/3 pt-6">
            <Button
              variant="outline"
              theme="dark"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
            {canNavigate && (
              <Button
                variant="default"
                theme="dark"
                className="rounded-none"
                onClick={handleViewDetails}
              >
                View Details
              </Button>
            )}
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
