import { useDraggable, useDroppable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { Link2Off } from 'lucide-react'
import { MeetingTimeRow } from './MeetingTimeRow'
import type { DragSource, DropTarget } from '@/utils/discipleship/domain/discipleship-drop.domain'
import type { BoardStudent } from '@/utils/discipleship/domain/discipleship-board.domain'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'

type StudentCardProps = {
  student: BoardStudent
  canManage: boolean
  individualAnchor?: string | null
  onSetIndividual?: () => void
  onUnpair?: () => void
  pairDropTarget?: DropTarget
  overlay?: boolean
}

function initials(name: string): string {
  return name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export function StudentCard({
  student,
  canManage,
  individualAnchor,
  onSetIndividual,
  onUnpair,
  pairDropTarget,
  overlay = false,
}: StudentCardProps) {
  const drag = useDraggable({
    id: `drag-${student.id}`,
    data: { studentId: student.id } satisfies DragSource,
    disabled: !canManage || overlay,
  })
  const drop = useDroppable({
    id: `drop-${student.id}`,
    data: pairDropTarget,
    disabled: !pairDropTarget || overlay,
  })

  return (
    <div
      ref={(node) => {
        drag.setNodeRef(node)
        drop.setNodeRef(node)
      }}
      style={{ transform: CSS.Translate.toString(drag.transform) }}
      className={cn(
        'rounded-lg border border-black/8 bg-white/80 p-2.5 shadow-sm',
        canManage && !overlay && 'cursor-grab active:cursor-grabbing',
        drag.isDragging && 'opacity-40',
        drop.isOver && 'ring-2 ring-[#C5A059]/60',
      )}
      {...(overlay ? {} : drag.listeners)}
      {...(overlay ? {} : drag.attributes)}
    >
      <div className="flex items-center gap-2">
        <Avatar size="sm">
          <AvatarImage src={student.avatarUrl ?? undefined} />
          <AvatarFallback>{initials(student.fullName)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-[#2B2417]">
            {student.fullName}
          </p>
          <p className="truncate text-[0.7rem] text-[#8E816D]">
            {student.email}
          </p>
        </div>
        {onUnpair && canManage && (
          <Button
            size="icon-xs"
            variant="ghost"
            onClick={onUnpair}
            title="Unpair"
          >
            <Link2Off className="size-3.5" />
          </Button>
        )}
      </div>
      {individualAnchor !== undefined && onSetIndividual && (
        <div className="mt-2 border-t border-black/5 pt-2">
          <MeetingTimeRow
            label="1-on-1"
            anchorAt={individualAnchor}
            canManage={canManage}
            onSetTime={onSetIndividual}
          />
        </div>
      )}
    </div>
  )
}
