import { cn } from '@/lib/utils'

export type StatusChipVariant =
  | 'published'
  | 'draft'
  | 'closed'
  | 'submitted'
  | 'graded'
  | 'not-submitted'
  | 'returned'

type StatusChipSize = 'sm' | 'md'

interface StatusChipProps {
  variant: StatusChipVariant
  size?: StatusChipSize
  className?: string
}

const variantColors: Record<StatusChipVariant, string> = {
  published: 'border-[#C5A059]/40 text-[#9B7A41]',
  draft: 'border-white/12 text-[#8E816D]',
  closed: 'border-red-400/50 text-red-400',
  submitted: 'border-blue-300/60 text-blue-600',
  graded: 'border-[#C5A059]/40 text-[#9B7A41]',
  'not-submitted': 'border-[#1A1A1A]/10 text-[#9B8C7C]',
  returned: 'border-[#1A1A1A]/10 text-[#9B8C7C]',
}

const sizeClasses: Record<StatusChipSize, string> = {
  sm: 'px-2 py-0.5 text-[0.55rem]',
  md: 'px-3 py-1.5 text-[0.62rem]',
}

const variantLabels: Record<StatusChipVariant, string> = {
  published: 'Published',
  draft: 'Draft',
  closed: 'Closed',
  submitted: 'Submitted',
  graded: 'Graded',
  'not-submitted': 'Not Submitted',
  returned: 'Returned',
}

export function StatusChip({
  variant,
  size = 'sm',
  className,
}: StatusChipProps) {
  return (
    <span
      className={cn(
        'inline-block border font-medium tracking-[0.18em] uppercase',
        variantColors[variant],
        sizeClasses[size],
        className,
      )}
    >
      {variantLabels[variant]}
    </span>
  )
}
