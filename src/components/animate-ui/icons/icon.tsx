'use client'

import * as React from 'react'
import { motion, useAnimation, useInView } from 'motion/react'
import {
  computeVariants,
  resolveOverriddenAnimateProps,
  runAnimationLoop,
} from './icon-animation.domain'
import type { StartAnim } from './icon-animation.domain'
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

type AnimatedIconSvgProps = Omit<
  SVGMotionProps<SVGSVGElement>,
  'children' | 'height' | 'width'
> & {
  children: React.ReactNode
  size?: number
}

const AnimateIconContext = React.createContext<AnimateIconContextValue | null>(
  null,
)

function AnimatedIconSvg({ size, children, ...props }: AnimatedIconSvgProps) {
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
      {children}
    </motion.svg>
  )
}

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

type Timer = ReturnType<typeof setTimeout>
type AnimationName = string | StaticAnimations
type SetBool = React.Dispatch<React.SetStateAction<boolean>>
type SetAnimation = React.Dispatch<React.SetStateAction<AnimationName>>

// Mutable container bundle for the animation run-loop. Created once via
// useState lazy init so its identity is stable for the component lifetime.
interface IconRefs {
  delayRef: { current: Timer | null }
  loopDelayRef: { current: Timer | null }
  isAnimateInProgressRef: { current: boolean }
  animateEndPromiseRef: { current: Promise<void> | null }
  resolveAnimateEndRef: { current: (() => void) | null }
  activeRef: { current: boolean }
  runGenRef: { current: number }
  cancelledRef: { current: boolean }
}

function createIconRefs(initialActive: boolean): IconRefs {
  return {
    delayRef: { current: null },
    loopDelayRef: { current: null },
    isAnimateInProgressRef: { current: false },
    animateEndPromiseRef: { current: null },
    resolveAnimateEndRef: { current: null },
    activeRef: { current: initialActive },
    runGenRef: { current: 0 },
    cancelledRef: { current: false },
  }
}

interface UseAnimateIconParams {
  animate: Trigger
  animateOnHover: Trigger
  animateOnTap: Trigger
  animateOnView: Trigger
  animateOnViewMargin: UseInViewOptions['margin']
  animateOnViewOnce: boolean
  animation: AnimationName
  loop: boolean
  loopDelay: number
  initialOnAnimateEnd: boolean
  completeOnStop: boolean
  persistOnAnimateEnd: boolean
  delay: number
}

function useAnimateIconState(
  animate: Trigger,
  animation: AnimationName,
  delay: number,
) {
  const controls = useAnimation()
  const [localAnimate, setLocalAnimate] = React.useState<boolean>(() => {
    if (animate === false) return false
    return delay <= 0
  })
  const [currentAnimation, setCurrentAnimation] = React.useState<AnimationName>(
    typeof animate === 'string' ? animate : animation,
  )
  const [status, setStatus] = React.useState<'initial' | 'animate'>('initial')
  const [refs] = React.useState<IconRefs>(() => createIconRefs(localAnimate))
  return {
    controls,
    localAnimate,
    setLocalAnimate,
    currentAnimation,
    setCurrentAnimation,
    status,
    setStatus,
    refs,
  }
}

function useAnimateIconCallbacks({
  refs,
  animation,
  delay,
  setLocalAnimate,
  setCurrentAnimation,
}: {
  refs: IconRefs
  animation: AnimationName
  delay: number
  setLocalAnimate: SetBool
  setCurrentAnimation: SetAnimation
}) {
  const bumpGeneration = React.useCallback(() => {
    refs.runGenRef.current++
  }, [refs])

  const startAnimation = React.useCallback(
    (trigger: TriggerProp) => {
      const next = typeof trigger === 'string' ? trigger : animation
      bumpGeneration()
      if (refs.delayRef.current) {
        clearTimeout(refs.delayRef.current)
        refs.delayRef.current = null
      }
      setCurrentAnimation(next)
      if (delay > 0) {
        setLocalAnimate(false)
        refs.delayRef.current = setTimeout(() => {
          setLocalAnimate(true)
        }, delay)
      } else {
        setLocalAnimate(true)
      }
    },
    [
      animation,
      delay,
      bumpGeneration,
      refs,
      setCurrentAnimation,
      setLocalAnimate,
    ],
  )

  const stopAnimation = React.useCallback(() => {
    bumpGeneration()
    if (refs.delayRef.current) {
      clearTimeout(refs.delayRef.current)
      refs.delayRef.current = null
    }
    if (refs.loopDelayRef.current) {
      clearTimeout(refs.loopDelayRef.current)
      refs.loopDelayRef.current = null
    }
    setLocalAnimate(false)
  }, [bumpGeneration, refs, setLocalAnimate])

  return { startAnimation, stopAnimation }
}

function useAnimateIconEffects({
  refs,
  localAnimate,
  animate,
  animation,
  setCurrentAnimation,
  startAnimation,
  stopAnimation,
}: {
  refs: IconRefs
  localAnimate: boolean
  animate: Trigger
  animation: AnimationName
  setCurrentAnimation: SetAnimation
  startAnimation: (trigger: TriggerProp) => void
  stopAnimation: () => void
}) {
  React.useEffect(() => {
    refs.activeRef.current = localAnimate
  }, [localAnimate, refs])

  React.useEffect(() => {
    setCurrentAnimation(animate ? (animate as string) : animation)
    if (animate) startAnimation(animate as TriggerProp)
    else stopAnimation()
  }, [animate])

  React.useEffect(() => {
    return () => {
      if (refs.delayRef.current) clearTimeout(refs.delayRef.current)
      if (refs.loopDelayRef.current) clearTimeout(refs.loopDelayRef.current)
    }
  }, [refs])
}

function useIconViewTrigger({
  animateOnView,
  animateOnViewOnce,
  animateOnViewMargin,
  startAnimation,
  stopAnimation,
}: {
  animateOnView: Trigger
  animateOnViewOnce: boolean
  animateOnViewMargin: UseInViewOptions['margin']
  startAnimation: (trigger: TriggerProp) => void
  stopAnimation: () => void
}) {
  const viewOuterRef = React.useRef<HTMLElement>(null)
  const inViewResult = useInView(viewOuterRef, {
    once: animateOnViewOnce,
    margin: animateOnViewMargin,
  })
  const isInView = !animateOnView || inViewResult

  React.useEffect(() => {
    if (!animateOnView) return
    if (isInView) startAnimation(animateOnView)
    else stopAnimation()
  }, [isInView, animateOnView, startAnimation, stopAnimation])

  return viewOuterRef
}

type U = {
  refs: IconRefs
  controls: LegacyAnimationControls
  setStatus: React.Dispatch<React.SetStateAction<'initial' | 'animate'>>
  localAnimate: boolean
  status: 'initial' | 'animate'
  loop: boolean
  loopDelay: number
  completeOnStop: boolean
  persistOnAnimateEnd: boolean
  initialOnAnimateEnd: boolean
}

function useAnimationRunLoop({
  refs,
  controls,
  setStatus,
  localAnimate,
  status,
  loop,
  loopDelay,
  completeOnStop,
  persistOnAnimateEnd,
  initialOnAnimateEnd,
}: U) {
  const startAnim = React.useCallback<StartAnim>(
    async (anim, method = 'start') => {
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
    const gen = ++refs.runGenRef.current
    refs.cancelledRef.current = false
    void runAnimationLoop({
      gen,
      refs,
      config: {
        loop,
        loopDelay,
        completeOnStop,
        persistOnAnimateEnd,
        initialOnAnimateEnd,
        localAnimate,
        status,
      },
      startAnim,
    })

    return () => {
      refs.cancelledRef.current = true
      if (refs.delayRef.current) {
        clearTimeout(refs.delayRef.current)
        refs.delayRef.current = null
      }
      if (refs.loopDelayRef.current) {
        clearTimeout(refs.loopDelayRef.current)
        refs.loopDelayRef.current = null
      }
    }
  }, [localAnimate, controls])
}

function useAnimateIcon(p: UseAnimateIconParams) {
  const {
    controls,
    localAnimate,
    setLocalAnimate,
    currentAnimation,
    setCurrentAnimation,
    status,
    setStatus,
    refs,
  } = useAnimateIconState(p.animate, p.animation, p.delay)

  const { startAnimation, stopAnimation } = useAnimateIconCallbacks({
    refs,
    animation: p.animation,
    delay: p.delay,
    setLocalAnimate,
    setCurrentAnimation,
  })

  useAnimateIconEffects({
    refs,
    localAnimate,
    animate: p.animate,
    animation: p.animation,
    setCurrentAnimation,
    startAnimation,
    stopAnimation,
  })

  const viewOuterRef = useIconViewTrigger({
    animateOnView: p.animateOnView,
    animateOnViewOnce: p.animateOnViewOnce,
    animateOnViewMargin: p.animateOnViewMargin,
    startAnimation,
    stopAnimation,
  })

  useAnimationRunLoop({
    refs,
    controls,
    setStatus,
    localAnimate,
    status,
    loop: p.loop,
    loopDelay: p.loopDelay,
    completeOnStop: p.completeOnStop,
    persistOnAnimateEnd: p.persistOnAnimateEnd,
    initialOnAnimateEnd: p.initialOnAnimateEnd,
  })

  return {
    controls,
    currentAnimation,
    localAnimate,
    viewOuterRef,
    startAnimation,
    stopAnimation,
  }
}

function buildIconPointerHandlers({
  children,
  animateOnHover,
  animateOnTap,
  startAnimation,
  stopAnimation,
}: {
  children: React.ReactNode
  animateOnHover: Trigger
  animateOnTap: Trigger
  startAnimation: (trigger: TriggerProp) => void
  stopAnimation: () => void
}) {
  const childProps = (
    React.isValidElement(children) ? (children as React.ReactElement).props : {}
  ) as AnyProps

  return {
    onMouseEnter: composeEventHandlers<React.MouseEvent<HTMLElement>>(
      childProps.onMouseEnter,
      () => {
        if (animateOnHover) startAnimation(animateOnHover)
      },
    ),
    onMouseLeave: composeEventHandlers<React.MouseEvent<HTMLElement>>(
      childProps.onMouseLeave,
      () => {
        if (animateOnHover || animateOnTap) stopAnimation()
      },
    ),
    onPointerDown: composeEventHandlers<React.PointerEvent<HTMLElement>>(
      childProps.onPointerDown,
      () => {
        if (animateOnTap) startAnimation(animateOnTap)
      },
    ),
    onPointerUp: composeEventHandlers<React.PointerEvent<HTMLElement>>(
      childProps.onPointerUp,
      () => {
        if (animateOnTap) stopAnimation()
      },
    ),
  }
}

function splitAnimateIconProps({
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
  ...rest
}: AnimateIconProps) {
  const options: UseAnimateIconParams = {
    animate,
    animateOnHover,
    animateOnTap,
    animateOnView,
    animateOnViewMargin,
    animateOnViewOnce,
    animation,
    loop,
    loopDelay,
    initialOnAnimateEnd,
    completeOnStop,
    persistOnAnimateEnd,
    delay,
  }
  return { asChild, children, rest, options }
}

function buildIconContextValue(
  options: UseAnimateIconParams,
  view: {
    controls: LegacyAnimationControls
    currentAnimation: AnimationName
    localAnimate: boolean
  },
): AnimateIconContextValue {
  return {
    controls: view.controls,
    animation: view.currentAnimation,
    loop: options.loop,
    loopDelay: options.loopDelay,
    active: view.localAnimate,
    animate: options.animate,
    initialOnAnimateEnd: options.initialOnAnimateEnd,
    completeOnStop: options.completeOnStop,
    delay: options.delay,
  }
}

function AnimateIcon(props: AnimateIconProps) {
  const { asChild, children, rest, options } = splitAnimateIconProps(props)
  const view = useAnimateIcon(options)
  const contextValue = buildIconContextValue(options, view)

  const handlers = buildIconPointerHandlers({
    children,
    animateOnHover: options.animateOnHover,
    animateOnTap: options.animateOnTap,
    startAnimation: view.startAnimation,
    stopAnimation: view.stopAnimation,
  })

  const content = asChild ? (
    <Slot ref={view.viewOuterRef} {...handlers} {...rest}>
      {children}
    </Slot>
  ) : (
    <motion.span ref={view.viewOuterRef} {...handlers} {...rest}>
      {children}
    </motion.span>
  )

  return (
    <AnimateIconContext.Provider value={contextValue}>
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

function renderIconComponent<T extends string>({
  IconComponent,
  size,
  className,
  props,
  animation,
}: {
  IconComponent: React.ComponentType<any>
  size: number
  className: IconProps<T>['className']
  props: IconSvgProps
  animation: string | undefined
}) {
  return (
    <IconComponent
      size={size}
      className={getIconClassName(className, animation)}
      {...props}
    />
  )
}

function renderIconWithOverrides<T extends string>({
  IconComponent,
  size,
  className,
  props,
  options,
  context,
}: {
  IconComponent: React.ComponentType<IconProps<T>>
  size: number
  className: IconProps<T>['className']
  props: IconSvgProps
  options: IconAnimationOptions<T>
  context: AnimateIconContextValue
}) {
  const resolved = resolveOverriddenAnimateProps(options, context)

  return (
    <AnimateIcon {...resolved}>
      {renderIconComponent({
        IconComponent,
        size,
        className,
        props,
        animation: resolved.animation,
      })}
    </AnimateIcon>
  )
}

function renderInheritedIcon<T extends string>({
  IconComponent,
  size,
  className,
  props,
  animationProp,
  context,
}: {
  IconComponent: React.ComponentType<IconProps<T>>
  size: number
  className: IconProps<T>['className']
  props: IconSvgProps
  animationProp: T | StaticAnimations | undefined
  context: AnimateIconContextValue
}) {
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
      {renderIconComponent({
        IconComponent,
        size,
        className,
        props,
        animation: animationToUse,
      })}
    </AnimateIconContext.Provider>
  )
}

function renderStandaloneAnimatedIcon<T extends string>({
  IconComponent,
  size,
  className,
  props,
  options,
}: {
  IconComponent: React.ComponentType<IconProps<T>>
  size: number
  className: IconProps<T>['className']
  props: IconSvgProps
  options: IconAnimationOptions<T>
}) {
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
      {renderIconComponent({
        IconComponent,
        size,
        className,
        props,
        animation: options.animation,
      })}
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

  const commonProps = { IconComponent, size, className, props }

  if (context) {
    if (hasIconAnimationOverrides(options)) {
      return renderIconWithOverrides({ ...commonProps, options, context })
    }
    return renderInheritedIcon({ ...commonProps, animationProp, context })
  }
  if (hasStandaloneAnimation(options)) {
    return renderStandaloneAnimatedIcon({ ...commonProps, options })
  }
  return renderIconComponent({ ...commonProps, animation: animationProp })
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
  AnimatedIconSvg,
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
