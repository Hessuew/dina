import { describe, expect, it, vi } from 'vitest'
import {
  awaitLoopDelay,
  clearAnimationEndState,
  completeStoppedAnimation,
  computeVariants,
  haltInactiveLoop,
  resetActiveAnimationIfStale,
  resetAfterAnimateEnd,
  resetForLoopStart,
  resetToInitialIfStale,
  resolveInheritedAnimate,
  resolveOverriddenAnimateProps,
  runAnimatePhase,
  runAnimationLoop,
  runContinueLoop,
  runInactiveBranch,
} from './icon-animation.domain'
import type {
  AnimationRunConfig,
  AnimationRunContext,
  AnimationRunRefs,
  ContinueLoopDeps,
  StartAnim,
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

describe('runContinueLoop', () => {
  function makeDeps(
    overrides: Partial<ContinueLoopDeps> = {},
  ): ContinueLoopDeps {
    return {
      loop: true,
      loopDelay: 0,
      waitForLoopDelay: vi.fn(async () => {}),
      resetInitialIfStale: vi.fn(async () => false),
      stopInactiveLoop: vi.fn(async () => false),
      run: vi.fn(async () => {}),
      ...overrides,
    }
  }

  it('does nothing when loop is disabled', async () => {
    const deps = makeDeps({ loop: false })
    await runContinueLoop(deps)
    expect(deps.waitForLoopDelay).not.toHaveBeenCalled()
    expect(deps.stopInactiveLoop).not.toHaveBeenCalled()
    expect(deps.run).not.toHaveBeenCalled()
  })

  it('skips the delay wait when loopDelay is zero', async () => {
    const deps = makeDeps({ loopDelay: 0 })
    await runContinueLoop(deps)
    expect(deps.waitForLoopDelay).not.toHaveBeenCalled()
    expect(deps.run).toHaveBeenCalledTimes(1)
  })

  it('waits for the loop delay before continuing when loopDelay is positive', async () => {
    const deps = makeDeps({ loopDelay: 5 })
    await runContinueLoop(deps)
    expect(deps.waitForLoopDelay).toHaveBeenCalledTimes(1)
    expect(deps.run).toHaveBeenCalledTimes(1)
  })

  it('stops after the delay when the run became stale', async () => {
    const deps = makeDeps({
      loopDelay: 5,
      resetInitialIfStale: vi.fn(async () => true),
    })
    await runContinueLoop(deps)
    expect(deps.waitForLoopDelay).toHaveBeenCalledTimes(1)
    expect(deps.resetInitialIfStale).toHaveBeenCalledTimes(1)
    expect(deps.stopInactiveLoop).not.toHaveBeenCalled()
    expect(deps.run).not.toHaveBeenCalled()
  })

  it('stops when the loop is inactive', async () => {
    const deps = makeDeps({ stopInactiveLoop: vi.fn(async () => true) })
    await runContinueLoop(deps)
    expect(deps.stopInactiveLoop).toHaveBeenCalledTimes(1)
    expect(deps.run).not.toHaveBeenCalled()
  })

  it('stops when the run became stale after the inactive check', async () => {
    const deps = makeDeps({
      loopDelay: 0,
      resetInitialIfStale: vi.fn(async () => true),
    })
    await runContinueLoop(deps)
    expect(deps.stopInactiveLoop).toHaveBeenCalledTimes(1)
    expect(deps.resetInitialIfStale).toHaveBeenCalledTimes(1)
    expect(deps.run).not.toHaveBeenCalled()
  })

  it('runs the next iteration when all guards pass', async () => {
    const deps = makeDeps()
    await runContinueLoop(deps)
    expect(deps.run).toHaveBeenCalledTimes(1)
  })
})

function makeRefs(overrides: Partial<AnimationRunRefs> = {}): AnimationRunRefs {
  return {
    runGenRef: { current: 0 },
    cancelledRef: { current: false },
    isAnimateInProgressRef: { current: false },
    animateEndPromiseRef: { current: null },
    resolveAnimateEndRef: { current: null },
    loopDelayRef: { current: null },
    activeRef: { current: true },
    ...overrides,
  }
}

function makeConfig(
  overrides: Partial<AnimationRunConfig> = {},
): AnimationRunConfig {
  return {
    loop: false,
    loopDelay: 0,
    completeOnStop: false,
    persistOnAnimateEnd: false,
    initialOnAnimateEnd: false,
    localAnimate: true,
    status: 'animate',
    ...overrides,
  }
}

function makeCtx(
  over: {
    gen?: number
    refs?: Partial<AnimationRunRefs>
    config?: Partial<AnimationRunConfig>
    startAnim?: StartAnim
  } = {},
): AnimationRunContext {
  return {
    gen: over.gen ?? 0,
    refs: makeRefs(over.refs),
    config: makeConfig(over.config),
    startAnim: over.startAnim ?? vi.fn(async () => {}),
  }
}

/** A runGen container that flips to a stale generation after `n` reads. */
function staleAfterReads(n: number): { current: number } {
  let reads = 0
  return {
    get current() {
      return reads++ < n ? 0 : 1
    },
  }
}

describe('resetToInitialIfStale', () => {
  it('returns false and does not animate when the run is current', async () => {
    const ctx = makeCtx()
    expect(await resetToInitialIfStale(ctx)).toBe(false)
    expect(ctx.startAnim).not.toHaveBeenCalled()
  })

  it('resets to initial and returns true when the run is stale', async () => {
    const ctx = makeCtx({ gen: 1, refs: { runGenRef: { current: 0 } } })
    expect(await resetToInitialIfStale(ctx)).toBe(true)
    expect(ctx.startAnim).toHaveBeenCalledWith('initial')
  })
})

describe('clearAnimationEndState', () => {
  it('resolves the pending promise and clears the end state', () => {
    const resolve = vi.fn()
    const ctx = makeCtx({
      refs: {
        isAnimateInProgressRef: { current: true },
        resolveAnimateEndRef: { current: resolve },
        animateEndPromiseRef: { current: Promise.resolve() },
      },
    })
    clearAnimationEndState(ctx)
    expect(resolve).toHaveBeenCalledTimes(1)
    expect(ctx.refs.isAnimateInProgressRef.current).toBe(false)
    expect(ctx.refs.resolveAnimateEndRef.current).toBeNull()
    expect(ctx.refs.animateEndPromiseRef.current).toBeNull()
  })

  it('is a no-op resolver when nothing is pending', () => {
    const ctx = makeCtx()
    expect(() => clearAnimationEndState(ctx)).not.toThrow()
    expect(ctx.refs.isAnimateInProgressRef.current).toBe(false)
  })
})

describe('resetActiveAnimationIfStale', () => {
  it('returns false when the run is current', async () => {
    const ctx = makeCtx()
    expect(await resetActiveAnimationIfStale(ctx)).toBe(false)
    expect(ctx.startAnim).not.toHaveBeenCalled()
  })

  it('clears state, resets to initial and returns true when stale', async () => {
    const resolve = vi.fn()
    const ctx = makeCtx({
      gen: 1,
      refs: {
        runGenRef: { current: 0 },
        resolveAnimateEndRef: { current: resolve },
      },
    })
    expect(await resetActiveAnimationIfStale(ctx)).toBe(true)
    expect(resolve).toHaveBeenCalledTimes(1)
    expect(ctx.startAnim).toHaveBeenCalledWith('initial')
  })
})

describe('completeStoppedAnimation', () => {
  it('returns early when completeOnStop is false', async () => {
    const ctx = makeCtx({ config: { completeOnStop: false } })
    await expect(completeStoppedAnimation(ctx)).resolves.toBeUndefined()
  })

  it('returns early when no animation is in progress', async () => {
    const ctx = makeCtx({
      config: { completeOnStop: true },
      refs: { isAnimateInProgressRef: { current: false } },
    })
    await expect(completeStoppedAnimation(ctx)).resolves.toBeUndefined()
  })

  it('returns early when there is no pending promise', async () => {
    const ctx = makeCtx({
      config: { completeOnStop: true },
      refs: {
        isAnimateInProgressRef: { current: true },
        animateEndPromiseRef: { current: null },
      },
    })
    await expect(completeStoppedAnimation(ctx)).resolves.toBeUndefined()
  })

  it('awaits a resolving pending promise', async () => {
    const ctx = makeCtx({
      config: { completeOnStop: true },
      refs: {
        isAnimateInProgressRef: { current: true },
        animateEndPromiseRef: { current: Promise.resolve() },
      },
    })
    await expect(completeStoppedAnimation(ctx)).resolves.toBeUndefined()
  })

  it('swallows a rejecting pending promise', async () => {
    const ctx = makeCtx({
      config: { completeOnStop: true },
      refs: {
        isAnimateInProgressRef: { current: true },
        animateEndPromiseRef: { current: Promise.reject(new Error('x')) },
      },
    })
    await expect(completeStoppedAnimation(ctx)).resolves.toBeUndefined()
  })
})

describe('awaitLoopDelay', () => {
  it('resolves after the loop delay and clears the timer ref', async () => {
    vi.useFakeTimers()
    const ctx = makeCtx({ config: { loopDelay: 10 } })
    const pending = awaitLoopDelay(ctx)
    expect(ctx.refs.loopDelayRef.current).not.toBeNull()
    await vi.advanceTimersByTimeAsync(10)
    await pending
    expect(ctx.refs.loopDelayRef.current).toBeNull()
    vi.useRealTimers()
  })
})

describe('haltInactiveLoop', () => {
  it('returns false while still active', async () => {
    const ctx = makeCtx({ refs: { activeRef: { current: true } } })
    expect(await haltInactiveLoop(ctx)).toBe(false)
    expect(ctx.startAnim).not.toHaveBeenCalled()
  })

  it('resets to initial when inactive, mid-animation and not persisting', async () => {
    const ctx = makeCtx({
      refs: { activeRef: { current: false } },
      config: { status: 'animate', persistOnAnimateEnd: false },
    })
    expect(await haltInactiveLoop(ctx)).toBe(true)
    expect(ctx.startAnim).toHaveBeenCalledWith('initial')
  })

  it('does not reset when already at initial', async () => {
    const ctx = makeCtx({
      refs: { activeRef: { current: false } },
      config: { status: 'initial' },
    })
    expect(await haltInactiveLoop(ctx)).toBe(true)
    expect(ctx.startAnim).not.toHaveBeenCalled()
  })

  it('does not reset when persisting the animation end', async () => {
    const ctx = makeCtx({
      refs: { activeRef: { current: false } },
      config: { status: 'animate', persistOnAnimateEnd: true },
    })
    expect(await haltInactiveLoop(ctx)).toBe(true)
    expect(ctx.startAnim).not.toHaveBeenCalled()
  })
})

describe('runInactiveBranch', () => {
  it('stops at the persisted end without resetting', async () => {
    const ctx = makeCtx({ config: { persistOnAnimateEnd: true } })
    await runInactiveBranch(ctx)
    expect(ctx.startAnim).not.toHaveBeenCalled()
  })

  it('stops when the run became stale', async () => {
    const ctx = makeCtx({ gen: 1, refs: { runGenRef: { current: 0 } } })
    await runInactiveBranch(ctx)
    expect(ctx.startAnim).toHaveBeenCalledTimes(1)
    expect(ctx.startAnim).toHaveBeenCalledWith('initial')
  })

  it('resets to initial when current and not persisting', async () => {
    const ctx = makeCtx()
    await runInactiveBranch(ctx)
    expect(ctx.startAnim).toHaveBeenCalledTimes(1)
    expect(ctx.startAnim).toHaveBeenCalledWith('initial')
  })
})

describe('resetForLoopStart', () => {
  it('returns false when looping is disabled', async () => {
    const ctx = makeCtx({ config: { loop: false } })
    expect(await resetForLoopStart(ctx)).toBe(false)
    expect(ctx.startAnim).not.toHaveBeenCalled()
  })

  it('returns true when the run became stale', async () => {
    const ctx = makeCtx({
      gen: 1,
      config: { loop: true },
      refs: { runGenRef: { current: 0 } },
    })
    expect(await resetForLoopStart(ctx)).toBe(true)
    expect(ctx.startAnim).toHaveBeenCalledWith('initial')
  })

  it('snaps to initial and returns false when current', async () => {
    const ctx = makeCtx({ config: { loop: true } })
    expect(await resetForLoopStart(ctx)).toBe(false)
    expect(ctx.startAnim).toHaveBeenCalledWith('initial', 'set')
  })
})

describe('runAnimatePhase', () => {
  it('runs the animate phase to completion when current', async () => {
    const ctx = makeCtx()
    expect(await runAnimatePhase(ctx)).toBe(false)
    expect(ctx.startAnim).toHaveBeenCalledWith('animate')
    expect(ctx.refs.isAnimateInProgressRef.current).toBe(false)
    expect(ctx.refs.animateEndPromiseRef.current).toBeNull()
  })

  it('bails out when stale before the animate call', async () => {
    const ctx = makeCtx({ gen: 1, refs: { runGenRef: { current: 0 } } })
    expect(await runAnimatePhase(ctx)).toBe(true)
    expect(ctx.startAnim).not.toHaveBeenCalledWith('animate')
  })

  it('bails out when the run goes stale during the animate call', async () => {
    const refs = makeRefs()
    const startAnim = vi.fn<StartAnim>(async (anim) => {
      if (anim === 'animate') refs.runGenRef.current = 1
    })
    const ctx = makeCtx({ refs, startAnim })
    // override refs identity used by ctx with the mutated one
    ctx.refs = refs
    expect(await runAnimatePhase(ctx)).toBe(true)
    expect(startAnim).toHaveBeenCalledWith('animate')
  })
})

describe('resetAfterAnimateEnd', () => {
  it('returns false when not resetting on animate end', async () => {
    const ctx = makeCtx({ config: { initialOnAnimateEnd: false } })
    expect(await resetAfterAnimateEnd(ctx)).toBe(false)
    expect(ctx.startAnim).not.toHaveBeenCalled()
  })

  it('returns true when the run became stale', async () => {
    const ctx = makeCtx({
      gen: 1,
      config: { initialOnAnimateEnd: true },
      refs: { runGenRef: { current: 0 } },
    })
    expect(await resetAfterAnimateEnd(ctx)).toBe(true)
    expect(ctx.startAnim).toHaveBeenCalledWith('initial')
  })

  it('snaps to initial and returns false when current', async () => {
    const ctx = makeCtx({ config: { initialOnAnimateEnd: true } })
    expect(await resetAfterAnimateEnd(ctx)).toBe(false)
    expect(ctx.startAnim).toHaveBeenCalledWith('initial', 'set')
  })
})

describe('runAnimationLoop', () => {
  it('resets to initial when the run is already cancelled', async () => {
    const ctx = makeCtx({ refs: { cancelledRef: { current: true } } })
    await runAnimationLoop(ctx)
    expect(ctx.startAnim).toHaveBeenCalledWith('initial')
  })

  it('stops immediately when the run is stale at the top', async () => {
    const ctx = makeCtx({ gen: 1, refs: { runGenRef: { current: 0 } } })
    await runAnimationLoop(ctx)
    expect(ctx.startAnim).toHaveBeenCalledTimes(1)
    expect(ctx.startAnim).toHaveBeenCalledWith('initial')
  })

  it('runs the inactive branch when localAnimate is false', async () => {
    const ctx = makeCtx({ config: { localAnimate: false } })
    await runAnimationLoop(ctx)
    expect(ctx.startAnim).toHaveBeenCalledWith('initial')
  })

  it('stops when the loop start became stale', async () => {
    const ctx = makeCtx({
      config: { loop: true },
      refs: { runGenRef: staleAfterReads(1) },
    })
    await runAnimationLoop(ctx)
    expect(ctx.startAnim).toHaveBeenCalledWith('initial')
  })

  it('stops when the animate phase became stale', async () => {
    const refs = makeRefs()
    const startAnim = vi.fn<StartAnim>(async (anim) => {
      if (anim === 'animate') refs.runGenRef.current = 1
    })
    const ctx = makeCtx({ config: { loop: false }, startAnim })
    ctx.refs = refs
    await runAnimationLoop(ctx)
    expect(startAnim).toHaveBeenCalledWith('animate')
  })

  it('stops when the post-animate reset became stale', async () => {
    const ctx = makeCtx({
      config: { loop: false, initialOnAnimateEnd: true },
      refs: { runGenRef: staleAfterReads(3) },
    })
    await runAnimationLoop(ctx)
    expect(ctx.startAnim).toHaveBeenCalledWith('initial')
  })

  it('waits for the loop delay then stops once inactive', async () => {
    vi.useFakeTimers()
    const ctx = makeCtx({
      config: { loop: true, loopDelay: 10 },
      refs: { activeRef: { current: false } },
    })
    const pending = runAnimationLoop(ctx)
    await vi.advanceTimersByTimeAsync(10)
    await pending
    expect(ctx.startAnim).toHaveBeenCalledWith('initial')
    vi.useRealTimers()
  })

  it('continues the loop and re-runs until cancelled', async () => {
    const refs = makeRefs({ activeRef: { current: true } })
    const startAnim = vi.fn<StartAnim>(async (anim) => {
      if (anim === 'animate') refs.cancelledRef.current = true
    })
    const ctx = makeCtx({ config: { loop: true, loopDelay: 0 }, startAnim })
    ctx.refs = refs
    await runAnimationLoop(ctx)
    expect(startAnim).toHaveBeenCalledWith('animate')
    expect(startAnim).toHaveBeenLastCalledWith('initial')
  })
})
