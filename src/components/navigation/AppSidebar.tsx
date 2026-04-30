import * as React from 'react'
import { Link, useRouter, useRouterState } from '@tanstack/react-router'
import { NavUser } from '@/components/navigation/nav-user'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar'
import { cn } from '@/lib/utils'
import heroEmblem from '@/assets/images/bg/logo.webp'
import { NotificationsMenu } from '@/components/navigation/NotificationsMenu'
import { LayoutDashboard } from '@/components/animate-ui/icons/layout-dashboard'
import { ClipboardList } from '@/components/animate-ui/icons/clipboard-list'
import { CalendarCheckIcon } from '@/components/animate-ui/icons/calendar-check'
import { MessageSquare } from '@/components/animate-ui/icons/message-square'
import { LayersIcon } from '@/components/animate-ui/icons/layers'
import { Users } from '@/components/animate-ui/icons/users'
import { GraduationCapIcon } from '@/components/animate-ui/icons/graduation-cap'
import { CalendarDaysIcon } from '@/components/animate-ui/icons/calendar-days'
import { AnimateIcon } from '@/components/animate-ui/icons/icon'
import { UserRoundPlusIcon } from '@/components/animate-ui/icons/user-round-plus'

type User = {
  id: string
  email: string
  fullName?: string
  avatarUrl?: string | null
}

type SidebarVariant = 'light' | 'dark'

type NavItem = {
  title: string
  url: string
  icon: React.FC<{ size?: number; className?: string }>
}

type AppSidebarProps = {
  user: User | null
  role: 'student' | 'teacher' | 'admin'
  sidebarVariant?: SidebarVariant
}

const navItems: Array<NavItem> = [
  {
    title: 'Dashboard',
    url: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'Assignments',
    url: '/assignments',
    icon: ClipboardList,
  },
  {
    title: 'Calendar',
    url: '/calendar',
    icon: CalendarCheckIcon,
  },
  {
    title: 'Posts',
    url: '/posts',
    icon: MessageSquare,
  },
  {
    title: 'Library',
    url: '/library',
    icon: LayersIcon,
  },
  {
    title: 'Teachers',
    url: '/teachers',
    icon: Users,
  },
]

const teacherNavItems: Array<NavItem> = [
  {
    title: 'Students',
    url: '/students',
    icon: GraduationCapIcon,
  },
  {
    title: 'Events',
    url: '/events',
    icon: CalendarDaysIcon,
  },
  {
    title: 'User Management',
    url: '/invitations',
    icon: UserRoundPlusIcon,
  },
]

function NavItemList({
  items,
  variant,
}: {
  items: Array<NavItem>
  variant: SidebarVariant
}) {
  const routerState = useRouterState()
  return (
    <SidebarMenu>
      {items.map((item) => {
        const isActive = routerState.location.pathname === item.url
        const Icon = item.icon
        return (
          <SidebarMenuItem key={item.title}>
            <SidebarMenuButton
              className={cn(
                'h-10 rounded-none transition-all',
                isActive
                  ? variant === 'dark'
                    ? 'border-l-2 border-[#C5A059]/60 bg-[#1A1716] text-[#F8F4EC] hover:bg-[#1A1716] hover:text-[#F8F4EC]'
                    : 'border-l-2 border-[#9B7A41]/60 bg-[#EDE8DE] text-[#1C1815] hover:bg-[#EDE8DE] hover:text-[#1C1815]'
                  : variant === 'dark'
                    ? 'border-l-2 border-transparent text-[#AFA28F] hover:border-[#C5A059]/30 hover:bg-[#1A1716]/60 hover:text-[#F8F4EC]'
                    : 'border-l-2 border-transparent text-[#4E463D] hover:border-[#9B7A41]/30 hover:bg-[#EDE8DE]/60 hover:text-[#1C1815]',
              )}
              isActive={isActive}
              render={
                <Link className="py-0" to={item.url}>
                  <AnimateIcon
                    animateOnHover
                    className="flex h-full w-full flex-row items-center gap-2 py-2"
                  >
                    <Icon size={18} className="shrink-0" />
                    <span>{item.title}</span>
                  </AnimateIcon>
                </Link>
              }
              tooltip={item.title}
            />
          </SidebarMenuItem>
        )
      })}
    </SidebarMenu>
  )
}

function TeacherContent({
  isTeacherOrAdmin,
  variant,
}: {
  isTeacherOrAdmin: boolean
  variant: SidebarVariant
}) {
  if (!isTeacherOrAdmin) return null
  return (
    <>
      <SidebarGroupLabel>For teachers</SidebarGroupLabel>
      <SidebarGroupContent>
        <NavItemList items={teacherNavItems} variant={variant} />
      </SidebarGroupContent>
    </>
  )
}

export function AppSidebar({
  user,
  role,
  sidebarVariant = 'dark',
  ...props
}: AppSidebarProps & React.ComponentProps<typeof Sidebar>) {
  const router = useRouter()

  const isTeacherOrAdmin = role === 'teacher' || role === 'admin'

  return (
    <Sidebar
      collapsible={user ? 'icon' : 'offcanvas'}
      variant="inset"
      className={
        sidebarVariant === 'dark' ? 'dina-dark py-0 pl-0' : 'dina-light'
      }
      {...props}
    >
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem className="pl-0.5">
            <SidebarMenuButton
              size="lg"
              render={
                <Link to="/" className="mt-2 flex items-center gap-3">
                  <div className="flex size-8 shrink-0 items-center justify-center">
                    <img
                      src={heroEmblem}
                      alt="DINA emblem"
                      className="relative w-full object-contain drop-shadow-[0_46px_54px_rgba(0,0,0,0.62)]"
                    />
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate text-[0.72rem] font-medium tracking-[0.3em] text-[#C5A059] uppercase sm:text-[0.78rem]">
                      DINA
                    </span>
                    <span className="truncate text-xs font-medium text-[#8E816D]">
                      Discipleship Training School
                    </span>
                  </div>
                </Link>
              }
            />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Platform</SidebarGroupLabel>
          <SidebarGroupContent>
            <NavItemList items={navItems} variant={sidebarVariant} />
          </SidebarGroupContent>

          <TeacherContent
            isTeacherOrAdmin={isTeacherOrAdmin}
            variant={sidebarVariant}
          />
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="pl-3">
        <NotificationsMenu variant={sidebarVariant} />
        <NavUser
          user={user as any}
          onProfileUpdate={() => router.invalidate()}
          variant={sidebarVariant}
        />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
