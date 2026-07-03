import * as React from 'react'
import { Link, useRouter, useRouterState } from '@tanstack/react-router'
import { NotificationsMenu } from '@/components/navigation/notifications-menu'
import { NavUser } from '@/components/navigation/nav-user/NavUser'
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
  useSidebar,
} from '@/components/ui/sidebar/Sidebar'
import { cn } from '@/lib/utils'
import heroEmblem from '@/assets/images/bg/logo.webp'
import { LayoutDashboard } from '@/components/animate-ui/icons/layout-dashboard'
import { ClipboardList } from '@/components/animate-ui/icons/clipboard-list'
import { CalendarCheckIcon } from '@/components/animate-ui/icons/calendar-check'
import { MessageSquare } from '@/components/animate-ui/icons/message-square'
import { LayersIcon } from '@/components/animate-ui/icons/layers'
import { Users } from '@/components/animate-ui/icons/users'
import { BookText } from '@/components/animate-ui/icons/book'
import { CalendarDaysIcon } from '@/components/animate-ui/icons/calendar-days'
import { AnimateIcon } from '@/components/animate-ui/icons/icon'
import { List } from '@/components/animate-ui/icons/list'
import { Clapperboard } from '@/components/animate-ui/icons/clapperboard'
import { Send } from '@/components/animate-ui/icons/send'
import { BrushIcon } from '@/components/animate-ui/icons/brush'

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
    title: 'Zoom',
    url: '/zoom',
    icon: Clapperboard,
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
    icon: BookText,
  },
  {
    title: 'Discipleship',
    url: '/discipleship',
    icon: BrushIcon,
  },
  {
    title: 'Events',
    url: '/events',
    icon: CalendarDaysIcon,
  },
  {
    title: 'Enrollments',
    url: '/enrollments',
    icon: Send,
  },
]

const adminNavItems: Array<NavItem> = [
  {
    title: 'User Management',
    url: '/invitations',
    icon: List,
  },
]

function NavItemList({ items }: { items: Array<NavItem> }) {
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
                  ? 'border-l-2 border-[#C5A059]/60 bg-[#1A1716] text-[#F8F4EC] hover:bg-[#1A1716] hover:text-[#F8F4EC]'
                  : 'border-l-2 border-transparent text-[#AFA28F] hover:border-[#C5A059]/30 hover:bg-[#1A1716]/60 hover:text-[#F8F4EC]',
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
  state,
}: {
  isTeacherOrAdmin: boolean
  state: 'expanded' | 'collapsed'
}) {
  if (!isTeacherOrAdmin) return null
  return (
    <>
      <SidebarGroupLabel className={state === 'collapsed' ? 'hidden' : ''}>
        For teachers
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <NavItemList items={teacherNavItems} />
      </SidebarGroupContent>
    </>
  )
}

function AdminContent({
  isAdmin,
  state,
}: {
  isAdmin: boolean
  state: 'expanded' | 'collapsed'
}) {
  if (!isAdmin) return null
  return (
    <>
      <SidebarGroupLabel className={state === 'collapsed' ? 'hidden' : ''}>
        For admins
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <NavItemList items={adminNavItems} />
      </SidebarGroupContent>
    </>
  )
}

export function AppSidebar({
  user,
  role,
  ...props
}: AppSidebarProps & React.ComponentProps<typeof Sidebar>) {
  const router = useRouter()
  const { state } = useSidebar()

  const isTeacherOrAdmin = role === 'teacher' || role === 'admin'

  return (
    <Sidebar
      collapsible={user ? 'icon' : 'offcanvas'}
      variant="inset"
      className={'dina-dark py-0 pl-0'}
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
            <NavItemList items={navItems} />
          </SidebarGroupContent>

          <TeacherContent isTeacherOrAdmin={isTeacherOrAdmin} state={state} />
          <AdminContent isAdmin={role === 'admin'} state={state} />
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="pl-3">
        <NotificationsMenu />
        <NavUser
          user={user as any}
          onProfileUpdate={() => router.invalidate()}
        />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
