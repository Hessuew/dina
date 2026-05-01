'use client'

import { motion } from 'motion/react'
import type { Variants } from 'motion/react'

import type { IconProps } from '@/components/animate-ui/icons/icon'
import {
  IconWrapper,
  getVariants,
  useAnimateIconContext,
} from '@/components/animate-ui/icons/icon'

type GraduationCapProps = IconProps<keyof typeof animations>

const animations = {
  default: {
    group: {
      initial: {
        rotate: 0,
      },
      animate: {
        y: [0, -2, 0],
        rotate: [0, -2, 2, 0],
        transition: {
          duration: 0.6,
          ease: 'easeInOut',
        },
      },
    },
    tassel: {
      initial: { rotate: 0 },
      animate: {
        rotate: [0, 15, -10, 5, 0],
        transition: {
          duration: 0.8,
          ease: 'easeInOut',
          delay: 0.1,
        },
      },
    },
  } satisfies Record<string, Variants>,
} as const

function IconComponent({ size, ...props }: GraduationCapProps) {
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
        variants={variants.group}
        initial="initial"
        animate={controls}
        style={{ transformOrigin: '12px 12px' }}
      >
        <path d="M2 10l10-5 10 5-10 5z" />
        <path d="M6 12v5c3 3 9 3 12 0v-5" />
        <motion.path
          d="M22 10v6"
          variants={variants.tassel}
          initial="initial"
          animate={controls}
          style={{
            transformBox: 'fill-box',
            transformOrigin: 'top center',
          }}
        />
      </motion.g>
    </motion.svg>
  )
}

function GraduationCap(props: GraduationCapProps) {
  return <IconWrapper icon={IconComponent} {...props} />
}

export {
  animations,
  GraduationCap,
  GraduationCap as GraduationCapIcon,
  type GraduationCapProps,
  type GraduationCapProps as GraduationCapIconProps,
}
