import { format } from 'date-fns'
import { Clock } from 'lucide-react'
import { nextOccurrenceFrom } from '@/utils/discipleship/domain/discipleship-schedule.domain'
import { Button } from '@/components/ui/button'

type MeetingTimeRowProps = {
  label: string
  anchorAt: string | null
  canManage: boolean
  onSetTime: () => void
}

export function MeetingTimeRow({
  label,
  anchorAt,
  canManage,
  onSetTime,
}: MeetingTimeRowProps) {
  const next = nextOccurrenceFrom(anchorAt, new Date())
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-1.5 text-[0.72rem] text-[#6B5E4C]">
        <Clock className="size-3" />
        <span className="font-medium">{label}:</span>
        <span>{next ? format(next, 'MMM d · HH:mm') : 'Not scheduled'}</span>
      </div>
      {canManage && (
        <Button size="xs" variant="ghost" onClick={onSetTime}>
          {anchorAt ? 'Edit' : 'Set'}
        </Button>
      )}
    </div>
  )
}
