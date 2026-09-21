import { LandingPublicHeader } from '@/components/landing/hero'
import { SidebarTrigger } from '@/components/ui/sidebar/Sidebar'

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
  if (!user) {
    return <LandingPublicHeader />
  }

  return (
    <header className="fixed top-0 z-40 flex h-12 w-full shrink-0 flex-row items-center justify-between bg-black/5 px-4 backdrop-blur-md md:absolute md:bg-transparent md:backdrop-blur-none">
      <SidebarTrigger className="-ml-1 size-11 text-[#C5A059] hover:text-[#D6B16E] md:size-8" />
    </header>
  )
}
