import { PlusIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

export type EmptyStateVariant = 'dark' | 'light'

interface EmptyStateProps {
  icon?: React.ElementType
  message?: string
  heading?: string
  description?: string
  actionLabel?: string
  onAction?: () => void
  showAction?: boolean
  variant?: EmptyStateVariant
  className?: string
}

export function EmptyState({
  icon: Icon,
  message,
  heading,
  description,
  actionLabel,
  onAction,
  showAction = true,
  variant = 'dark',
  className,
}: EmptyStateProps) {
  const shouldShowAction = showAction && actionLabel && onAction

  const content = (
    <div className="flex flex-col items-center justify-center text-center">
      {Icon && (
        <Icon className="mb-4 size-10 text-[#C5A059]/30" />
      )}
      {heading && (
        <h3 className="font-serif text-lg text-[#1C1815]">{heading}</h3>
      )}
      {message && <p className="text-sm text-[#AFA28F]">{message}</p>}
      {description && (
        <p className="mt-2 text-sm text-[#5E5549]">{description}</p>
      )}
      {shouldShowAction && (
        <Button
          theme={variant === 'dark' ? 'dark' : 'light'}
          className="mt-4"
          onClick={onAction}
        >
          <PlusIcon className="size-4" />
          {actionLabel}
        </Button>
      )}
    </div>
  )

  if (variant === 'light') {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center border border-dashed border-[#1A1A1A]/20 bg-[#EDE8DE]/40 p-16 text-center',
          className,
        )}
      >
        {content}
      </div>
    )
  }

  return <div className={cn('py-16', className)}>{content}</div>
}
