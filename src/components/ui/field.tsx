import * as React from 'react'
import { cn } from '@/lib/utils'

const FieldGroup = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('flex flex-col gap-4', className)} {...props} />
))
FieldGroup.displayName = 'FieldGroup'

const Field = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('flex flex-col gap-2', className)} {...props} />
))
Field.displayName = 'Field'

const FieldLabel = React.forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement> & { theme?: 'light' | 'dark' }
>(({ className, theme = 'light', ...props }, ref) => (
  <label
    ref={ref}
    className={cn(
      theme === 'dark'
        ? 'text-[0.68rem] font-medium tracking-[0.06em] text-[#C5A059]/70 uppercase'
        : 'text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
      className,
    )}
    {...props}
  />
))
FieldLabel.displayName = 'FieldLabel'

const FieldDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement> & { theme?: 'light' | 'dark' }
>(({ className, theme = 'light', ...props }, ref) => (
  <p
    ref={ref}
    className={cn(
      theme === 'dark'
        ? 'text-[0.7rem] leading-none tracking-[0.06em] text-[#C5A059]/70'
        : 'text-muted-foreground text-sm',
      className,
    )}
    {...props}
  />
))
FieldDescription.displayName = 'FieldDescription'

export { Field, FieldGroup, FieldLabel, FieldDescription }
