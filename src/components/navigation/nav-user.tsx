'use client'

import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { ChevronsUpDown } from 'lucide-react'
import type React from 'react'
import { ProfileModal } from '@/components/dialog/ProfileModal'
import { LogOut } from '@/components/animate-ui/icons/log-out'
import { BadgeCheck } from '@/components/animate-ui/icons/badge-check'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'
import { cn } from '@/lib/utils'
import { AnimateIcon } from '@/components/animate-ui/icons/icon'

type NavUserProps = {
  user: {
    id: string
    email: string
    fullName?: string
    avatarUrl?: string
    bio?: string
  } | null
  onProfileUpdate?: () => void
  variant?: 'light' | 'dark'
}

type NavUserData = NonNullable<NavUserProps['user']>

function getInitials(user: NavUserData): string {
  return user.fullName
    ? user.fullName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : user.email.slice(0, 2).toUpperCase()
}

function UserAvatar({
  user,
  initials,
  isDark,
}: {
  user: NavUserData
  initials: string
  isDark: boolean
}) {
  return (
    <Avatar
      className={cn(
        'h-8 w-8',
        user.avatarUrl ? 'rounded-full' : 'rounded-none',
      )}
    >
      <AvatarImage
        src={user.avatarUrl}
        alt={user.fullName}
        className="rounded-none"
      />
      <AvatarFallback
        className={cn(
          'rounded-none text-xs font-medium tracking-[0.08em]',
          isDark
            ? 'bg-[#1A1716] text-[#C5A059]'
            : 'bg-[#EDE8DE] text-[#9B7A41]',
        )}
      >
        {initials}
      </AvatarFallback>
    </Avatar>
  )
}

function UserText({
  user,
  isDark,
  compact = false,
}: {
  user: NavUserData
  isDark: boolean
  compact?: boolean
}) {
  return (
    <div
      className={cn(
        'grid flex-1 text-left',
        compact ? 'text-sm leading-tight' : 'leading-tight',
      )}
    >
      <span
        className={cn(
          'truncate font-medium',
          !compact && 'text-sm',
          !compact && (isDark ? 'text-[#F8F4EC]' : 'text-[#1C1815]'),
        )}
      >
        {user.fullName || user.email}
      </span>
      <span
        className={cn(
          'truncate text-[0.68rem] tracking-[0.04em]',
          isDark ? 'text-[#8E816D]' : 'text-[#5E5549]',
        )}
      >
        {user.email}
      </span>
    </div>
  )
}

function NavUserTrigger({
  user,
  initials,
  isDark,
}: {
  user: NavUserData
  initials: string
  isDark: boolean
}) {
  return (
    <SidebarMenuButton
      size="lg"
      tooltip="Account settings"
      className={cn(
        'rounded-none border transition-all',
        isDark
          ? 'border-white/8 bg-[#1A1716]/60 text-[#D6CCBE] hover:border-[#C5A059]/30 hover:bg-[#1A1716] hover:text-[#F8F4EC] data-[state=open]:border-[#C5A059]/40 data-[state=open]:bg-[#1A1716]'
          : 'border-[#1A1A1A]/10 bg-[#EDE8DE]/60 text-[#4E463D] hover:border-[#9B7A41]/30 hover:bg-[#EDE8DE] hover:text-[#1C1815] data-[state=open]:border-[#9B7A41]/40 data-[state=open]:bg-[#EDE8DE]',
      )}
    >
      <UserAvatar user={user} initials={initials} isDark={isDark} />
      <UserText user={user} isDark={isDark} compact />
      <ChevronsUpDown
        className={cn(
          'ml-auto size-4',
          isDark ? 'text-[#8E816D]' : 'text-[#5E5549]',
        )}
      />
    </SidebarMenuButton>
  )
}

function NavUserMenuItem({
  isDark,
  children,
  onClick,
}: {
  isDark: boolean
  children: React.ReactNode
  onClick?: () => void
}) {
  return (
    <DropdownMenuItem
      className={cn(
        'group/button mx-0 rounded-none px-3 py-0 text-sm transition-all',
        isDark
          ? 'text-[#D6CCBE] hover:bg-white/8 hover:text-[#F8F4EC] focus:bg-white/8 focus:text-[#F8F4EC]'
          : 'text-[#4E463D] hover:bg-[#EDE8DE] hover:text-[#1C1815] focus:bg-[#EDE8DE] focus:text-[#1C1815]',
      )}
      onClick={onClick}
    >
      {children}
    </DropdownMenuItem>
  )
}

function NavUserMenuContent({
  user,
  initials,
  isDark,
  isMobile,
  onOpenProfile,
  onLogoutClick,
}: {
  user: NavUserData
  initials: string
  isDark: boolean
  isMobile: boolean
  onOpenProfile: () => void
  onLogoutClick: () => void
}) {
  return (
    <DropdownMenuContent
      className={cn(
        'w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-none border shadow-[0_22px_44px_-28px_rgba(0,0,0,0.6)]',
        isDark
          ? 'border-white/10 bg-[#151515] text-[#F8F4EC]'
          : 'border-[#1A1A1A]/12 bg-[#F8F4EC] text-[#1C1815]',
      )}
      side={isMobile ? 'bottom' : 'right'}
      align="end"
      sideOffset={4}
    >
      <DropdownMenuGroup>
        <DropdownMenuLabel className="p-0 font-normal">
          <div className="flex items-center gap-2 px-3 py-3">
            <UserAvatar user={user} initials={initials} isDark={isDark} />
            <UserText user={user} isDark={isDark} />
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator
          className={isDark ? 'bg-white/8' : 'bg-[#1A1A1A]/10'}
        />
        <NavUserMenuItem isDark={isDark} onClick={onOpenProfile}>
          <AnimateIcon
            animateOnHover
            className="flex h-full w-full flex-row items-center gap-2 py-2"
          >
            <BadgeCheck
              className={cn(
                'size-4 shrink-0 group-hover/button:text-[#C5A059] group-focus/button:text-[#C5A059]',
                isDark ? 'text-[#C5A059]!' : 'text-[#9B7A41]!',
              )}
            />
            My Profile
          </AnimateIcon>
        </NavUserMenuItem>
        <DropdownMenuSeparator
          className={isDark ? 'bg-white/8' : 'bg-[#1A1A1A]/10'}
        />
        <Link onClick={onLogoutClick} to="/logout">
          <NavUserMenuItem isDark={isDark}>
            <AnimateIcon
              animateOnHover
              className="flex h-full w-full flex-row items-center gap-2 py-2"
            >
              <LogOut
                className={cn(
                  'size-4 shrink-0',
                  isDark ? 'text-[#C5A059]!' : 'text-[#9B7A41]!',
                )}
              />
              Log out
            </AnimateIcon>
          </NavUserMenuItem>
        </Link>
      </DropdownMenuGroup>
    </DropdownMenuContent>
  )
}

export function NavUser({
  user,
  onProfileUpdate,
  variant = 'dark',
}: NavUserProps) {
  const { isMobile, setOpen } = useSidebar()
  const [profileModalOpen, setProfileModalOpen] = useState(false)

  if (!user) {
    return null
  }

  const initials = getInitials(user)
  const isDark = variant === 'dark'

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <NavUserTrigger
                  user={user}
                  initials={initials}
                  isDark={isDark}
                />
              }
            />
            <NavUserMenuContent
              user={user}
              initials={initials}
              isDark={isDark}
              isMobile={isMobile}
              onOpenProfile={() => setProfileModalOpen(true)}
              onLogoutClick={() => setOpen(false)}
            />
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>

      <ProfileModal
        open={profileModalOpen}
        onOpenChange={setProfileModalOpen}
        user={user}
        onProfileUpdate={onProfileUpdate}
      />
    </>
  )
}
