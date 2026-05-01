import * as React from 'react'
import { Link, useRouter, useRouterState } from '@tanstack/react-router'
import {
  Calendar,
  CalendarDays,
  ClipboardList,
  GraduationCap,
  LayoutDashboard,
  Library,
  MessageSquare,
  UserPlus,
  Users,
} from 'lucide-react'
import { motion, useReducedMotion } from 'framer-motion'
import type { Variants } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'
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

type User = {
  id: string
  email: string
  fullName?: string
  avatarUrl?: string | null
}

type SidebarVariant = 'light' | 'dark'

type IconMotionPreset = 'tilt' | 'rotate' | 'pulse' | 'shift'

type NavItem = {
  title: string
  url: string
  icon: LucideIcon
  motionPreset: IconMotionPreset
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
    motionPreset: 'tilt',
  },
  {
    title: 'Assignments',
    url: '/assignments',
    icon: ClipboardList,
    motionPreset: 'pulse',
  },
  {
    title: 'Calendar',
    url: '/calendar',
    icon: Calendar,
    motionPreset: 'rotate',
  },
  {
    title: 'Posts',
    url: '/posts',
    icon: MessageSquare,
    motionPreset: 'pulse',
  },
  {
    title: 'Library',
    url: '/library',
    icon: Library,
    motionPreset: 'tilt',
  },
  {
    title: 'Teachers',
    url: '/teachers',
    icon: Users,
    motionPreset: 'rotate',
  },
]

const teacherNavItems: Array<NavItem> = [
  {
    title: 'Students',
    url: '/students',
    icon: GraduationCap,
    motionPreset: 'tilt',
  },
  {
    title: 'Events',
    url: '/events',
    icon: CalendarDays,
    motionPreset: 'rotate',
  },
  {
    title: 'User Management',
    url: '/invitations',
    icon: UserPlus,
    motionPreset: 'pulse',
  },
]

const iconMotionVariants: Record<IconMotionPreset, Variants> = {
  tilt: {
    rest: { rotate: 0, y: 0 },
    hover: {
      rotate: [0, -10, 6, 0],
      y: [0, -1, 0],
      transition: { duration: 0.42, ease: 'easeOut' },
    },
  },
  rotate: {
    rest: { rotate: 0, y: 0 },
    hover: {
      rotate: [0, -14, 0],
      transition: { duration: 0.36, ease: 'easeOut' },
    },
  },
  pulse: {
    rest: { scale: 1 },
    hover: {
      scale: [1, 1.08, 1],
      transition: { duration: 0.34, ease: 'easeOut' },
    },
  },
  shift: {
    rest: { x: 0 },
    hover: {
      x: [0, 1.5, 0],
      transition: { duration: 0.3, ease: 'easeOut' },
    },
  },
}

function AnimatedSidebarIcon({
  icon: Icon,
  isHovered,
  preset,
}: {
  icon: LucideIcon
  isHovered: boolean
  preset: IconMotionPreset
}) {
  const shouldReduceMotion = useReducedMotion()

  if (shouldReduceMotion) {
    return <Icon />
  }

  return (
    <motion.span
      className="inline-flex"
      initial={false}
      animate={isHovered ? 'hover' : 'rest'}
      variants={iconMotionVariants[preset]}
    >
      <Icon />
    </motion.span>
  )
}

function NavItemList({
  items,
  variant,
}: {
  items: Array<NavItem>
  variant: SidebarVariant
}) {
  const routerState = useRouterState()
  const [hoveredUrl, setHoveredUrl] = React.useState<string | null>(null)
  return (
    <SidebarMenu>
      {items.map((item) => {
        const isActive = routerState.location.pathname === item.url
        const isHovered = hoveredUrl === item.url
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
              onMouseEnter={() => setHoveredUrl(item.url)}
              onMouseLeave={() =>
                setHoveredUrl((prev) => (prev === item.url ? null : prev))
              }
              onFocus={() => setHoveredUrl(item.url)}
              onBlur={() =>
                setHoveredUrl((prev) => (prev === item.url ? null : prev))
              }
              render={
                <Link to={item.url}>
                  <AnimatedSidebarIcon
                    icon={item.icon}
                    isHovered={isHovered}
                    preset={item.motionPreset}
                  />
                  <span>{item.title}</span>
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
