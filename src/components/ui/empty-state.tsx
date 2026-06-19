import { createElement } from 'react'
import { PlusIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  buildEmptyStateTextRows,
  getEmptyStateChrome,
  type EmptyStateVariant,
} from '@/components/ui/domain/empty-state.domain'

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
  const { shouldShowAction, buttonTheme, wrapperClassName } = getEmptyStateChrome({
    showAction,
    actionLabel,
    hasAction: Boolean(onAction),
    variant,
    className,
  })

  const textRows = buildEmptyStateTextRows({ heading, message, description })

  const content = (
    <div className="flex flex-col items-center justify-center text-center">
      {Icon && <Icon className="mb-4 size-10 text-[#C5A059]/30" />}
      {textRows.map(({ key, text, element, className: rowClassName }) =>
        createElement(element, { key, className: rowClassName }, text),
      )}
      {shouldShowAction && (
        <Button theme={buttonTheme} className="mt-4" onClick={onAction}>
          <PlusIcon className="size-4" />
          {actionLabel}
        </Button>
      )}
    </div>
  )

  return <div className={wrapperClassName}>{content}</div>
}
