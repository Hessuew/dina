import type { Variants } from 'motion/react'

import type {
  AnimateIconContextValue,
  IconAnimationOptions,
  Trigger,
} from '../icon'

export function resolveInheritedAnimate<T extends string>(
  options: IconAnimationOptions<T>,
  context: AnimateIconContextValue,
): Trigger {
  if (!context.active) return false
  return options.animation ?? context.animation
}

export function resolveOverriddenAnimateProps<T extends string>(
  options: IconAnimationOptions<T>,
  context: AnimateIconContextValue,
) {
  const animation = options.animation ?? context.animation
  const animate =
    options.animate ??
    context.animate ??
    resolveInheritedAnimate(options, context)

  return {
    animate,
    animateOnHover: options.animateOnHover,
    animateOnTap: options.animateOnTap,
    animateOnView: options.animateOnView,
    animateOnViewMargin: options.animateOnViewMargin,
    animateOnViewOnce: options.animateOnViewOnce,
    animation,
    loop: options.loop ?? context.loop,
    loopDelay: options.loopDelay ?? context.loopDelay,
    persistOnAnimateEnd: options.persistOnAnimateEnd ?? context.persistOnAnimateEnd,
    initialOnAnimateEnd: options.initialOnAnimateEnd ?? context.initialOnAnimateEnd,
    delay: options.delay ?? context.delay,
    completeOnStop: options.completeOnStop ?? context.completeOnStop,
  }
}

export function computeVariants<
  TData extends { default: T; [key: string]: T },
  T extends Record<string, Variants>,
>(
  animationType: string,
  animations: TData,
  staticAnimations: Record<string, Variants>,
): T {
  if (animationType in staticAnimations) {
    const variant = staticAnimations[animationType]
    const result = {} as T
    for (const key in animations.default) {
      if (
        (animationType === 'path' || animationType === 'path-loop') &&
        key.includes('group')
      )
        continue
      result[key] = variant as T[Extract<keyof T, string>]
    }
    return result
  }

  return animations[animationType as keyof TData] as T
}
