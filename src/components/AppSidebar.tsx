import * as React from 'react'
import { Link, useRouter, useRouterState } from '@tanstack/react-router'
import {
  Calendar,
  ClipboardList,
  GraduationCap,
  LayoutDashboard,
  Users,
} from 'lucide-react'
import { NavUser } from './nav-user'
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

type User = {
  id: string
  email: string
  fullName?: string
  avatarUrl?: string | null
}

type AppSidebarProps = {
  user: User | null
  role: 'student' | 'teacher' | 'admin'
}

const navItems = [
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
    icon: Calendar,
  },
  {
    title: 'Teachers',
    url: '/teachers',
    icon: Users,
  },
]

const teacherNavItems = [
  {
    title: 'Students',
    url: '/students',
    icon: GraduationCap,
  },
]

function TeacherContent({ isTeacherOrAdmin }: { isTeacherOrAdmin: boolean }) {
  const routerState = useRouterState()
  if (!isTeacherOrAdmin) return null

  return (
    <>
      <SidebarGroupLabel>For teachers</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {teacherNavItems.map((item) => {
            const isActive = routerState.location.pathname === item.url
            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  className=" h-10"
                  isActive={isActive}
                  render={
                    <Link to={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  }
                  tooltip={item.title}
                />
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </>
  )
}

export function AppSidebar({
  user,
  role,
  ...props
}: AppSidebarProps & React.ComponentProps<typeof Sidebar>) {
  const routerState = useRouterState()
  const router = useRouter()

  const isTeacherOrAdmin = role === 'teacher' || role === 'admin'

  return (
    <Sidebar
      collapsible={user ? 'icon' : 'offcanvas'}
      variant="inset"
      {...props}
    >
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              render={
                <Link to="/">
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                    <LayoutDashboard className="size-4" />
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">Logo</span>
                    <span className="truncate text-xs">Learning Platform</span>
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
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive = routerState.location.pathname === item.url
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      className=" h-10"
                      isActive={isActive}
                      render={
                        <Link to={item.url}>
                          <item.icon />
                          <span>{item.title}</span>
                        </Link>
                      }
                      tooltip={item.title}
                    />
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>

          <TeacherContent isTeacherOrAdmin={isTeacherOrAdmin} />
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <NavUser
          user={user as any}
          onProfileUpdate={() => router.invalidate()}
        />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
