import { Link } from '@tanstack/react-router'
import { Breadcrumbs } from './Breadcrumbs'
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
          <Breadcrumbs />
        </div>
        <div className="flex items-center gap-1.5">
          {user ? (
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
            />
          ) : (
            <Button render={<Link to="/login" />}>Sign In</Button>
          )}
        </div>
      </div>
    </header>
  )
}
