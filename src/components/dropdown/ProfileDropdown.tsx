import { Link } from '@tanstack/react-router'
import { LogOutIcon, UserIcon } from 'lucide-react'
import { useState } from 'react'
import type { ReactElement } from 'react'
import { ProfileModal } from '@/components/modal/ProfileModal'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

type Props = {
  trigger: ReactElement
  user: {
    id: string
    email: string
    fullName?: string
    avatarUrl?: string
    bio?: string
  }
  defaultOpen?: boolean
  align?: 'start' | 'center' | 'end'
  onProfileUpdate?: () => void
}

export function ProfileDropdown({
  trigger,
  user,
  defaultOpen,
  align = 'end',
  onProfileUpdate,
}: Props) {
  const [profileModalOpen, setProfileModalOpen] = useState(false)
  const initials = user.fullName
    ? user.fullName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : user.email.slice(0, 2).toUpperCase()

  return (
    <DropdownMenu defaultOpen={defaultOpen}>
      <DropdownMenuTrigger render={trigger} />
      <DropdownMenuContent className="w-80" align={align}>
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex items-center gap-4 px-4 py-2.5 font-normal">
            <div className="relative">
              <Avatar className="size-10">
                <AvatarImage
                  src={user.avatarUrl}
                  alt={user.fullName || user.email}
                />
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
            </div>
            <div className="flex flex-1 flex-col items-start">
              <span className="text-foreground text-lg font-semibold">
                {user.fullName || 'User'}
              </span>
              <span className="text-muted-foreground text-base">
                {user.email}
              </span>
            </div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuItem
            className="flex size-full flex-row gap-2 p-4 py-2.5"
            onClick={() => setProfileModalOpen(true)}
          >
            <UserIcon className="text-foreground size-5" />
            <span>My Profile</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <Link to="/logout" className="block">
            <DropdownMenuItem
              variant="destructive"
              className="flex flex-row gap-2 p-4 pt-2.5 pb-2 text-base"
            >
              <LogOutIcon className="size-5" />
              <span>Logout</span>
            </DropdownMenuItem>
          </Link>
        </DropdownMenuGroup>
      </DropdownMenuContent>

      <ProfileModal
        open={profileModalOpen}
        onOpenChange={setProfileModalOpen}
        user={user}
        onProfileUpdate={onProfileUpdate}
      />
    </DropdownMenu>
  )
}
