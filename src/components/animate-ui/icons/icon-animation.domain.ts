import type { Variants } from 'motion/react'

import type {
  AnimateIconContextValue,
  IconAnimationOptions,
  Trigger,
} from './icon'

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
    persistOnAnimateEnd:
      options.persistOnAnimateEnd ?? context.persistOnAnimateEnd,
    initialOnAnimateEnd:
      options.initialOnAnimateEnd ?? context.initialOnAnimateEnd,
    delay: options.delay ?? context.delay,
    completeOnStop: options.completeOnStop ?? context.completeOnStop,
  }
}

export interface ContinueLoopDeps {
  loop: boolean
  loopDelay: number
  waitForLoopDelay: () => Promise<void>
  resetInitialIfStale: () => Promise<boolean>
  stopInactiveLoop: () => Promise<boolean>
  run: () => Promise<void>
}

export async function runContinueLoop({
  loop,
  loopDelay,
  waitForLoopDelay,
  resetInitialIfStale,
  stopInactiveLoop,
  run,
}: ContinueLoopDeps): Promise<void> {
  if (!loop) return
  if (loopDelay > 0) {
    await waitForLoopDelay()
    if (await resetInitialIfStale()) return
  }
  if (await stopInactiveLoop()) return
  if (await resetInitialIfStale()) return
  await run()
}

type Ref<T> = { current: T }

export interface AnimationRunRefs {
  runGenRef: Ref<number>
  cancelledRef: Ref<boolean>
  isAnimateInProgressRef: Ref<boolean>
  animateEndPromiseRef: Ref<Promise<void> | null>
  resolveAnimateEndRef: Ref<(() => void) | null>
  loopDelayRef: Ref<ReturnType<typeof setTimeout> | null>
  activeRef: Ref<boolean>
}

export interface AnimationRunConfig {
  loop: boolean
  loopDelay: number
  completeOnStop: boolean
  persistOnAnimateEnd: boolean
  initialOnAnimateEnd: boolean
  localAnimate: boolean
  status: 'initial' | 'animate'
}

export type StartAnim = (
  anim: 'initial' | 'animate',
  method?: 'start' | 'set',
) => Promise<void>

export interface AnimationRunContext {
  gen: number
  refs: AnimationRunRefs
  config: AnimationRunConfig
  startAnim: StartAnim
}

function isStaleRun(ctx: AnimationRunContext): boolean {
  return ctx.gen !== ctx.refs.runGenRef.current
}

export async function resetToInitialIfStale(
  ctx: AnimationRunContext,
): Promise<boolean> {
  if (!isStaleRun(ctx)) return false
  await ctx.startAnim('initial')
  return true
}

export function clearAnimationEndState(ctx: AnimationRunContext): void {
  const { refs } = ctx
  refs.isAnimateInProgressRef.current = false
  refs.resolveAnimateEndRef.current?.()
  refs.resolveAnimateEndRef.current = null
  refs.animateEndPromiseRef.current = null
}

export async function resetActiveAnimationIfStale(
  ctx: AnimationRunContext,
): Promise<boolean> {
  if (!isStaleRun(ctx)) return false
  clearAnimationEndState(ctx)
  await ctx.startAnim('initial')
  return true
}

export async function completeStoppedAnimation(
  ctx: AnimationRunContext,
): Promise<void> {
  const { config, refs } = ctx
  if (
    !config.completeOnStop ||
    !refs.isAnimateInProgressRef.current ||
    !refs.animateEndPromiseRef.current
  ) {
    return
  }
  try {
    await refs.animateEndPromiseRef.current
  } catch {
    // noop
  }
}

export function awaitLoopDelay(ctx: AnimationRunContext): Promise<void> {
  return new Promise<void>((resolve) => {
    ctx.refs.loopDelayRef.current = setTimeout(() => {
      ctx.refs.loopDelayRef.current = null
      resolve()
    }, ctx.config.loopDelay)
  })
}

export async function haltInactiveLoop(
  ctx: AnimationRunContext,
): Promise<boolean> {
  if (ctx.refs.activeRef.current) return false
  if (ctx.config.status !== 'initial' && !ctx.config.persistOnAnimateEnd) {
    await ctx.startAnim('initial')
  }
  return true
}

export async function runInactiveBranch(
  ctx: AnimationRunContext,
): Promise<void> {
  await completeStoppedAnimation(ctx)
  if (ctx.config.persistOnAnimateEnd) return
  if (await resetToInitialIfStale(ctx)) return
  await ctx.startAnim('initial')
}

export async function resetForLoopStart(
  ctx: AnimationRunContext,
): Promise<boolean> {
  if (!ctx.config.loop) return false
  if (await resetToInitialIfStale(ctx)) return true
  await ctx.startAnim('initial', 'set')
  return false
}

export async function runAnimatePhase(
  ctx: AnimationRunContext,
): Promise<boolean> {
  const { refs } = ctx
  refs.isAnimateInProgressRef.current = true
  refs.animateEndPromiseRef.current = new Promise<void>((resolve) => {
    refs.resolveAnimateEndRef.current = resolve
  })
  if (await resetActiveAnimationIfStale(ctx)) return true
  await ctx.startAnim('animate')
  if (await resetActiveAnimationIfStale(ctx)) return true
  clearAnimationEndState(ctx)
  return false
}

export async function resetAfterAnimateEnd(
  ctx: AnimationRunContext,
): Promise<boolean> {
  if (!ctx.config.initialOnAnimateEnd) return false
  if (await resetToInitialIfStale(ctx)) return true
  await ctx.startAnim('initial', 'set')
  return false
}

/**
 * Run one pass of the icon animation state machine. Extracted from the
 * `AnimateIcon` run-loop effect (ADR 0011 unit-size decomposition); the effect
 * builds the context and invokes this, then schedules the next pass via
 * {@link runContinueLoop}.
 */
export async function runAnimationLoop(
  ctx: AnimationRunContext,
): Promise<void> {
  if (ctx.refs.cancelledRef.current) {
    await ctx.startAnim('initial')
    return
  }
  if (await resetToInitialIfStale(ctx)) return
  if (!ctx.config.localAnimate) {
    await runInactiveBranch(ctx)
    return
  }
  if (await resetForLoopStart(ctx)) return
  if (await runAnimatePhase(ctx)) return
  if (await resetAfterAnimateEnd(ctx)) return
  await runContinueLoop({
    loop: ctx.config.loop,
    loopDelay: ctx.config.loopDelay,
    waitForLoopDelay: () => awaitLoopDelay(ctx),
    resetInitialIfStale: () => resetToInitialIfStale(ctx),
    stopInactiveLoop: () => haltInactiveLoop(ctx),
    run: () => runAnimationLoop(ctx),
  })
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
