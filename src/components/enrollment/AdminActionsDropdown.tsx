import {
  GraduationCapIcon,
  MessageCircleIcon,
  UserRoundXIcon,
  UsersIcon,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { AnimateIcon } from '@/components/animate-ui/icons/icon'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'

type AdminAction = {
  icon: LucideIcon
  label: string
  onClick: () => void
  disabled?: boolean
}

type AdminActionsDropdownProps = {
  onDistribute: () => void
  onStartSubstitution: () => void
  onEndSubstitution: () => void
  onBulkGrade: () => void
  onSendWhatsApp: () => void
  isDistributing?: boolean
  disabled?: boolean
}

function AdminMenuItem({ icon: Icon, label, onClick, disabled }: AdminAction) {
  return (
    <DropdownMenuItem
      className="group/button mx-0 rounded-none px-3 py-0 text-sm text-[#D6CCBE] transition-all hover:bg-white/8 hover:text-[#F8F4EC] focus:bg-white/8 focus:text-[#F8F4EC]"
      onClick={onClick}
      disabled={disabled}
    >
      <AnimateIcon
        animateOnHover
        className="flex h-full w-full flex-row items-center gap-2 py-2"
      >
        <Icon className="size-4 shrink-0 text-[#C5A059] group-hover/button:text-[#C5A059] group-focus/button:text-[#C5A059]" />
        {label}
      </AnimateIcon>
    </DropdownMenuItem>
  )
}

function buildAdminActions({
  onDistribute,
  onStartSubstitution,
  onEndSubstitution,
  onBulkGrade,
  onSendWhatsApp,
  isDistributing = false,
}: Omit<AdminActionsDropdownProps, 'disabled'>): Array<AdminAction> {
  return [
    {
      icon: UsersIcon,
      label: isDistributing ? 'Distributing…' : 'Distribute unassigned',
      onClick: onDistribute,
      disabled: isDistributing,
    },
    {
      icon: UsersIcon,
      label: 'Substitute teacher',
      onClick: onStartSubstitution,
    },
    {
      icon: UserRoundXIcon,
      label: 'End substitution',
      onClick: onEndSubstitution,
    },
    {
      icon: GraduationCapIcon,
      label: 'Bulk grade',
      onClick: onBulkGrade,
    },
    {
      icon: MessageCircleIcon,
      label: 'Send WhatsApp',
      onClick: onSendWhatsApp,
    },
  ]
}

export function AdminActionsDropdown({
  disabled = false,
  ...actionProps
}: AdminActionsDropdownProps) {
  const actions = buildAdminActions(actionProps)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            theme="light"
            variant="outline"
            disabled={disabled}
            className="rounded-none"
          >
            <UsersIcon className="size-3.5" />
            Admin actions
          </Button>
        }
      />
      <DropdownMenuContent
        className="min-w-48 rounded-none border border-white/10 bg-[#151515] text-[#F8F4EC] shadow-[0_22px_44px_-28px_rgba(0,0,0,0.6)]"
        align="end"
        sideOffset={4}
      >
        {actions.map((action) => (
          <AdminMenuItem key={action.label} {...action} />
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
