import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { formatDistanceToNow } from 'date-fns'

import type * as React from 'react'
import type { PostNotificationGroup } from '@/utils/post/postNotifications'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  getPostNotificationsSummary,
  markAllPostNotificationsRead,
  markPostNotificationGroupRead,
} from '@/utils/post/postNotifications'
import { Bell } from '@/components/animate-ui/icons/bell'
import { BellRing } from '@/components/animate-ui/icons/bell-ring'
import { AnimateIcon } from '@/components/animate-ui/icons/icon'
import { CircleCheckBig } from '@/components/animate-ui/icons/circle-check-big'
import { CircleCheck } from '@/components/animate-ui/icons/circle-check'
import { buildNotificationRowViewModel } from '@/components/navigation/domain/notification-row.domain'

const POLL_MS = 45_000

function NotificationTriggerButton({
  isDark,
  isCollapsed,
  shouldAnimate,
  displayUnreadCount,
  className,
  ...props
}: {
  isDark: boolean
  isCollapsed: boolean
  shouldAnimate: boolean
  displayUnreadCount: string
} & React.ComponentProps<typeof SidebarMenuButton>) {
  const BellIcon = shouldAnimate ? BellRing : Bell

  return (
    <SidebarMenuButton
      tooltip="Notifications"
      className={cn(
        'h-10 rounded-none transition-all',
        isDark
          ? 'border-l-2 border-transparent text-[#AFA28F] hover:border-[#C5A059]/30 hover:bg-[#1A1716]/60 hover:text-[#F8F4EC] data-[state=open]:border-[#C5A059]/60 data-[state=open]:bg-[#1A1716] data-[state=open]:text-[#F8F4EC]'
          : 'border-l-2 border-transparent text-[#4E463D] hover:border-[#9B7A41]/30 hover:bg-[#EDE8DE]/60 hover:text-[#1C1815] data-[state=open]:border-[#9B7A41]/60 data-[state=open]:bg-[#EDE8DE] data-[state=open]:text-[#1C1815]',
        className,
      )}
      {...props}
    >
      <AnimateIcon
        animateOnHover
        animateOnView={shouldAnimate}
        loop={shouldAnimate}
        className="flex h-full w-full flex-row items-center gap-2 py-2"
      >
        <BellIcon
          size={18}
          className={cn(
            'shrink-0',
            shouldAnimate
              ? 'text-destructive'
              : isDark
                ? 'text-[#C5A059]'
                : 'text-[#9B7A41]',
          )}
        />
        <span>Notifications</span>
      </AnimateIcon>

      {shouldAnimate && (
        <div
          className={cn(
            'animate-in fade-in pointer-events-none absolute flex size-5 items-center justify-center rounded-none px-1.5 text-xs font-medium tabular-nums duration-1000',
            isCollapsed ? 'hidden' : 'right-2',
            isDark
              ? 'bg-destructive text-[#E9D9B4]'
              : 'bg-destructive text-[#9B7A41]',
          )}
        >
          {displayUnreadCount}
        </div>
      )}
    </SidebarMenuButton>
  )
}

function NotificationMenuHeader({
  isDark,
  shouldAnimate,
  unreadGroupCount,
  onMarkAllRead,
}: {
  isDark: boolean
  shouldAnimate: boolean
  unreadGroupCount: number
  onMarkAllRead: () => void
}) {
  return (
    <>
      <div className="flex items-center justify-between gap-3 px-3 py-3">
        <div className="grid">
          <div
            className={cn(
              'text-[0.68rem] font-medium tracking-[0.24em] uppercase',
              isDark ? 'text-[#C5A059]' : 'text-[#9B7A41]',
            )}
          >
            Notifications
          </div>
          <div
            className={cn(
              'mt-0.5 text-xs',
              isDark ? 'text-[#8E816D]' : 'text-[#5E5549]',
            )}
          >
            {shouldAnimate ? `${unreadGroupCount} unread` : 'All caught up'}
          </div>
        </div>

        <Button
          type="button"
          size="icon"
          variant="ghost"
          theme={isDark ? 'dark' : 'lightGhost'}
          className={cn(
            'size-8 rounded-none border-none bg-transparent shadow-none hover:translate-y-0',
            isDark
              ? 'text-[#C5A059] hover:bg-white/8 hover:text-[#D6B16E]'
              : 'text-[#9B7A41] hover:bg-black/5 hover:text-[#1C1815]',
          )}
          onClick={onMarkAllRead}
          disabled={!shouldAnimate}
        >
          <CircleCheckBig animateOnHover />
        </Button>
      </div>

      <div
        className={cn(
          'border-t',
          isDark ? 'border-white/8' : 'border-[#1A1A1A]/10',
        )}
      />
    </>
  )
}

function NotificationRow({
  group,
  isDark,
  onOpen,
  onMarkRead,
}: {
  group: PostNotificationGroup
  isDark: boolean
  onOpen: (group: PostNotificationGroup) => void
  onMarkRead: (group: PostNotificationGroup) => void
}) {
  const vm = buildNotificationRowViewModel(group, isDark)

  return (
    <Link
      key={`${group.event}-${group.postId}`}
      to="/posts"
      search={vm.search as any}
      onClick={() => onOpen(group)}
      className="block"
    >
      <DropdownMenuItem className={vm.rowClassName}>
        <div className="grid flex-1 gap-1">
          <div className="flex items-center gap-2">
            <div className={vm.titleClassName}>{vm.title}</div>
            {vm.isUnread && (
              <span className={vm.unreadBadgeClassName}>
                {group.unreadCount}
              </span>
            )}
          </div>
          <div className={vm.subtitleClassName}>{vm.subtitle}</div>
          <div className={vm.timeClassName}>
            {formatDistanceToNow(new Date(group.lastActivityAt), {
              addSuffix: true,
            })}
          </div>
        </div>

        <Button
          type="button"
          size="icon"
          variant="ghost"
          theme={vm.buttonTheme}
          className={vm.markReadButtonClassName}
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onMarkRead(group)
          }}
          disabled={!vm.isUnread}
        >
          <CircleCheck animateOnHover />
        </Button>
      </DropdownMenuItem>
    </Link>
  )
}

function NotificationsList({
  groups,
  isDark,
  onOpenGroup,
  onMarkGroupRead,
}: {
  groups: Array<PostNotificationGroup>
  isDark: boolean
  onOpenGroup: (group: PostNotificationGroup) => void
  onMarkGroupRead: (group: PostNotificationGroup) => void
}) {
  if (groups.length === 0) {
    return (
      <div
        className={cn(
          'px-3 py-10 text-center text-sm',
          isDark ? 'text-[#8E816D]' : 'text-[#5E5549]',
        )}
      >
        No notifications
      </div>
    )
  }

  return (
    <div className="max-h-[420px] overflow-y-auto">
      {groups.map((group) => (
        <NotificationRow
          key={`${group.event}-${group.postId}`}
          group={group}
          isDark={isDark}
          onOpen={onOpenGroup}
          onMarkRead={onMarkGroupRead}
        />
      ))}
    </div>
  )
}

export function NotificationsMenu({ variant }: { variant: 'light' | 'dark' }) {
  const { isMobile, setOpen, state } = useSidebar()
  const [open, setOpenDropdown] = useState(false)
  const [groups, setGroups] = useState<Array<PostNotificationGroup>>([])
  const [unreadGroupCount, setUnreadGroupCount] = useState(0)
  const pollRef = useRef<number | null>(null)

  const shouldAnimate = unreadGroupCount > 0
  const isDark = variant === 'dark'
  const isCollapsed = state === 'collapsed'

  const load = async () => {
    const data = await getPostNotificationsSummary({ data: { limit: 25 } })
    setGroups(data.groups)
    setUnreadGroupCount(data.unreadGroupCount)
  }

  useEffect(() => {
    load().catch(() => {})

    pollRef.current = window.setInterval(() => {
      load().catch(() => {})
    }, POLL_MS)

    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    load().catch(() => {})
  }, [open])

  const displayUnreadCount = useMemo(() => {
    if (unreadGroupCount > 99) return '99+'
    return String(unreadGroupCount)
  }, [unreadGroupCount])

  const handleMarkAllRead = async () => {
    setUnreadGroupCount(0)
    setGroups((prev) => prev.map((g) => ({ ...g, unreadCount: 0 })))

    try {
      await markAllPostNotificationsRead()
    } catch {
      await load()
    }
  }

  const handleMarkGroupRead = async (group: PostNotificationGroup) => {
    if (group.unreadCount === 0) return

    setUnreadGroupCount((prev) => Math.max(0, prev - 1))
    setGroups((prev) =>
      prev.map((g) =>
        g.event === group.event && g.postId === group.postId
          ? { ...g, unreadCount: 0 }
          : g,
      ),
    )

    try {
      await markPostNotificationGroupRead({
        data: { event: group.event, postId: group.postId },
      })
    } catch {
      await load()
    }
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu open={open} onOpenChange={setOpenDropdown}>
          <DropdownMenuTrigger
            render={
              <NotificationTriggerButton
                isDark={isDark}
                isCollapsed={isCollapsed}
                shouldAnimate={shouldAnimate}
                displayUnreadCount={displayUnreadCount}
              />
            }
          />
          <DropdownMenuContent
            className={cn(
              'min-w-80 rounded-none border p-0 shadow-[0_22px_44px_-28px_rgba(0,0,0,0.6)]',
              isDark
                ? 'border-white/10 bg-[#151515] text-[#F8F4EC]'
                : 'border-[#1A1A1A]/12 bg-[#F8F4EC] text-[#1C1815]',
            )}
            side={isMobile ? 'bottom' : 'right'}
            align="end"
            sideOffset={4}
          >
            <NotificationMenuHeader
              isDark={isDark}
              shouldAnimate={shouldAnimate}
              unreadGroupCount={unreadGroupCount}
              onMarkAllRead={handleMarkAllRead}
            />
            <NotificationsList
              groups={groups}
              isDark={isDark}
              onOpenGroup={(group) => {
                if (group.unreadCount > 0) handleMarkGroupRead(group)
                if (isMobile) setOpen(false)
              }}
              onMarkGroupRead={handleMarkGroupRead}
            />
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
