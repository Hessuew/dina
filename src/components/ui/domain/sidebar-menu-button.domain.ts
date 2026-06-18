import type * as React from 'react'
import type { TooltipContent } from '@/components/ui/tooltip'

type SidebarState = 'expanded' | 'collapsed'
type TooltipContentProps = React.ComponentProps<typeof TooltipContent>

/**
 * Resolve the tooltip props for a sidebar menu button, or `null` when the
 * button should render without a tooltip wrapper.
 *
 * A string tooltip is normalized to `{ children }`. The computed `hidden`
 * value (tooltip only shows when the sidebar is collapsed on desktop) can be
 * overridden by an object tooltip's own `hidden`.
 */
export function resolveMenuButtonTooltip(
  tooltip: string | TooltipContentProps | undefined,
  sidebar: { state: SidebarState; isMobile: boolean },
): (TooltipContentProps & { hidden: boolean }) | null {
  if (!tooltip) {
    return null
  }

  const content: TooltipContentProps =
    typeof tooltip === 'string' ? { children: tooltip } : tooltip

  return {
    hidden: sidebar.state !== 'collapsed' || sidebar.isMobile,
    ...content,
  }
}
