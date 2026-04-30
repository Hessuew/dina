'use client'

import { motion } from 'motion/react'
import type { Variants } from 'motion/react'

import type { IconProps } from '@/components/animate-ui/icons/icon'
import {
  IconWrapper,
  getVariants,
  useAnimateIconContext,
} from '@/components/animate-ui/icons/icon'

type UserRoundPlusProps = IconProps<keyof typeof animations>

const animations = {
  default: {
    vertical: {
      initial: { opacity: 1 },
      animate: {
        opacity: [0, 1],
        pathLength: [0, 1],
        transition: {
          delay: 0.3,
          duration: 0.2,
          opacity: { duration: 0.1, delay: 0.3 },
        },
      },
    },
    horizontal: {
      initial: { opacity: 1 },
      animate: {
        opacity: [0, 1],
        pathLength: [0, 1],
        transition: {
          delay: 0.6,
          duration: 0.2,
          opacity: { duration: 0.1, delay: 0.6 },
        },
      },
    },
  } satisfies Record<string, Variants>,
} as const

function IconComponent({ size, ...props }: UserRoundPlusProps) {
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
      <path d="M2 21a8 8 0 0 1 13.292-6" />
      <circle cx="10" cy="8" r="5" />
      <motion.path
        d="M19 16v6"
        variants={variants.vertical}
        initial="initial"
        animate={controls}
      />
      <motion.path
        d="M22 19h-6"
        variants={variants.horizontal}
        initial="initial"
        animate={controls}
      />
    </motion.svg>
  )
}

function UserRoundPlus(props: UserRoundPlusProps) {
  return <IconWrapper icon={IconComponent} {...props} />
}

export {
  animations,
  UserRoundPlus,
  UserRoundPlus as UserRoundPlusIcon,
  type UserRoundPlusProps,
  type UserRoundPlusProps as UserRoundPlusIconProps,
}
