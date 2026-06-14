import { useRouter } from '@tanstack/react-router'
import { format } from 'date-fns'
import {
  AlertTriangleIcon,
  BookOpenIcon,
  CalendarIcon,
  ClockIcon,
  GraduationCapIcon,
  HeartHandshakeIcon,
  UserIcon,
} from 'lucide-react'
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

const TYPE_CHIP: Record<string, { label: string; classes: string }> = {
  assignment: {
    label: 'Assignment',
    classes: 'border-[#C5A059]/40 bg-[#C5A059]/10 text-[#E9D9B4]',
  },
  chapel: {
    label: 'Chapel',
    classes: 'border-violet-500/30 bg-violet-950/50 text-violet-300',
  },
  exam: {
    label: 'Exam',
    classes: 'border-red-500/30 bg-red-950/50 text-red-300',
  },
  lesson: {
    label: 'Lesson',
    classes: 'border-emerald-500/30 bg-emerald-950/50 text-emerald-300',
  },
  personal: {
    label: 'Personal',
    classes: 'border-sky-500/30 bg-sky-950/50 text-sky-300',
  },
  other: {
    label: 'Other',
    classes: 'border-gray-500/30 bg-gray-950/50 text-gray-300',
  },
}

const SPECIAL_ICONS: Record<SpecialEventCategory, React.ElementType> = {
  chapel: HeartHandshakeIcon,
  exam: AlertTriangleIcon,
  personal: UserIcon,
  other: CalendarIcon,
}

function getChip(event: CalendarEvent) {
  if (event.type === 'special') {
    if (event.specialCategory) {
      return TYPE_CHIP[event.specialCategory]
    }
    return TYPE_CHIP.other
  }
  return TYPE_CHIP[event.type]
}

function useEventNavigation(
  event: CalendarEvent | null,
  currentMonth: Date | undefined,
  onClose: () => void,
) {
  const router = useRouter()
  return () => {
    if (event?.type !== 'lesson' && event?.type !== 'assignment') return
    router.navigate({
      to:
        event.type === 'lesson'
          ? '/lessons/$lessonId'
          : '/assignments/$assignmentId',
      params:
        event.type === 'lesson'
          ? { lessonId: event.id }
          : { assignmentId: event.id },
      search: {
        fromCalendar: true,
        calendarMonth: currentMonth?.toISOString(),
      } as any,
    })
    onClose()
  }
}

function EventTypeChip({ event }: { event: CalendarEvent }) {
  const chip = getChip(event)
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
  return (
    <div className="mt-4 space-y-3">
      <div className="flex items-center gap-2.5 text-sm">
        <CalendarIcon className="size-3.5 shrink-0 text-[#8E816D]" />
        <span
          className={
            isOverdue ? 'font-medium text-red-400' : 'text-[#D6CCBE]'
          }
        >
          {format(new Date(event.date), 'PPPP')}
          {isOverdue && (
            <span className="ml-2 text-[0.65rem] tracking-wider text-red-400/80 uppercase">
              Overdue
            </span>
          )}
        </span>
      </div>

      {event.type === 'lesson' && event.duration && (
        <div className="flex items-center gap-2.5 text-sm">
          <ClockIcon className="size-3.5 shrink-0 text-[#8E816D]" />
          <span className="text-[#D6CCBE]">
            {format(new Date(event.date), 'p')} · {event.duration} min
          </span>
        </div>
      )}

      {event.type === 'lesson' && (
        <div className="flex items-center gap-2.5 text-sm">
          <BookOpenIcon className="size-3.5 shrink-0 text-[#8E816D]" />
          <span className="text-[#D6CCBE]">Lesson</span>
        </div>
      )}

      {event.type === 'assignment' && event.maxGrade != null && (
        <div className="flex items-center gap-2.5 text-sm">
          <GraduationCapIcon className="size-3.5 shrink-0 text-[#8E816D]" />
          <span className="text-[#D6CCBE]">
            Max grade: {event.maxGrade} pts
          </span>
        </div>
      )}

      {event.description && (
        <div className="mt-4 border border-white/8 bg-white/4 p-3">
          <p className="line-clamp-4 text-[0.82rem] leading-relaxed text-[#AFA28F]">
            {event.description}
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

  const isOverdue =
    event.type === 'assignment' && new Date(event.date) < new Date()

  const canNavigate = event.type === 'lesson' || event.type === 'assignment'

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
