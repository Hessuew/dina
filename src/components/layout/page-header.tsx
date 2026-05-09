import { ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface PageHeaderProps {
  title: string
  onBack: () => void
  metadata?: React.ReactNode
  actions?: React.ReactNode
  responsiveTitle?: boolean
}

export function PageHeader({
  title,
  onBack,
  metadata,
  actions,
  responsiveTitle = true,
}: PageHeaderProps) {
  return (
    <div className="mb-10">
      <Button
        variant="ghost"
        theme="light"
        size="sm"
        className="mb-6 gap-1"
        onClick={onBack}
      >
        <ChevronLeft className="size-3.5" />
        Back
      </Button>

      <div className="flex items-start justify-between gap-6">
        <div>
          <div className="h-px w-10 bg-[#C5A059]/50" />
          <h1
            className={cn(
              'mt-3 font-serif text-3xl tracking-[-0.02em] text-[#1C1815]',
              responsiveTitle && 'sm:text-4xl',
            )}
          >
            {title}
          </h1>
          {metadata && (
            <div className="mt-3 flex items-center gap-4 text-[0.68rem] text-[#9B8C7C]">
              {metadata}
            </div>
          )}
        </div>

        {actions && <div className="flex items-center gap-3 pt-4">{actions}</div>}
      </div>
    </div>
  )
}
