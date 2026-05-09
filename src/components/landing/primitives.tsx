import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react'
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

type Scripture = {
  quote: string
  reference: string
}

type LandingScriptureSectionHeaderProps = {
  eyebrowLabel: string
  eyebrowTone?: LandingSectionEyebrowTone
  eyebrowAlign?: LandingSectionEyebrowAlign
  eyebrowTopLineCount?: 1 | 2
  headline: ReactNode
  headlineMaxW?: string
  headlineNowrap?: boolean
  introText?: ReactNode
  scriptures?: Array<Scripture>
  textColor?: string
  headlineColor?: string
  className?: string
}

type LandingActiveItemNavProps = {
  label: string
  activeValue: ReactNode
  onPrevious?: () => void
  onNext?: () => void
  borderColor?: string
  prevButtonClass?: string
  nextButtonClass?: string
  labelColor?: string
  valueColor?: string
  className?: string
}

type LandingItemGridProps = {
  items: Array<any>
  activeIndex: number
  onSelect: (index: number) => void
  renderItem: (item: any, index: number, isActive: boolean) => ReactNode
  gridCols?: string
  borderColor?: string
  bgColor?: string
  activeBorderColor?: string
  activeBgColor?: string
  arrowColor?: string
  activeArrowColor?: string
  className?: string
}

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
      className={cn(
        'relative overflow-hidden border border-white/10',
        className,
      )}
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
      className={cn(
        'border-x border-b border-white/10 bg-[#151515]/88',
        className,
      )}
    />
  )
}

export function LandingScriptureSectionHeader({
  eyebrowLabel,
  eyebrowTone = 'gold',
  eyebrowAlign = 'start',
  eyebrowTopLineCount = 1,
  headline,
  headlineMaxW = 'max-w-[14ch]',
  headlineNowrap = false,
  introText,
  scriptures,
  textColor = '#4E463D',
  headlineColor = '#1C1815',
  className,
}: LandingScriptureSectionHeaderProps) {
  return (
    <div className={cn('space-y-6', className)}>
      <LandingSectionEyebrow
        label={eyebrowLabel}
        tone={eyebrowTone}
        align={eyebrowAlign}
        topLineCount={eyebrowTopLineCount}
      />

      <h2
        className={cn(
          'block font-serif text-[clamp(3rem,5vw,5.1rem)] leading-[0.92] tracking-[-0.055em]',
          headlineMaxW,
          headlineNowrap && 'whitespace-nowrap',
        )}
        style={{ color: headlineColor }}
      >
        {headline}
      </h2>

      {(introText || scriptures) && (
        <p
          className="max-w-xl text-base leading-8 font-light tracking-[0.04em] sm:text-lg"
          style={{ color: textColor }}
        >
          {introText}
          {introText && scriptures && (
            <>
              <br />
              <br />
            </>
          )}
          {scriptures &&
            scriptures.map((scripture, index) => (
              <span key={index}>
                {index > 0 && (
                  <>
                    <br />
                    <br />
                  </>
                )}
                "{scripture.quote}"
                <span className="text-[0.72rem] font-medium tracking-[0.2em] text-[#9B7A41] uppercase">
                  &nbsp;{scripture.reference}
                </span>
              </span>
            ))}
        </p>
      )}
    </div>
  )
}

export function LandingActiveItemNav({
  label,
  activeValue,
  onPrevious,
  onNext,
  borderColor = 'border-white/10',
  prevButtonClass,
  nextButtonClass,
  labelColor = 'text-[#8E816D]',
  valueColor = 'text-[#F8F4EC]',
  className,
}: LandingActiveItemNavProps) {
  const handlePrevious = () => {
    if (onPrevious) {
      onPrevious()
    }
  }

  const handleNext = () => {
    if (onNext) {
      onNext()
    }
  }

  return (
    <div
      className={cn(
        'flex items-center justify-between gap-6 border-y py-5',
        borderColor,
        className,
      )}
    >
      <div>
        <div
          className={cn(
            'text-[0.68rem] font-medium tracking-[0.3em] uppercase',
            labelColor,
          )}
        >
          {label}
        </div>
        <div className={cn('mt-2 font-serif text-2xl', valueColor)}>
          {activeValue}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handlePrevious}
          className={cn(
            'inline-flex h-12 w-12 items-center justify-center border transition-all hover:-translate-y-0.5',
            prevButtonClass,
          )}
          aria-label="Show previous item"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={handleNext}
          className={cn(
            'inline-flex h-12 w-12 items-center justify-center border transition-all hover:-translate-y-0.5',
            nextButtonClass,
          )}
          aria-label="Show next item"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

export function LandingItemGrid({
  items,
  activeIndex,
  onSelect,
  renderItem,
  gridCols = 'sm:grid-cols-2',
  borderColor = 'border-white/10',
  bgColor = 'bg-white/3',
  activeBorderColor = 'border-[#C5A059]/42',
  activeBgColor = 'bg-[#1A1716]',
  arrowColor = 'text-[#9B8A73]',
  activeArrowColor = 'text-[#E9D9B4]',
  className,
}: LandingItemGridProps) {
  return (
    <div className={cn('hidden gap-3 sm:grid', gridCols, className)}>
      {items.map((item, index) => {
        const isActive = index === activeIndex

        return (
          <button
            key={index}
            type="button"
            onClick={() => onSelect(index)}
            className={cn(
              'group flex items-center justify-between gap-4 border px-4 py-4 text-left transition-all',
              isActive ? activeBorderColor : borderColor,
              isActive ? activeBgColor : bgColor,
            )}
          >
            {renderItem(item, index, isActive)}
            <ArrowRight
              className={cn(
                'h-4 w-4 transition-transform',
                isActive ? activeArrowColor : arrowColor,
                isActive ? 'translate-x-0' : 'group-hover:translate-x-0.5',
              )}
            />
          </button>
        )
      })}
    </div>
  )
}
