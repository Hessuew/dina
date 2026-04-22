import { LandingPublicHeader } from '@/components/landing/hero'
import { SidebarTrigger } from '@/components/ui/sidebar'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

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
    <header className="absolute top-0 z-40 flex h-12 shrink-0 flex-row items-center gap-2 bg-transparent px-4">
      <Tooltip>
        <TooltipTrigger>
          <SidebarTrigger className="-ml-1 text-[#C5A059] hover:text-[#D6B16E]" />
        </TooltipTrigger>
        <TooltipContent side="right">
          <p className="text-[0.7rem]">(CTRL = B)</p>
        </TooltipContent>
      </Tooltip>
    </header>
  )
}
