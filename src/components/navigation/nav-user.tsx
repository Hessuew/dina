'use client'

import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { ChevronsUpDown } from 'lucide-react'
import { ProfileModal } from '@/components/modal/ProfileModal'
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

  const initials = user.fullName
    ? user.fullName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : user.email.slice(0, 2).toUpperCase()

  const isDark = variant === 'dark'

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <SidebarMenuButton
                  size="lg"
                  className={cn(
                    'rounded-none border transition-all',
                    isDark
                      ? 'border-white/8 bg-[#1A1716]/60 text-[#D6CCBE] hover:border-[#C5A059]/30 hover:bg-[#1A1716] hover:text-[#F8F4EC] data-[state=open]:border-[#C5A059]/40 data-[state=open]:bg-[#1A1716]'
                      : 'border-[#1A1A1A]/10 bg-[#EDE8DE]/60 text-[#4E463D] hover:border-[#9B7A41]/30 hover:bg-[#EDE8DE] hover:text-[#1C1815] data-[state=open]:border-[#9B7A41]/40 data-[state=open]:bg-[#EDE8DE]',
                  )}
                >
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
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">
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
                  <ChevronsUpDown
                    className={cn(
                      'ml-auto size-4',
                      isDark ? 'text-[#8E816D]' : 'text-[#5E5549]',
                    )}
                  />
                </SidebarMenuButton>
              }
            />
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
                    <Avatar
                      className={cn(
                        'h-8 w-8',
                        user.avatarUrl ? 'rounded-full' : 'rounded-none',
                      )}
                    >
                      <AvatarImage src={user.avatarUrl} alt={user.fullName} />
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
                    <div className="grid flex-1 text-left leading-tight">
                      <span
                        className={cn(
                          'truncate text-sm font-medium',
                          isDark ? 'text-[#F8F4EC]' : 'text-[#1C1815]',
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
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator
                  className={isDark ? 'bg-white/8' : 'bg-[#1A1A1A]/10'}
                />
                <DropdownMenuItem
                  className={cn(
                    'group/button mx-0 rounded-none px-3 py-2.5 text-sm transition-all',
                    isDark
                      ? 'text-[#D6CCBE] hover:bg-white/8 hover:text-[#F8F4EC] focus:bg-white/8 focus:text-[#F8F4EC]'
                      : 'text-[#4E463D] hover:bg-[#EDE8DE] hover:text-[#1C1815] focus:bg-[#EDE8DE] focus:text-[#1C1815]',
                  )}
                  onClick={() => setProfileModalOpen(true)}
                >
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
                </DropdownMenuItem>
                <DropdownMenuSeparator
                  className={isDark ? 'bg-white/8' : 'bg-[#1A1A1A]/10'}
                />
                <Link onClick={() => setOpen(false)} to="/logout">
                  <DropdownMenuItem
                    className={cn(
                      'mx-0 rounded-none px-3 py-2.5 text-sm transition-all hover:text-[#F8F4EC] focus:text-[#F8F4EC]',
                      isDark
                        ? 'text-[#D6CCBE] hover:bg-white/8 focus:bg-white/8'
                        : 'text-[#4E463D] hover:bg-[#EDE8DE] focus:bg-[#EDE8DE]',
                    )}
                  >
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
                  </DropdownMenuItem>
                </Link>
              </DropdownMenuGroup>
            </DropdownMenuContent>
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
