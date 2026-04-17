import { LandingPublicHeader } from '@/components/landing/hero'
import { SidebarTrigger } from '@/components/ui/sidebar'

type User = {
  id: string
  email: string
  fullName?: string
  avatarUrl?: string | null
}

type HeaderProps = {
  user: User | null
}

export function Header({ user }: HeaderProps) {
  if (!user) {
    return <LandingPublicHeader />
  }

  return (
    <header className="top-0 z-40 flex h-12 shrink-0 items-center gap-2 border-b border-white/8 bg-transparent px-4 backdrop-blur-md">
      <SidebarTrigger className="-ml-1 text-[#C5A059] hover:text-[#D6B16E]" />
    </header>
  )
}
