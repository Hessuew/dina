import { Link, useRouter, useRouterState } from '@tanstack/react-router'
import { LayoutDashboard } from 'lucide-react'
import { ProfileDropdown } from './ProfileDropdown'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

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
  const routerState = useRouterState()
  const isRootPage = routerState.location.pathname === '/'

  const initials = user?.fullName
    ? user.fullName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : user?.email.slice(0, 2).toUpperCase()

  return (
    <header className="bg-card sticky top-0 z-50 border-b">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-4 py-2 sm:px-6">
        <div className="flex items-center gap-4">
          <Link to="/" className="text-xl font-bold">
            Logo
          </Link>
          <Separator orientation="vertical" className="hidden h-4! sm:block" />
          {/* <Breadcrumbs /> */}
        </div>
        <div className="flex items-center gap-1.5">
          {user ? (
            <div className="flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 duration-1000">
              {isRootPage && (
                <Link to="/dashboard" search={{ activeTab: 'courses' }}>
                  <div className="flex items-center gap-2 rounded-md bg-linear-to-r from-primary to-primary/80 px-2 py-1 text-xs font-medium text-white transition-opacity hover:opacity-90">
                    <LayoutDashboard className="size-4" />
                    Dashboard
                  </div>
                </Link>
              )}
              <ProfileDropdown
                user={{
                  ...user,
                  avatarUrl: user.avatarUrl ?? undefined,
                }}
                trigger={
                  <Button variant="ghost" size="icon" className="size-9.5">
                    <Avatar className="size-9.5 rounded-md">
                      <AvatarImage src={user.avatarUrl ?? undefined} />
                      <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>
                  </Button>
                }
                onProfileUpdate={() => router.invalidate()}
              />
            </div>
          ) : (
            <Button
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
      </div>
    </header>
  )
}
