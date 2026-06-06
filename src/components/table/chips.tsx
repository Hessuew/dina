import {
  AlertCircle,
  Ban,
  BookOpen,
  CheckCircle2,
  CircleDot,
  Clock,
  GraduationCap,
  ShieldCheck,
  UserCheck,
  Users,
  XCircle,
} from 'lucide-react'
import type { AssignmentStatus, SubmissionStatus } from '@/types/database.types'
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
    label: 'Pending',
    classes: 'border-[#C5A059]/30 bg-[#1A1716]/60 text-[#D4B373]',
  },
  under_review: {
    icon: AlertCircle,
    label: 'Under review',
    classes: 'border-sky-500/28 bg-sky-950/40 text-[#7dd3fc]',
  },
  awaiting_approval: {
    icon: ShieldCheck,
    label: 'Awaiting approval',
    classes: 'border-[#C5A059]/50 bg-[#1A1716] text-[#c084fc]',
  },
  approved: {
    icon: CheckCircle2,
    label: 'Approved',
    classes: 'border-emerald-500/30 bg-emerald-950/40 text-[#34d399]',
  },
  rejected: {
    icon: XCircle,
    label: 'Rejected',
    classes: 'border-red-500/28 bg-red-950/40 text-[#f87171]',
  },
  waitlisted: {
    icon: CircleDot,
    label: 'Waitlisted',
    classes: 'border-amber-500/28 bg-amber-950/40 text-[#fbbf24]',
  },
  withdrawn: {
    icon: Ban,
    label: 'Withdrawn',
    classes: 'border-white/12 bg-white/4 text-[#9ca3af]',
  },
  deferred: {
    icon: CircleDot,
    label: 'Deferred',
    classes: 'border-orange-500/25 bg-orange-950/40 text-[#fde047]',
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

type PeerReviewChipProps = {
  state: 'under_peer_review' | 'peer_reviewed'
  className?: string
}

const PEER_REVIEW_CONFIG = {
  under_peer_review: {
    icon: Users,
    label: 'Under peer review',
    color: 'text-[#f472b6]',
  },
  peer_reviewed: {
    icon: UserCheck,
    label: 'Peer reviewed',
    color: 'text-[#22d3ee]',
  },
} as const

export function PeerReviewChip({ state, className }: PeerReviewChipProps) {
  const config = PEER_REVIEW_CONFIG[state]
  const Icon = config.icon

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-[0.82rem] text-[#AFA28F]',
        className,
      )}
    >
      <Icon className={cn('size-4 shrink-0', config.color)} />
      {config.label}
    </span>
  )
}

type SubmissionStatusChipProps = {
  status: SubmissionStatus
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
  status: AssignmentStatus
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
