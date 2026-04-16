import * as React from 'react'
import { Link, useRouter, useRouterState } from '@tanstack/react-router'
import {
  Calendar,
  ClipboardList,
  GraduationCap,
  LayoutDashboard,
  UserPlus,
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
import heroEmblem from '@/assets/images/bg/logo.webp'

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

const adminNavItems = [
  {
    title: 'User Management',
    url: '/invitations',
    icon: UserPlus,
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
                  className="h-10"
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

function AdminContent({ isAdmin }: { isAdmin: boolean }) {
  const routerState = useRouterState()
  if (!isAdmin) return null

  return (
    <>
      <SidebarGroupLabel>For admins</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {adminNavItems.map((item) => {
            const isActive = routerState.location.pathname === item.url
            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  className="h-10"
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
  const isAdmin = role === 'admin'

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
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg">
                    <img
                      src={heroEmblem}
                      alt="DINA emblem"
                      className="relative w-full object-contain drop-shadow-[0_46px_54px_rgba(0,0,0,0.62)]"
                    />
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">DINA</span>
                    <span className="truncate text-xs">
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
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive = routerState.location.pathname === item.url
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      className="h-10"
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
          <AdminContent isAdmin={isAdmin} />
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
