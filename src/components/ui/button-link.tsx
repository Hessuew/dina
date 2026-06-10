import { createLink } from '@tanstack/react-router'
import { forwardRef } from 'react'
import { buttonVariants } from './button'
import type { VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

type BaseButtonLinkProps = React.ComponentPropsWithoutRef<'a'> &
  VariantProps<typeof buttonVariants>

const BaseButtonLink = forwardRef<HTMLAnchorElement, BaseButtonLinkProps>(
  ({ className, variant, theme, size, ...props }, ref) => (
    <a
      ref={ref}
      data-slot="button"
      className={cn(buttonVariants({ variant, theme, size, className }))}
      {...props}
    />
  ),
)

export const ButtonLink = createLink(BaseButtonLink)
