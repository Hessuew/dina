import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import { cn } from '@/lib/utils'

type LandingSectionProps = ComponentPropsWithoutRef<'section'>

type LandingSectionContainerProps = ComponentPropsWithoutRef<'div'>

type LandingSectionEyebrowTone = 'gold' | 'deep'

type LandingSectionEyebrowAlign = 'start' | 'center'

type LandingSectionEyebrowProps = {
  label: string
  align?: LandingSectionEyebrowAlign
  tone?: LandingSectionEyebrowTone
  topLineCount?: 1 | 2
  className?: string
}

type LandingSectionEyebrowCenteredProps = {
  label: string
  className?: string
}

type LandingFeaturePanelProps = ComponentPropsWithoutRef<'div'>

type LandingFeaturePanelHeaderProps = {
  backgroundImageUrl: string
  className?: string
  children: ReactNode
}

type LandingFeaturePanelBodyProps = ComponentPropsWithoutRef<'div'>

export function LandingSection({ className, ...props }: LandingSectionProps) {
  return (
    <section
      {...props}
      className={cn('relative isolate overflow-hidden', className)}
    />
  )
}

export function LandingSectionContainer({
  className,
  ...props
}: LandingSectionContainerProps) {
  return (
    <div
      {...props}
      className={cn(
        'relative mx-auto max-w-[calc(100%-2rem)] px-5 sm:max-w-[calc(100%-4rem)] sm:px-8 lg:max-w-[calc(100%-8rem)] lg:px-12',
        className,
      )}
    />
  )
}

export function LandingSectionEyebrow({
  label,
  align = 'start',
  tone = 'gold',
  topLineCount = 1,
  className,
}: LandingSectionEyebrowProps) {
  const topLineClass = tone === 'deep' ? 'bg-[#9B7A41]/50' : 'bg-[#C5A059]/50'
  const innerLineClass = tone === 'deep' ? 'bg-[#9B7A41]/55' : 'bg-[#C5A059]/55'

  return (
    <div
      className={cn(
        'inline-flex flex-col gap-2 text-[0.72rem] font-medium tracking-[0.3em] text-[#9B7A41] uppercase',
        align === 'center' && 'items-center',
        className,
      )}
    >
      {topLineCount === 2 ? (
        <>
          <div className={cn('mb-2 h-px w-20 lg:w-28', topLineClass)} />
          <div className={cn('h-px w-20 lg:w-28', topLineClass)} />
        </>
      ) : (
        <div className={cn('h-px w-20 lg:w-28', topLineClass)} />
      )}
      <div className="flex flex-row items-center gap-3">
        <span className={cn('h-px w-10', innerLineClass)} />
        {label}
      </div>
    </div>
  )
}

export function LandingSectionEyebrowCentered({
  label,
  className,
}: LandingSectionEyebrowCenteredProps) {
  return (
    <div
      className={cn(
        'inline-flex flex-col items-center gap-3 text-[0.68rem] font-medium tracking-[0.3em] text-[#D4B373] uppercase',
        className,
      )}
    >
      <div className="h-px w-16 bg-[#C5A059]/50" />
      {label}
    </div>
  )
}

export function LandingFeaturePanel({
  className,
  ...props
}: LandingFeaturePanelProps) {
  return (
    <div
      {...props}
      className={cn(
        'relative border border-white/10 bg-[#171717]/72 p-4 shadow-[0_42px_100px_-52px_rgba(0,0,0,0.82)] backdrop-blur-sm sm:p-6',
        className,
      )}
    />
  )
}

export function LandingFeaturePanelHeader({
  backgroundImageUrl,
  className,
  children,
}: LandingFeaturePanelHeaderProps) {
  return (
    <div
      className={cn('relative overflow-hidden border border-white/10', className)}
      style={{
        backgroundImage: `linear-gradient(180deg, rgba(7,7,8,0.26), rgba(7,7,8,0.72)), url(${backgroundImageUrl})`,
        backgroundPosition: 'center',
        backgroundSize: 'cover',
      }}
    >
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.12),transparent_38%,rgba(197,160,89,0.14)_100%)]" />
      {children}
    </div>
  )
}

export function LandingFeaturePanelBody({
  className,
  ...props
}: LandingFeaturePanelBodyProps) {
  return (
    <div
      {...props}
      className={cn('border-x border-b border-white/10 bg-[#151515]/88', className)}
    />
  )
}
