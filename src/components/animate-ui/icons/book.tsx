'use client'

import { motion } from 'motion/react'
import type { Variants } from 'motion/react'

import type { IconProps } from '@/components/animate-ui/icons/icon'
import {
  IconWrapper,
  getVariants,
  useAnimateIconContext,
} from '@/components/animate-ui/icons/icon'

type BookTextProps = IconProps<keyof typeof animations>

const animations = {
  default: {
    book: {
      initial: {
        scale: 1,
        rotate: 0,
        y: 0,
      },
      animate: {
        scale: [1, 1.04, 1],
        rotate: [0, -8, 8, -8, 0],
        y: [0, -2, 0],
        transition: {
          duration: 0.6,
          ease: 'easeInOut',
          times: [0, 0.2, 0.5, 0.8, 1],
        },
      },
    },
  } satisfies Record<string, Variants>,
} as const

function IconComponent({ size, ...props }: BookTextProps) {
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
      <motion.g variants={variants.book} initial="initial" animate={controls}>
        <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20" />
        <path d="M8 11h8" />
        <path d="M8 7h6" />
      </motion.g>
    </motion.svg>
  )
}

function BookText(props: BookTextProps) {
  return <IconWrapper icon={IconComponent} {...props} />
}

export {
  animations,
  BookText,
  BookText as BookTextIcon,
  type BookTextProps,
  type BookTextProps as BookTextIconProps,
}
