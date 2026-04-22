import {
  AlertCircle,
  Ban,
  BookOpen,
  CheckCircle2,
  CircleDot,
  Clock,
  GraduationCap,
  ShieldCheck,
  XCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type RoleChipProps = {
  role: 'student' | 'teacher' | 'admin'
  className?: string
}

const ROLE_CONFIG = {
  admin: {
    icon: ShieldCheck,
    label: 'Admin',
    classes: 'border-[#C5A059]/50 bg-[#1A1716] text-[#E9D9B4]',
  },
  student: {
    icon: GraduationCap,
    label: 'Student',
    classes: 'border-white/14 bg-white/4 text-[#D6CCBE]',
  },
  teacher: {
    icon: BookOpen,
    label: 'Teacher',
    classes: 'border-[#C5A059]/28 bg-[#1A1716]/60 text-[#CFC6B7]',
  },
} as const

export function RoleChip({ role, className }: RoleChipProps) {
  const config = ROLE_CONFIG[role]
  const Icon = config.icon

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 border px-2.5 py-1 text-[0.65rem] font-medium tracking-[0.18em] uppercase',
        config.classes,
        className,
      )}
    >
      <Icon className="size-3 shrink-0" />
      {config.label}
    </span>
  )
}

type InvitationStatusChipProps = {
  status: 'pending' | 'accepted' | 'revoked'
  className?: string
}

const INVITATION_STATUS_CONFIG = {
  accepted: {
    icon: CheckCircle2,
    label: 'Accepted',
    classes: 'border-emerald-500/30 bg-emerald-950/40 text-emerald-400',
  },
  pending: {
    icon: Clock,
    label: 'Pending',
    classes: 'border-[#C5A059]/30 bg-[#1A1716]/60 text-[#D4B373]',
  },
  revoked: {
    icon: XCircle,
    label: 'Revoked',
    classes: 'border-red-500/28 bg-red-950/40 text-red-400',
  },
} as const

export function InvitationStatusChip({
  status,
  className,
}: InvitationStatusChipProps) {
  const config = INVITATION_STATUS_CONFIG[status]
  const Icon = config.icon

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 border px-2.5 py-1 text-[0.65rem] font-medium tracking-[0.18em] uppercase',
        config.classes,
        className,
      )}
    >
      <Icon className="size-3 shrink-0" />
      {config.label}
    </span>
  )
}

type SubmissionStatusChipProps = {
  status: 'draft' | 'submitted' | 'graded' | 'returned'
  className?: string
}

const SUBMISSION_STATUS_CONFIG = {
  draft: {
    icon: CircleDot,
    label: 'Draft',
    classes: 'border-white/12 bg-white/4 text-[#8E816D]',
  },
  graded: {
    icon: CheckCircle2,
    label: 'Graded',
    classes: 'border-[#C5A059]/40 bg-[#1A1716] text-[#E9D9B4]',
  },
  returned: {
    icon: AlertCircle,
    label: 'Returned',
    classes: 'border-[#C5A059]/28 bg-[#1A1716]/60 text-[#D4B373]',
  },
  submitted: {
    icon: Clock,
    label: 'Submitted',
    classes: 'border-emerald-500/28 bg-emerald-950/40 text-emerald-400',
  },
} as const

export function SubmissionStatusChip({
  status,
  className,
}: SubmissionStatusChipProps) {
  const config = SUBMISSION_STATUS_CONFIG[status]
  const Icon = config.icon

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 border px-2.5 py-1 text-[0.65rem] font-medium tracking-[0.18em] uppercase',
        config.classes,
        className,
      )}
    >
      <Icon className="size-3 shrink-0" />
      {config.label}
    </span>
  )
}

type AssignmentStatusChipProps = {
  status: 'draft' | 'published' | 'closed'
  className?: string
}

const ASSIGNMENT_STATUS_CONFIG = {
  closed: {
    icon: Ban,
    label: 'Closed',
    classes: 'border-white/12 bg-white/4 text-[#8E816D]',
  },
  draft: {
    icon: CircleDot,
    label: 'Draft',
    classes: 'border-white/12 bg-white/4 text-[#8E816D]',
  },
  published: {
    icon: CheckCircle2,
    label: 'Published',
    classes: 'border-emerald-500/28 bg-emerald-950/40 text-emerald-400',
  },
} as const

export function AssignmentStatusChip({
  status,
  className,
}: AssignmentStatusChipProps) {
  const config = ASSIGNMENT_STATUS_CONFIG[status]
  const Icon = config.icon

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 border px-2.5 py-1 text-[0.65rem] font-medium tracking-[0.18em] uppercase',
        config.classes,
        className,
      )}
    >
      <Icon className="size-3 shrink-0" />
      {config.label}
    </span>
  )
}
