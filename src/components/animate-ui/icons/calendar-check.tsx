'use client'

import { motion } from 'motion/react'
import type { Variants } from 'motion/react'

import type { IconProps } from '@/components/animate-ui/icons/icon'
import {
  IconWrapper,
  getVariants,
  useAnimateIconContext,
} from '@/components/animate-ui/icons/icon'

type CalendarCheckProps = IconProps<keyof typeof animations>

const animations = {
  default: {
    check: {
      initial: {
        pathLength: 1,
        opacity: 1,
      },
      animate: {
        pathLength: [0, 1],
        opacity: [0, 1],
        transition: {
          pathLength: { duration: 0.4, ease: 'easeInOut' },
          opacity: { duration: 0.4, ease: 'easeInOut' },
        },
      },
    },
  } satisfies Record<string, Variants>,
} as const

function IconComponent({ size, ...props }: CalendarCheckProps) {
  const { controls } = useAnimateIconContext()
  const variants = getVariants(animations)

  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M8 2v4" />
      <path d="M16 2v4" />
      <rect height="18" rx="2" width="18" x="3" y="4" />
      <path d="M3 10h18" />
      <motion.path
        d="m9 16 2 2 4-4"
        variants={variants.check}
        initial="initial"
        animate={controls}
      />
    </motion.svg>
  )
}

function CalendarCheck(props: CalendarCheckProps) {
  return <IconWrapper icon={IconComponent} {...props} />
}

export {
  animations,
  CalendarCheck,
  CalendarCheck as CalendarCheckIcon,
  type CalendarCheckProps,
  type CalendarCheckProps as CalendarCheckIconProps,
}
