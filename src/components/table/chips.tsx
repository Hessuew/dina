import {
  AlertCircle,
  Ban,
  BookOpen,
  Brush,
  CheckCircle2,
  CircleDot,
  Clock,
  GraduationCap,
  PenLine,
  PenTool,
  ShieldCheck,
  XCircle,
} from 'lucide-react'
import type { enrollmentEvaluations } from '@/db/schema'
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

type EnrollmentStatusChipProps = {
  status:
    | 'pending'
    | 'under_review'
    | 'awaiting_approval'
    | 'approved'
    | 'rejected'
    | 'waitlisted'
    | 'withdrawn'
    | 'deferred'
  className?: string
}

const ENROLLMENT_STATUS_CONFIG = {
  pending: {
    icon: Clock,
    label: 'Waiting review',
    classes: 'border-white/30 bg-white/20 text-white',
  },
  under_review: {
    icon: AlertCircle,
    label: 'Under review',
    classes: 'border-sky-500/28 bg-sky-950/40 text-sky-400',
  },
  awaiting_approval: {
    icon: ShieldCheck,
    label: 'Awaiting approval',
    classes: 'border-purple-400/80 bg-purple-950/20 text-purple-400',
  },
  approved: {
    icon: CheckCircle2,
    label: 'Approved',
    classes: 'border-green-500/30 bg-green-800/40 text-green-600',
  },
  rejected: {
    icon: XCircle,
    label: 'Rejected',
    classes: 'border-red-600/40 bg-red-950/20 text-red-600',
  },
  waitlisted: {
    icon: CircleDot,
    label: 'Waitlisted',
    classes: 'border-amber-500/40 bg-amber-950/40 text-yellow-600',
  },
  withdrawn: {
    icon: Ban,
    label: 'Withdrawn',
    classes: 'border-white/12 bg-white/4 text-gray-500',
  },
  deferred: {
    icon: CircleDot,
    label: 'Deferred',
    classes: 'border-orange-500/25 bg-orange-950/40 text-orange-600',
  },
} as const

export function EnrollmentStatusChip({
  status,
  className,
}: EnrollmentStatusChipProps) {
  const config = ENROLLMENT_STATUS_CONFIG[status]
  const Icon = config.icon

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[0.75rem] font-medium',
        config.classes,
        className,
      )}
    >
      <Icon className="size-3 shrink-0" />
      {config.label}
    </span>
  )
}

type EnrollmentCategoryChipProps = {
  category: (typeof enrollmentEvaluations.$inferSelect)['admissionCategory']
  className?: string
}

const ENROLLMENT_CATEGORY_CONFIG = {
  new: {
    icon: Brush,
    label: 'New convert',
    iconClass: 'text-teal-600',
  },
  emerging: {
    icon: PenLine,
    label: 'Emerging leader',
    iconClass: 'text-orange-400',
  },
  established: {
    icon: PenTool,
    label: 'Established leader',
    iconClass: 'text-red-600',
  },
} as const

export function EnrollmentCategoryChip({
  category,
  className,
}: EnrollmentCategoryChipProps) {
  if (!category) return null
  const config = ENROLLMENT_CATEGORY_CONFIG[category]
  const Icon = config.icon

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-[0.82rem] text-[#D6CCBE]',
        className,
      )}
    >
      <Icon className={cn('size-4 shrink-0', config.iconClass)} />
      {config.label}
    </span>
  )
}
