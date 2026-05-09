import { PencilIcon, TrashIcon } from 'lucide-react'
import type { StatusChipVariant } from '@/components/ui/status-chip'
import { Button } from '@/components/ui/button'
import { StatusChip } from '@/components/ui/status-chip'

interface EntityHeaderActionsProps {
  status: StatusChipVariant
  canEdit: boolean
  isCourseTeacher: boolean
  onEdit: () => void
  onDelete: () => void
}

export function EntityHeaderActions({
  status,
  canEdit,
  isCourseTeacher,
  onEdit,
  onDelete,
}: EntityHeaderActionsProps) {
  if (!canEdit || !isCourseTeacher) {
    return null
  }

  return (
    <>
      <StatusChip variant={status} size="md" />
      <Button
        variant="ghost"
        theme="light"
        size="icon"
        className="size-8 border border-[#1A1A1A]/12 bg-white/60 text-[#5E5549] hover:border-[#C5A059]/40 hover:text-[#9B7A41]"
        onClick={onEdit}
      >
        <PencilIcon className="size-3.5" />
      </Button>
      <Button
        variant="ghost"
        theme="light"
        size="icon"
        className="size-8 border border-[#1A1A1A]/12 bg-white/60 text-[#5E5549] hover:border-red-300 hover:text-red-600"
        onClick={onDelete}
      >
        <TrashIcon className="size-3.5" />
      </Button>
    </>
  )
}
