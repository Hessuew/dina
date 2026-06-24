import { describe, expect, it } from 'vitest'
import {
  computeVariants,
  resolveInheritedAnimate,
  resolveOverriddenAnimateProps,
} from './icon-animation.domain'
import type { Variants } from 'motion/react'
import type { AnimateIconContextValue, IconAnimationOptions } from './icon'

function makeContext(
  overrides: Partial<AnimateIconContextValue> = {},
): AnimateIconContextValue {
  return {
    controls: undefined,
    animation: 'default',
    loop: false,
    loopDelay: 0,
    active: true,
    ...overrides,
  }
}

describe('resolveInheritedAnimate', () => {
  it('returns false when the context is not active', () => {
    const context = makeContext({ active: false })
    expect(resolveInheritedAnimate({ animation: 'spin' }, context)).toBe(false)
  })

  it('prefers the option animation when active', () => {
    const context = makeContext({ active: true, animation: 'ctx' })
    expect(resolveInheritedAnimate({ animation: 'spin' }, context)).toBe('spin')
  })

  it('falls back to the context animation when no option animation', () => {
    const context = makeContext({ active: true, animation: 'ctx' })
    expect(resolveInheritedAnimate({}, context)).toBe('ctx')
  })
})

describe('resolveOverriddenAnimateProps', () => {
  it('prefers all option values over context values', () => {
    const options: IconAnimationOptions = {
      animate: 'opt-animate',
      animateOnHover: true,
      animateOnTap: true,
      animateOnView: true,
      animateOnViewMargin: '10px',
      animateOnViewOnce: false,
      animation: 'opt-animation',
      loop: true,
      loopDelay: 5,
      persistOnAnimateEnd: true,
      initialOnAnimateEnd: true,
      delay: 9,
      completeOnStop: true,
    }
    const context = makeContext({
      animate: 'ctx-animate',
      animation: 'ctx-animation',
      loop: false,
      loopDelay: 0,
      persistOnAnimateEnd: false,
      initialOnAnimateEnd: false,
      delay: 0,
      completeOnStop: false,
    })

    expect(resolveOverriddenAnimateProps(options, context)).toEqual({
      animate: 'opt-animate',
      animateOnHover: true,
      animateOnTap: true,
      animateOnView: true,
      animateOnViewMargin: '10px',
      animateOnViewOnce: false,
      animation: 'opt-animation',
      loop: true,
      loopDelay: 5,
      persistOnAnimateEnd: true,
      initialOnAnimateEnd: true,
      delay: 9,
      completeOnStop: true,
    })
  })

  it('falls back to context values when options are undefined', () => {
    const context = makeContext({
      animate: 'ctx-animate',
      animation: 'ctx-animation',
      loop: true,
      loopDelay: 3,
      persistOnAnimateEnd: true,
      initialOnAnimateEnd: true,
      delay: 7,
      completeOnStop: true,
    })

    expect(resolveOverriddenAnimateProps({}, context)).toEqual({
      animate: 'ctx-animate',
      animateOnHover: undefined,
      animateOnTap: undefined,
      animateOnView: undefined,
      animateOnViewMargin: undefined,
      animateOnViewOnce: undefined,
      animation: 'ctx-animation',
      loop: true,
      loopDelay: 3,
      persistOnAnimateEnd: true,
      initialOnAnimateEnd: true,
      delay: 7,
      completeOnStop: true,
    })
  })

  it('derives animate from inherited animation when neither option nor context set animate', () => {
    const context = makeContext({
      animate: undefined,
      active: true,
      animation: 'ctx-animation',
    })

    expect(resolveOverriddenAnimateProps({}, context).animate).toBe(
      'ctx-animation',
    )
  })
})

describe('computeVariants', () => {
  const variant = { initial: {}, animate: {} } as Variants
  const staticAnimations: Record<string, Variants> = {
    path: variant,
    'path-loop': variant,
    spin: variant,
  }
  const animations = {
    default: {
      group1: { animate: {} } as Variants,
      path1: { animate: {} } as Variants,
    },
    custom: {
      group1: { animate: {} } as Variants,
      path1: { animate: {} } as Variants,
    },
  }

  it('returns the named animation set when not a static animation', () => {
    expect(computeVariants('custom', animations, staticAnimations)).toBe(
      animations.custom,
    )
  })

  it('maps each default key to the static variant, skipping group keys for path', () => {
    expect(computeVariants('path', animations, staticAnimations)).toEqual({
      path1: variant,
    })
  })

  it('keeps group keys for non-path static animations', () => {
    expect(computeVariants('spin', animations, staticAnimations)).toEqual({
      group1: variant,
      path1: variant,
    })
  })
})
