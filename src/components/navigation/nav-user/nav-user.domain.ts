import { cn } from '@/lib/utils'

type UserTextInput = {
  user: { email: string; fullName?: string }
  isDark: boolean
  compact: boolean
}

export type UserTextView = {
  displayName: string
  email: string
  containerClassName: string
  nameClassName: string
  emailClassName: string
}

export function buildUserTextView({
  user,
  isDark,
  compact,
}: UserTextInput): UserTextView {
  return {
    displayName: user.fullName || user.email,
    email: user.email,
    containerClassName: cn(
      'grid flex-1 text-left',
      compact ? 'text-sm leading-tight' : 'leading-tight',
    ),
    nameClassName: cn(
      'truncate font-medium',
      !compact && 'text-sm',
      !compact && (isDark ? 'text-[#F8F4EC]' : 'text-[#1C1815]'),
    ),
    emailClassName: cn(
      'truncate text-[0.68rem] tracking-[0.04em]',
      isDark ? 'text-[#8E816D]' : 'text-[#5E5549]',
    ),
  }
}
