import { Link, useRouter } from '@tanstack/react-router'
import { LayoutDashboard } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
  const router = useRouter()

  return (
    <header className="bg-card flex h-12 shrink-0 items-center justify-between gap-2 border-b px-4">
      {user ? (
        <SidebarTrigger className="-ml-1" />
      ) : (
        <Link
          to="/"
          className="animate-in fade-in slide-in-from-bottom-2 flex flex-row gap-4 duration-1000"
        >
          <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
            <LayoutDashboard className="size-4" />
          </div>
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-semibold">Logo</span>
            <span className="truncate text-xs">Learning Platform</span>
          </div>
        </Link>
      )}
      <div className="flex items-center gap-1.5">
        {!user && (
          <Button
            className="animate-in fade-in slide-in-from-bottom-2 duration-1000"
            onClick={() =>
              router.navigate({
                to: '/login',
              })
            }
          >
            Sign In
          </Button>
        )}
      </div>
    </header>
  )
}
