import { cn } from '@/lib/utils'

export type EmptyStateVariant = 'dark' | 'light'

export interface EmptyStateChromeInput {
  showAction: boolean
  actionLabel?: string
  hasAction: boolean
  variant: EmptyStateVariant
  className?: string
}

export interface EmptyStateChrome {
  shouldShowAction: boolean
  buttonTheme: EmptyStateVariant
  wrapperClassName: string
}

/**
 * Derive the empty-state shell chrome: whether the action button renders, the
 * button theme, and the wrapper className. Both variants render the same
 * `<div className={wrapperClassName}>{content}</div>` shape — only the box
 * styling differs, so the component shell no longer branches on variant.
 */
export function getEmptyStateChrome({
  showAction,
  actionLabel,
  hasAction,
  variant,
  className,
}: EmptyStateChromeInput): EmptyStateChrome {
  const shouldShowAction = Boolean(showAction && actionLabel && hasAction)
  const wrapperClassName =
    variant === 'light'
      ? cn(
          'flex flex-col items-center justify-center border border-dashed border-[#1A1A1A]/20 bg-[#EDE8DE]/40 p-16 text-center',
          className,
        )
      : cn('py-16', className)

  return { shouldShowAction, buttonTheme: variant, wrapperClassName }
}

export interface EmptyStateTextRow {
  key: 'heading' | 'message' | 'description'
  text: string
  element: 'h3' | 'p'
  className: string
}

export interface EmptyStateTextInput {
  heading?: string
  message?: string
  description?: string
}

/**
 * Build the present text rows (heading, message, description) so the shell can
 * render them with a single branchless map instead of three `&&` guards. Empty
 * or missing values are omitted; order is heading → message → description.
 */
export function buildEmptyStateTextRows({
  heading,
  message,
  description,
}: EmptyStateTextInput): Array<EmptyStateTextRow> {
  const rows: Array<EmptyStateTextRow> = []

  if (heading) {
    rows.push({
      key: 'heading',
      text: heading,
      element: 'h3',
      className: 'font-serif text-lg text-[#1C1815]',
    })
  }
  if (message) {
    rows.push({
      key: 'message',
      text: message,
      element: 'p',
      className: 'text-sm text-[#AFA28F]',
    })
  }
  if (description) {
    rows.push({
      key: 'description',
      text: description,
      element: 'p',
      className: 'mt-2 text-sm text-[#5E5549]',
    })
  }

  return rows
}
