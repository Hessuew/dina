import * as React from 'react'

import { cn } from '@/lib/utils'

interface DarkCardProps extends React.ComponentProps<'div'> {
  label: string
  children: React.ReactElement
}

export function DarkCard({ label, children, className, ...props }: DarkCardProps) {
  return (
    <div className={cn('bg-[#151515]/88 px-6 py-6', className)} {...props}>
      <div className="h-px w-8 bg-[#C5A059]/40" />
      <div className="mt-2 text-[0.62rem] font-medium tracking-[0.3em] text-[#8E816D] uppercase">
        {label}
      </div>
      {children}
    </div>
  )
}
