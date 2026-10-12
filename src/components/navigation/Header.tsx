import { useRouterState } from '@tanstack/react-router'
import { LandingPublicHeader } from '@/components/landing/hero'
import { SidebarTrigger } from '@/components/ui/sidebar/Sidebar'
import { cn } from '@/lib/utils'

type User = {
  id: string
  email: string
  fullName?: string
  avatarUrl?: string | null
  role?: 'student' | 'teacher' | 'admin'
}

type HeaderProps = {
  user: User | null
}

export function Header({ user }: HeaderProps) {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })
  if (!user) {
    return <LandingPublicHeader />
  }

  // The reader page owns the full screen on mobile; its Back button is the exit.
  const isReaderPage = /^\/library\/[^/]+$/.test(pathname)

  return (
    <header
      className={cn(
        'fixed top-0 z-40 flex h-12 w-full shrink-0 flex-row items-center justify-between bg-black/5 px-4 backdrop-blur-md md:absolute md:bg-transparent md:backdrop-blur-none',
        isReaderPage && 'max-md:hidden',
      )}
    >
      <SidebarTrigger className="-ml-1 size-11 text-[#C5A059] hover:text-[#D6B16E] md:size-8" />
    </header>
  )
}
