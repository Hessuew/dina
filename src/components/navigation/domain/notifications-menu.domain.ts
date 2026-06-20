import { cn } from '@/lib/utils'

export type NotificationTriggerViewModel = {
  showBadge: boolean
  buttonClassName: string
  iconClassName: string
  badgeClassName: string
}

export function buildNotificationTriggerViewModel(
  isDark: boolean,
  isCollapsed: boolean,
  shouldAnimate: boolean,
): NotificationTriggerViewModel {
  return {
    showBadge: shouldAnimate,
    buttonClassName: cn(
      'h-10 rounded-none transition-all',
      isDark
        ? 'border-l-2 border-transparent text-[#AFA28F] hover:border-[#C5A059]/30 hover:bg-[#1A1716]/60 hover:text-[#F8F4EC] data-[state=open]:border-[#C5A059]/60 data-[state=open]:bg-[#1A1716] data-[state=open]:text-[#F8F4EC]'
        : 'border-l-2 border-transparent text-[#4E463D] hover:border-[#9B7A41]/30 hover:bg-[#EDE8DE]/60 hover:text-[#1C1815] data-[state=open]:border-[#9B7A41]/60 data-[state=open]:bg-[#EDE8DE] data-[state=open]:text-[#1C1815]',
    ),
    iconClassName: cn(
      'shrink-0',
      shouldAnimate
        ? 'text-destructive'
        : isDark
          ? 'text-[#C5A059]'
          : 'text-[#9B7A41]',
    ),
    badgeClassName: cn(
      'animate-in fade-in pointer-events-none absolute flex size-5 items-center justify-center rounded-none px-1.5 text-xs font-medium tabular-nums duration-1000',
      isCollapsed ? 'hidden' : 'right-2',
      isDark ? 'bg-destructive text-[#E9D9B4]' : 'bg-destructive text-[#9B7A41]',
    ),
  }
}

export type NotificationMenuHeaderViewModel = {
  subtitleText: string
  markAllDisabled: boolean
  eyebrowClassName: string
  subtitleClassName: string
  markAllButtonClassName: string
  dividerClassName: string
}

export function buildNotificationMenuHeaderViewModel(
  isDark: boolean,
  shouldAnimate: boolean,
  unreadGroupCount: number,
): NotificationMenuHeaderViewModel {
  return {
    subtitleText: shouldAnimate ? `${unreadGroupCount} unread` : 'All caught up',
    markAllDisabled: !shouldAnimate,
    eyebrowClassName: cn(
      'text-[0.68rem] font-medium tracking-[0.24em] uppercase',
      isDark ? 'text-[#C5A059]' : 'text-[#9B7A41]',
    ),
    subtitleClassName: cn(
      'mt-0.5 text-xs',
      isDark ? 'text-[#8E816D]' : 'text-[#5E5549]',
    ),
    markAllButtonClassName: cn(
      'size-8 rounded-none border-none bg-transparent shadow-none hover:translate-y-0',
      isDark
        ? 'text-[#C5A059] hover:bg-white/8 hover:text-[#D6B16E]'
        : 'text-[#9B7A41] hover:bg-black/5 hover:text-[#1C1815]',
    ),
    dividerClassName: cn(
      'border-t',
      isDark ? 'border-white/8' : 'border-[#1A1A1A]/10',
    ),
  }
}
