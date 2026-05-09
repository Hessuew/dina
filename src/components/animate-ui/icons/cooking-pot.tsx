'use client'

import { motion } from 'motion/react'
import type { Variants } from 'motion/react'

import type { IconProps } from '@/components/animate-ui/icons/icon'
import {
  IconWrapper,
  getVariants,
  useAnimateIconContext,
} from '@/components/animate-ui/icons/icon'

type CookingPotProps = IconProps<keyof typeof animations>

const animations = {
  default: {
    pot: {
      initial: { scale: 1 },
      animate: {
        scale: [1, 1.08, 1],
        transition: {
          duration: 0.95,
          ease: 'easeInOut',
        },
      },
    },
    lid: {
      initial: { rotate: 0 },
      animate: {
        rotate: [0, -14, 14, -10, 10, -6, 6, 0],
        transition: {
          duration: 0.9,
          ease: 'easeInOut',
        },
      },
    },
  } satisfies Record<string, Variants>,
} as const

function IconComponent({ size, ...props }: CookingPotProps) {
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
      <motion.g
        variants={variants.pot}
        initial="initial"
        animate={controls}
        style={{ transformOrigin: '12px 16px' }}
      >
        <path d="M2 12h20" />
        <path d="M20 12v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8" />
      </motion.g>
      <motion.g
        variants={variants.lid}
        initial="initial"
        animate={controls}
        style={{ transformOrigin: '18px 6px' }}
      >
        <path d="m4 8 16-4" />
        <path d="m8.86 6.78-.45-1.81a2 2 0 0 1 1.45-2.43l1.94-.48a2 2 0 0 1 2.43 1.46l.45 1.8" />
      </motion.g>
    </motion.svg>
  )
}

function CookingPot(props: CookingPotProps) {
  return <IconWrapper icon={IconComponent} {...props} />
}

export {
  animations,
  CookingPot,
  CookingPot as CookingPotIcon,
  type CookingPotProps,
  type CookingPotProps as CookingPotIconProps,
}
