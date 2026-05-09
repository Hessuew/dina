import type { ComponentType } from 'react'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

type IconButtonProps = {
  icon: ComponentType<{ className?: string }>
  label: string
  onClick: () => void
  disabled?: boolean
  className?: string
}

/*
  IconButton: Reusable icon button with tooltip

  Usage:
    - Wrap multiple IconButtons in a single TooltipProvider for efficiency
    - TooltipProvider should be at the parent level, not per button

  Example:
    <TooltipProvider delay={200}>
      <div className="flex gap-1">
        <IconButton icon={EyeIcon} label="View" onClick={handleView} />
        <IconButton icon={EditIcon} label="Edit" onClick={handleEdit} />
      </div>
    </TooltipProvider>

  Note: createButtonColumn already includes TooltipProvider
*/
export function IconButton({
  icon: Icon,
  label,
  onClick,
  disabled = false,
  className,
}: IconButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger>
        <Button
          size="icon"
          theme="dark"
          className={`size-8 rounded-none border-none bg-transparent hover:bg-white/5 ${className || ''}`}
          onClick={onClick}
          disabled={disabled}
        >
          <Icon className="size-3.5" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}
