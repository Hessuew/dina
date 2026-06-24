'use client'

import * as React from 'react'
import { motion, useAnimation, useInView } from 'motion/react'
import {
  computeVariants,
  resolveOverriddenAnimateProps,
} from './icon-animation.domain'
import type {
  HTMLMotionProps,
  LegacyAnimationControls,
  SVGMotionProps,
  UseInViewOptions,
  Variants,
} from 'motion/react'

import type { WithAsChild } from '@/components/animate-ui/primitives/animate/slot'
import { cn } from '@/lib/utils'
import { Slot } from '@/components/animate-ui/primitives/animate/slot'

const staticAnimations = {
  path: {
    initial: { pathLength: 1 },
    animate: {
      pathLength: [0.05, 1],
      transition: {
        duration: 0.8,
        ease: 'easeInOut',
      },
    },
  } as Variants,
  'path-loop': {
    initial: { pathLength: 1 },
    animate: {
      pathLength: [1, 0.05, 1],
      transition: {
        duration: 1.6,
        ease: 'easeInOut',
      },
    },
  } as Variants,
} as const

type StaticAnimations = keyof typeof staticAnimations
type TriggerProp<T = string> = boolean | StaticAnimations | T
type Trigger = TriggerProp<string>

type AnimateIconContextValue = {
  controls: LegacyAnimationControls | undefined
  animation: StaticAnimations | string
  loop: boolean
  loopDelay: number
  active: boolean
  animate?: Trigger
  initialOnAnimateEnd?: boolean
  completeOnStop?: boolean
  persistOnAnimateEnd?: boolean
  delay?: number
}

type DefaultIconProps<T = string> = {
  animate?: TriggerProp<T>
  animateOnHover?: TriggerProp<T>
  animateOnTap?: TriggerProp<T>
  animateOnView?: TriggerProp<T>
  animateOnViewMargin?: UseInViewOptions['margin']
  animateOnViewOnce?: boolean
  animation?: T | StaticAnimations
  loop?: boolean
  loopDelay?: number
  initialOnAnimateEnd?: boolean
  completeOnStop?: boolean
  persistOnAnimateEnd?: boolean
  delay?: number
}

type AnimateIconProps<T = string> = WithAsChild<
  HTMLMotionProps<'span'> &
    DefaultIconProps<T> & {
      children: React.ReactNode
      asChild?: boolean
    }
>

type IconProps<T> = DefaultIconProps<T> &
  Omit<SVGMotionProps<SVGSVGElement>, 'animate'> & {
    size?: number
  }

type IconWrapperProps<T> = IconProps<T> & {
  icon: React.ComponentType<IconProps<T>>
}

const AnimateIconContext = React.createContext<AnimateIconContextValue | null>(
  null,
)

function useAnimateIconContext() {
  const context = React.useContext(AnimateIconContext)
  if (!context)
    return {
      controls: undefined,
      animation: 'default',
      loop: undefined,
      loopDelay: undefined,
      active: undefined,
      animate: undefined,
      initialOnAnimateEnd: undefined,
      completeOnStop: undefined,
      persistOnAnimateEnd: undefined,
      delay: undefined,
    }
  return context
}

function composeEventHandlers<T extends React.SyntheticEvent<unknown>>(
  theirs?: (event: T) => void,
  ours?: (event: T) => void,
) {
  return (event: T) => {
    theirs?.(event)
    ours?.(event)
  }
}

type AnyProps = Record<string, any>

function AnimateIcon({
  asChild = false,
  animate = false,
  animateOnHover = false,
  animateOnTap = false,
  animateOnView = false,
  animateOnViewMargin = '0px',
  animateOnViewOnce = true,
  animation = 'default',
  loop = false,
  loopDelay = 0,
  initialOnAnimateEnd = false,
  completeOnStop = false,
  persistOnAnimateEnd = false,
  delay = 0,
  children,
  ...props
}: AnimateIconProps) {
  const controls = useAnimation()

  const [localAnimate, setLocalAnimate] = React.useState<boolean>(() => {
    if (animate === false) return false
    return delay <= 0
  })
  const [currentAnimation, setCurrentAnimation] = React.useState<
    string | StaticAnimations
  >(typeof animate === 'string' ? animate : animation)
  const [status, setStatus] = React.useState<'initial' | 'animate'>('initial')

  const delayRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const loopDelayRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const isAnimateInProgressRef = React.useRef<boolean>(false)
  const animateEndPromiseRef = React.useRef<Promise<void> | null>(null)
  const resolveAnimateEndRef = React.useRef<(() => void) | null>(null)
  const activeRef = React.useRef<boolean>(localAnimate)

  const runGenRef = React.useRef(0)
  const cancelledRef = React.useRef(false)

  const bumpGeneration = React.useCallback(() => {
    runGenRef.current++
  }, [])

  const startAnimation = React.useCallback(
    (trigger: TriggerProp) => {
      const next = typeof trigger === 'string' ? trigger : animation
      bumpGeneration()
      if (delayRef.current) {
        clearTimeout(delayRef.current)
        delayRef.current = null
      }
      setCurrentAnimation(next)
      if (delay > 0) {
        setLocalAnimate(false)
        delayRef.current = setTimeout(() => {
          setLocalAnimate(true)
        }, delay)
      } else {
        setLocalAnimate(true)
      }
    },
    [animation, delay, bumpGeneration],
  )

  const stopAnimation = React.useCallback(() => {
    bumpGeneration()
    if (delayRef.current) {
      clearTimeout(delayRef.current)
      delayRef.current = null
    }
    if (loopDelayRef.current) {
      clearTimeout(loopDelayRef.current)
      loopDelayRef.current = null
    }
    setLocalAnimate(false)
  }, [bumpGeneration])

  React.useEffect(() => {
    activeRef.current = localAnimate
  }, [localAnimate])

  React.useEffect(() => {
    setCurrentAnimation(animate ? (animate as string) : animation)
    if (animate) startAnimation(animate as TriggerProp)
    else stopAnimation()
  }, [animate])

  React.useEffect(() => {
    return () => {
      if (delayRef.current) clearTimeout(delayRef.current)
      if (loopDelayRef.current) clearTimeout(loopDelayRef.current)
    }
  }, [])

  const viewOuterRef = React.useRef<HTMLElement>(null)
  const inViewResult = useInView(viewOuterRef, {
    once: animateOnViewOnce,
    margin: animateOnViewMargin,
  })
  const isInView = !animateOnView || inViewResult

  const startAnim = React.useCallback(
    async (anim: 'initial' | 'animate', method: 'start' | 'set' = 'start') => {
      try {
        await controls[method](anim)
        setStatus(anim)
      } catch {
        return
      }
    },
    [controls],
  )

  React.useEffect(() => {
    if (!animateOnView) return
    if (isInView) startAnimation(animateOnView)
    else stopAnimation()
  }, [isInView, animateOnView, startAnimation, stopAnimation])

  React.useEffect(() => {
    const gen = ++runGenRef.current
    cancelledRef.current = false

    const isStaleRun = () => gen !== runGenRef.current

    const resetInitialIfStale = async () => {
      if (!isStaleRun()) return false
      await startAnim('initial')
      return true
    }

    const clearAnimationEndState = () => {
      isAnimateInProgressRef.current = false
      resolveAnimateEndRef.current?.()
      resolveAnimateEndRef.current = null
      animateEndPromiseRef.current = null
    }

    const resetActiveAnimationIfStale = async () => {
      if (!isStaleRun()) return false
      clearAnimationEndState()
      await startAnim('initial')
      return true
    }

    const completeStoppedAnimation = async () => {
      if (
        !completeOnStop ||
        !isAnimateInProgressRef.current ||
        !animateEndPromiseRef.current
      ) {
        return
      }

      try {
        await animateEndPromiseRef.current
      } catch {
        // noop
      }
    }

    const waitForLoopDelay = () =>
      new Promise<void>((resolve) => {
        loopDelayRef.current = setTimeout(() => {
          loopDelayRef.current = null
          resolve()
        }, loopDelay)
      })

    const stopInactiveLoop = async () => {
      if (activeRef.current) return false
      if (status !== 'initial' && !persistOnAnimateEnd) {
        await startAnim('initial')
      }
      return true
    }

    const runInactiveBranch = async () => {
      await completeStoppedAnimation()
      if (persistOnAnimateEnd) return
      if (await resetInitialIfStale()) return
      await startAnim('initial')
    }

    const resetForLoopStart = async () => {
      if (!loop) return false
      if (await resetInitialIfStale()) return true
      await startAnim('initial', 'set')
      return false
    }

    const runAnimatePhase = async () => {
      isAnimateInProgressRef.current = true
      animateEndPromiseRef.current = new Promise<void>((resolve) => {
        resolveAnimateEndRef.current = resolve
      })
      if (await resetActiveAnimationIfStale()) return true
      await startAnim('animate')
      if (await resetActiveAnimationIfStale()) return true
      clearAnimationEndState()
      return false
    }

    const resetAfterAnimateEnd = async () => {
      if (!initialOnAnimateEnd) return false
      if (await resetInitialIfStale()) return true
      await startAnim('initial', 'set')
      return false
    }

    const continueLoop = async () => {
      if (!loop) return
      if (loopDelay > 0) {
        await waitForLoopDelay()
        if (await resetInitialIfStale()) return
      }
      if (await stopInactiveLoop()) return
      if (await resetInitialIfStale()) return
      await run()
    }

    async function run() {
      if (cancelledRef.current) {
        await startAnim('initial')
        return
      }
      if (await resetInitialIfStale()) return
      if (!localAnimate) {
        await runInactiveBranch()
        return
      }
      if (await resetForLoopStart()) return
      if (await runAnimatePhase()) return
      if (await resetAfterAnimateEnd()) return
      await continueLoop()
    }

    void run()

    return () => {
      cancelledRef.current = true
      if (delayRef.current) {
        clearTimeout(delayRef.current)
        delayRef.current = null
      }
      if (loopDelayRef.current) {
        clearTimeout(loopDelayRef.current)
        loopDelayRef.current = null
      }
    }
  }, [localAnimate, controls])

  const childProps = (
    React.isValidElement(children) ? (children as React.ReactElement).props : {}
  ) as AnyProps

  const handleMouseEnter = composeEventHandlers<React.MouseEvent<HTMLElement>>(
    childProps.onMouseEnter,
    () => {
      if (animateOnHover) startAnimation(animateOnHover)
    },
  )

  const handleMouseLeave = composeEventHandlers<React.MouseEvent<HTMLElement>>(
    childProps.onMouseLeave,
    () => {
      if (animateOnHover || animateOnTap) stopAnimation()
    },
  )

  const handlePointerDown = composeEventHandlers<
    React.PointerEvent<HTMLElement>
  >(childProps.onPointerDown, () => {
    if (animateOnTap) startAnimation(animateOnTap)
  })

  const handlePointerUp = composeEventHandlers<React.PointerEvent<HTMLElement>>(
    childProps.onPointerUp,
    () => {
      if (animateOnTap) stopAnimation()
    },
  )

  const content = asChild ? (
    <Slot
      ref={viewOuterRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      {...props}
    >
      {children}
    </Slot>
  ) : (
    <motion.span
      ref={viewOuterRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      {...props}
    >
      {children}
    </motion.span>
  )

  return (
    <AnimateIconContext.Provider
      value={{
        controls,
        animation: currentAnimation,
        loop,
        loopDelay,
        active: localAnimate,
        animate,
        initialOnAnimateEnd,
        completeOnStop,
        delay,
      }}
    >
      {content}
    </AnimateIconContext.Provider>
  )
}

const pathClassName =
  "[&_[stroke-dasharray='1px_1px']]:![stroke-dasharray:1px_0px]"

type IconAnimationOptions<T = string> = Pick<
  DefaultIconProps<T>,
  | 'animate'
  | 'animateOnHover'
  | 'animateOnTap'
  | 'animateOnView'
  | 'animateOnViewMargin'
  | 'animateOnViewOnce'
  | 'animation'
  | 'loop'
  | 'loopDelay'
  | 'persistOnAnimateEnd'
  | 'initialOnAnimateEnd'
  | 'delay'
  | 'completeOnStop'
>

type IconSvgProps = Omit<SVGMotionProps<SVGSVGElement>, 'animate'>

function hasIconAnimationOverrides<T>({
  animate,
  animateOnHover,
  animateOnTap,
  animateOnView,
  loop,
  loopDelay,
  initialOnAnimateEnd,
  persistOnAnimateEnd,
  delay,
  completeOnStop,
}: IconAnimationOptions<T>): boolean {
  return [
    animate,
    animateOnHover,
    animateOnTap,
    animateOnView,
    loop,
    loopDelay,
    initialOnAnimateEnd,
    persistOnAnimateEnd,
    delay,
    completeOnStop,
  ].some((value) => value !== undefined)
}

function hasStandaloneAnimation<T>({
  animate,
  animateOnHover,
  animateOnTap,
  animateOnView,
  animation,
}: IconAnimationOptions<T>): boolean {
  return [animate, animateOnHover, animateOnTap, animateOnView, animation].some(
    (value) => value !== undefined,
  )
}

function isPathAnimation(animation: string | undefined): boolean {
  return animation === 'path' || animation === 'path-loop'
}

function getIconClassName<T extends string>(
  className: IconProps<T>['className'],
  animation: string | undefined,
) {
  return cn(className, isPathAnimation(animation) && pathClassName)
}

function renderIconComponent<T extends string>(
  IconComponent: React.ComponentType<any>,
  size: number,
  className: IconProps<T>['className'],
  animation: string | undefined,
  props: IconSvgProps,
) {
  return (
    <IconComponent
      size={size}
      className={getIconClassName(className, animation)}
      {...props}
    />
  )
}

function renderIconWithOverrides<T extends string>(
  IconComponent: React.ComponentType<IconProps<T>>,
  size: number,
  className: IconProps<T>['className'],
  options: IconAnimationOptions<T>,
  props: IconSvgProps,
  context: AnimateIconContextValue,
) {
  const resolved = resolveOverriddenAnimateProps(options, context)

  return (
    <AnimateIcon {...resolved}>
      {renderIconComponent(
        IconComponent,
        size,
        className,
        resolved.animation,
        props,
      )}
    </AnimateIcon>
  )
}

function renderInheritedIcon<T extends string>(
  IconComponent: React.ComponentType<IconProps<T>>,
  size: number,
  className: IconProps<T>['className'],
  animationProp: T | StaticAnimations | undefined,
  props: IconSvgProps,
  context: AnimateIconContextValue,
) {
  const animationToUse = animationProp ?? context.animation

  return (
    <AnimateIconContext.Provider
      value={{
        controls: context.controls,
        animation: animationToUse,
        loop: context.loop,
        loopDelay: context.loopDelay,
        active: context.active,
        animate: context.animate,
        initialOnAnimateEnd: context.initialOnAnimateEnd,
        delay: context.delay,
        completeOnStop: context.completeOnStop,
      }}
    >
      {renderIconComponent(
        IconComponent,
        size,
        className,
        animationToUse,
        props,
      )}
    </AnimateIconContext.Provider>
  )
}

function renderStandaloneAnimatedIcon<T extends string>(
  IconComponent: React.ComponentType<IconProps<T>>,
  size: number,
  className: IconProps<T>['className'],
  options: IconAnimationOptions<T>,
  props: IconSvgProps,
) {
  return (
    <AnimateIcon
      animate={options.animate}
      animateOnHover={options.animateOnHover}
      animateOnTap={options.animateOnTap}
      animateOnView={options.animateOnView}
      animateOnViewMargin={options.animateOnViewMargin}
      animateOnViewOnce={options.animateOnViewOnce}
      animation={options.animation}
      loop={options.loop}
      loopDelay={options.loopDelay}
      delay={options.delay}
      completeOnStop={options.completeOnStop}
    >
      {renderIconComponent(
        IconComponent,
        size,
        className,
        options.animation,
        props,
      )}
    </AnimateIcon>
  )
}

function IconWrapper<T extends string>({
  size = 28,
  animation: animationProp,
  animate,
  animateOnHover,
  animateOnTap,
  animateOnView,
  animateOnViewMargin,
  animateOnViewOnce,
  icon: IconComponent,
  loop,
  loopDelay,
  persistOnAnimateEnd,
  initialOnAnimateEnd,
  delay,
  completeOnStop,
  className,
  ...props
}: IconWrapperProps<T>) {
  const context = React.useContext(AnimateIconContext)
  const options: IconAnimationOptions<T> = {
    animate,
    animateOnHover,
    animateOnTap,
    animateOnView,
    animateOnViewMargin,
    animateOnViewOnce,
    animation: animationProp,
    loop,
    loopDelay,
    persistOnAnimateEnd,
    initialOnAnimateEnd,
    delay,
    completeOnStop,
  }

  if (context) {
    if (hasIconAnimationOverrides(options)) {
      return renderIconWithOverrides(
        IconComponent,
        size,
        className,
        options,
        props,
        context,
      )
    }

    return renderInheritedIcon(
      IconComponent,
      size,
      className,
      animationProp,
      props,
      context,
    )
  }

  if (hasStandaloneAnimation(options)) {
    return renderStandaloneAnimatedIcon(
      IconComponent,
      size,
      className,
      options,
      props,
    )
  }

  return renderIconComponent(
    IconComponent,
    size,
    className,
    animationProp,
    props,
  )
}

function getVariants<
  TData extends { default: T; [key: string]: T },
  T extends Record<string, Variants>,
>(animations: TData): T {
  const { animation: animationType } = useAnimateIconContext()

  return computeVariants(animationType, animations, staticAnimations)
}

export {
  AnimateIcon,
  IconWrapper,
  useAnimateIconContext,
  getVariants,
  type IconProps,
  type IconWrapperProps,
  type AnimateIconProps,
  type IconAnimationOptions,
  type AnimateIconContextValue,
  type Trigger,
}
