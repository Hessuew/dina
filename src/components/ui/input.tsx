import * as React from 'react'
import { Input as InputPrimitive } from '@base-ui/react/input'

import { cn } from '@/lib/utils'

// Maybe used later
// const inputThemes = {
//   light:
//     'h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40',
//   dark: 'h-11 w-full min-w-0 rounded-none border border-white/14 bg-black/20 px-3 py-2 text-base text-[#F8F4EC] transition-colors outline-none placeholder:text-[#9B8A73] focus-visible:border-[#C5A059]/60 focus-visible:ring-3 focus-visible:ring-[#C5A059]/20 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-red-500/60 aria-invalid:ring-3 aria-invalid:ring-red-500/20 md:text-sm',
// }

function Input({
  className,
  type,
  theme = 'light',
  ...props
}: React.ComponentProps<'input'> & { theme?: 'light' | 'dark' }) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        'h-11 w-full min-w-0 rounded-none border border-white/14 bg-black/20 px-3 py-2 text-base text-[#F8F4EC] transition-colors outline-none placeholder:text-[#9B8A73] focus-visible:border-[#C5A059]/60 focus-visible:ring-3 focus-visible:ring-[#C5A059]/20 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-red-500/60 aria-invalid:ring-3 aria-invalid:ring-red-500/20 md:text-sm',
        // 'border-input file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 disabled:bg-input/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 h-8 w-full min-w-0 rounded-lg border bg-transparent px-2.5 py-1 text-base transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:ring-3 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:ring-3 md:text-sm',
        className,
      )}
      {...props}
    />
  )
}

export { Input }
