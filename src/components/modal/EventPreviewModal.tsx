import { useRouter } from '@tanstack/react-router'
import { CalendarIcon, ClockIcon, GraduationCapIcon } from 'lucide-react'
import { format } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

type EventPreviewModalProps = {
  event: {
    id: string
    title: string
    date: Date
    type: 'lesson' | 'assignment'
    courseId: string
    courseName: string
    description?: string | null
    duration?: number | null
    maxGrade?: number | null
  } | null
  open: boolean
  onOpenChange: (open: boolean) => void
  currentMonth?: Date
}

export function EventPreviewModal({
  event,
  open,
  onOpenChange,
  currentMonth,
}: EventPreviewModalProps) {
  const router = useRouter()

  if (!event) return null

  const handleViewDetails = () => {
    const route =
      event.type === 'lesson'
        ? `/lessons/${event.id}`
        : `/assignments/${event.id}`

    router.navigate({
      to: route as '/lessons/$lessonId' | '/assignments/$assignmentId',
      params: { lessonId: event.id, assignmentId: event.id } as any,
      search: {
        fromCalendar: true,
        calendarMonth: currentMonth?.toISOString(),
      } as any,
    })
    onOpenChange(false)
  }

  const isOverdue =
    event.type === 'assignment' && new Date(event.date) < new Date()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-start justify-between gap-2 pr-4 pt-2">
            <DialogTitle className="text-xl">{event.title}</DialogTitle>
            <Badge
              className="mt-1"
              variant={event.type === 'lesson' ? 'default' : 'secondary'}
            >
              {event.type === 'lesson' ? 'Lesson' : 'Assignment'}
            </Badge>
          </div>
          <DialogDescription className="text-base">
            {event.courseName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm">
            <CalendarIcon className="size-4 text-muted-foreground" />
            <span className={isOverdue ? 'text-destructive font-medium' : ''}>
              {format(new Date(event.date), 'PPP')}
            </span>
            {isOverdue && (
              <Badge variant="destructive" className="ml-2">
                Overdue
              </Badge>
            )}
          </div>

          {event.type === 'lesson' && event.duration && (
            <div className="flex items-center gap-2 text-sm">
              <ClockIcon className="size-4 text-muted-foreground" />
              <span>
                {format(new Date(event.date), 'p')} • {event.duration} minutes
              </span>
            </div>
          )}

          {event.type === 'assignment' && event.maxGrade !== null && (
            <div className="flex items-center gap-2 text-sm">
              <GraduationCapIcon className="size-4 text-muted-foreground" />
              <span>Max Grade: {event.maxGrade} points</span>
            </div>
          )}

          {event.description && (
            <div className="rounded-lg border bg-muted/50 p-4">
              <p className="text-sm line-clamp-4">{event.description}</p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={handleViewDetails}>View Details</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
