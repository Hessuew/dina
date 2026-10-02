import { Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function StarToggle({
  starred,
  onToggle,
  theme = 'dark',
  className,
}: {
  starred: boolean
  onToggle: () => void
  theme?: 'light' | 'dark'
  className?: string
}) {
  return (
    <Button
      variant="ghost"
      theme={theme}
      size="icon"
      className={className}
      aria-label={starred ? 'Remove from starred' : 'Add to starred'}
      aria-pressed={starred}
      onClick={onToggle}
    >
      <Star
        className={cn('size-4', starred && 'fill-[#C5A059] text-[#C5A059]')}
      />
    </Button>
  )
}
