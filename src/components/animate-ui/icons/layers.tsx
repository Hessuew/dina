'use client'

import { motion } from 'motion/react'
import type { Variants } from 'motion/react'

import type { IconProps } from '@/components/animate-ui/icons/icon'
import {
  IconWrapper,
  getVariants,
  useAnimateIconContext,
} from '@/components/animate-ui/icons/icon'

type LayersProps = IconProps<keyof typeof animations>

const animations = {
  default: {
    path2: {
      initial: { y: 0 },
      animate: {
        y: [-9, 0],
        transition: {
          type: 'spring',
          stiffness: 100,
          damping: 14,
          mass: 1,
        },
      },
    },
    path3: {
      initial: { y: 0 },
      animate: {
        y: [-5, 0],
        transition: {
          type: 'spring',
          stiffness: 100,
          damping: 14,
          mass: 1,
        },
      },
    },
  } satisfies Record<string, Variants>,
} as const

function IconComponent({ size, ...props }: LayersProps) {
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
      <path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" />
      <motion.path
        d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"
        variants={variants.path2}
        initial="initial"
        animate={controls}
      />
      <motion.path
        d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"
        variants={variants.path3}
        initial="initial"
        animate={controls}
      />
    </motion.svg>
  )
}

function Layers(props: LayersProps) {
  return <IconWrapper icon={IconComponent} {...props} />
}

export { Layers as LayersIcon, type LayersProps }
