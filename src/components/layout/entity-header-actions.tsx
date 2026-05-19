import { PencilIcon, Trash2Icon, TrashIcon } from 'lucide-react'
import type { StatusChipVariant } from '@/components/ui/status-chip'
import { Button } from '@/components/ui/button'
import { StatusChip } from '@/components/ui/status-chip'
import { cn } from '@/lib/utils'

interface EntityActionButtonProps {
  onClick: () => void
  theme?: 'light' | 'dark' | 'lightGhost'
  size?: 'sm' | 'md' | 'lg'
  className?: string
  children?: React.ReactNode
}

const sizeClasses = {
  sm: 'size-6',
  md: 'size-8',
  lg: 'size-7',
}

const iconSizeClasses = {
  sm: 'size-2.5',
  md: 'size-3.5',
  lg: 'size-3',
}

function getEditButtonClasses(
  theme: 'light' | 'dark' | 'lightGhost',
  size: 'sm' | 'md' | 'lg',
) {
  return cn(
    sizeClasses[size],
    theme === 'light' &&
      'border border-[#1A1A1A]/12 bg-white/60 text-[#5E5549] hover:border-[#C5A059]/40 hover:text-[#9B7A41]',
    theme === 'dark' &&
      'border border-white/10 bg-black/60 text-[#8E816D] hover:border-[#C5A059]/40 hover:text-[#D4B373]',
    theme === 'lightGhost' &&
      'rounded-none border-none bg-transparent text-[#8E816D] shadow-none hover:translate-y-0 hover:bg-black/5 hover:text-[#1C1815]',
  )
}

function getDeleteButtonClasses(
  theme: 'light' | 'dark' | 'lightGhost',
  size: 'sm' | 'md' | 'lg',
) {
  return cn(
    sizeClasses[size],
    theme === 'light' &&
      'border border-[#1A1A1A]/12 bg-white/60 text-[#5E5549] hover:border-red-300 hover:text-red-600',
    theme === 'dark' &&
      'border border-white/10 bg-black/60 text-[#8E816D] hover:border-red-400/50 hover:text-red-400',
    theme === 'lightGhost' &&
      'rounded-none border-none bg-transparent text-[#8E816D] shadow-none hover:translate-y-0 hover:bg-black/5 hover:text-red-600',
  )
}

export function EditActionButton({
  onClick,
  theme = 'light',
  size = 'md',
  className,
  children,
}: EntityActionButtonProps) {
  return (
    <Button
      variant="ghost"
      theme={theme === 'lightGhost' ? 'lightGhost' : theme}
      size="icon"
      className={cn(getEditButtonClasses(theme, size), className)}
      onClick={onClick}
    >
      {children || <PencilIcon className={iconSizeClasses[size]} />}
    </Button>
  )
}

export function DeleteActionButton({
  onClick,
  theme = 'light',
  size = 'md',
  className,
  children,
}: EntityActionButtonProps) {
  return (
    <Button
      variant="ghost"
      theme={theme === 'lightGhost' ? 'lightGhost' : theme}
      size="icon"
      className={cn(getDeleteButtonClasses(theme, size), className)}
      onClick={onClick}
    >
      {children || <TrashIcon className={iconSizeClasses[size]} />}
    </Button>
  )
}

export function DeleteActionButton2({
  onClick,
  theme = 'light',
  size = 'md',
  className,
  children,
}: EntityActionButtonProps) {
  return (
    <Button
      variant="ghost"
      theme={theme === 'lightGhost' ? 'lightGhost' : theme}
      size="icon"
      className={cn(getDeleteButtonClasses(theme, size), className)}
      onClick={onClick}
    >
      {children || <Trash2Icon className={iconSizeClasses[size]} />}
    </Button>
  )
}

interface EntityHeaderActionsProps {
  status: StatusChipVariant
  canEdit: boolean
  isCourseTeacher: boolean
  onEdit: () => void
  onDelete: () => void
  showStatus?: boolean
  theme?: 'light' | 'dark' | 'lightGhost'
  size?: 'sm' | 'md' | 'lg'
  canShowActions?: boolean
}

export function EntityHeaderActions({
  status,
  canEdit,
  isCourseTeacher,
  onEdit,
  onDelete,
  showStatus = true,
  theme = 'light',
  size = 'md',
  canShowActions,
}: EntityHeaderActionsProps) {
  if (!canShowActions && (!canEdit || !isCourseTeacher)) {
    return null
  }

  return (
    <>
      {showStatus && <StatusChip variant={status} size="md" />}
      <EditActionButton onClick={onEdit} theme={theme} size={size} />
      <DeleteActionButton onClick={onDelete} theme={theme} size={size} />
    </>
  )
}
