import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface AuthPageShellProps {
  backgroundImage: string
  tone: 'light' | 'dark'
  eyebrow: string
  title: ReactNode
  quote: ReactNode
  scripture: string
  children: ReactNode
  columnClassName?: string
  containerClassName?: string
  titleClassName?: string
  showHairline?: boolean
}

interface AuthFeaturePanelProps {
  backgroundImage: string
  children: ReactNode
  chip?: {
    label: string
    value: string
  }
  minHeightClassName?: string
  brandLabelClassName?: string
}

interface AuthFormSurfaceProps {
  children: ReactNode
  className?: string
}

interface AuthCenteredStateProps {
  backgroundImage: string
  eyebrow: string
  title: string
  children: ReactNode
}

interface AuthLoadingStateProps {
  backgroundImage: string
  children: ReactNode
}

interface EnrolmentPageShellProps {
  image: string
  imageAlt: string
  imageKey: string
  label: string
  title: string
  quote: ReactNode
  children: ReactNode
}

const authTone = {
  light: {
    section: 'border-[#1A1A1A]/10 text-[#1C1815]',
    backgroundOverlay:
      'linear-gradient(to bottom, rgba(255,255,255,0.9), rgba(255,255,255,0.9))',
    radial:
      'bg-[radial-gradient(circle_at_top_right,rgba(197,160,89,0.12),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.28),transparent_22%)]',
    hairline: 'bg-[#1A1A1A]/12',
    eyebrowLine: 'bg-[#9B7A41]/50',
    eyebrowInnerLine: 'bg-[#9B7A41]/55',
    title: 'text-[#1C1815]',
    quote: 'text-[#4E463D]',
    footerBorder: 'border-[#1A1A1A]/10',
    footerLinkHover: 'hover:text-[#9B7A41]',
  },
  dark: {
    section: 'border-[#C5A059]/14 bg-[#121212] text-[#F8F4EC]',
    backgroundOverlay:
      'linear-gradient(180deg, rgba(10,10,11,0.9), rgba(16,16,17,0.95))',
    radial:
      'bg-[radial-gradient(circle_at_top_left,rgba(197,160,89,0.14),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.06),transparent_22%)]',
    hairline: 'bg-white/12',
    eyebrowLine: 'bg-[#C5A059]/50',
    eyebrowInnerLine: 'bg-[#C5A059]/55',
    title: 'text-[#F8F4EC]',
    quote: 'text-[#CFC6B7]',
    footerBorder: 'border-white/10',
    footerLinkHover: 'hover:text-[#C5A059]',
  },
} as const

type AuthTheme = (typeof authTone)[keyof typeof authTone]

interface AuthPageIntroProps {
  eyebrow: string
  title: ReactNode
  quote: ReactNode
  scripture: string
  theme: AuthTheme
  titleClassName?: string
}

interface AuthPageFooterProps {
  theme: AuthTheme
}

interface AuthFeatureVisualProps {
  backgroundImage: string
  chip?: AuthFeaturePanelProps['chip']
  minHeightClassName: string
  brandLabelClassName: string
}

function AuthPageIntro({
  eyebrow,
  title,
  quote,
  scripture,
  theme,
  titleClassName,
}: AuthPageIntroProps) {
  return (
    <div className="space-y-6">
      <div className="inline-flex flex-col gap-2 text-[0.72rem] font-medium tracking-[0.3em] text-[#9B7A41] uppercase">
        <div className={cn('h-px w-20 lg:w-28', theme.eyebrowLine)} />
        <div className="flex flex-row items-center gap-3">
          <span className={cn('h-px w-10', theme.eyebrowInnerLine)} />
          {eyebrow}
        </div>
      </div>

      <h1
        className={cn(
          'max-w-[14ch] font-serif text-[clamp(3rem,5vw,5.1rem)] leading-[0.92] tracking-[-0.055em]',
          theme.title,
          titleClassName,
        )}
      >
        {title}
      </h1>

      <p
        className={cn(
          'max-w-xl text-base leading-8 font-light tracking-[0.04em] sm:text-lg',
          theme.quote,
        )}
      >
        {quote}
        <br />
        <span className="text-[0.72rem] font-medium tracking-[0.2em] text-[#9B7A41] uppercase">
          {scripture}
        </span>
      </p>
    </div>
  )
}

function AuthPageFooter({ theme }: AuthPageFooterProps) {
  return (
    <div
      className={cn(
        'border-t pt-8 text-[0.65rem] font-medium tracking-[0.18em] text-[#8E816D] uppercase',
        theme.footerBorder,
      )}
    >
      <div>© {new Date().getFullYear()} DINA</div>
      <a
        href="https://cherubim-it.com/"
        target="_blank"
        rel="noopener noreferrer"
        className={cn('mt-1 block transition-colors', theme.footerLinkHover)}
      >
        Cherubim IT
      </a>
    </div>
  )
}

function AuthFeatureVisual({
  backgroundImage,
  chip,
  minHeightClassName,
  brandLabelClassName,
}: AuthFeatureVisualProps) {
  return (
    <div
      className="relative overflow-hidden border border-white/10"
      style={{
        backgroundImage: `linear-gradient(180deg, rgba(7,7,8,0.26), rgba(7,7,8,0.72)), url(${backgroundImage})`,
        backgroundPosition: 'center',
        backgroundSize: 'cover',
      }}
    >
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.12),transparent_38%,rgba(197,160,89,0.14)_100%)]" />
      <div
        className={cn(
          'relative flex flex-col justify-between p-6 sm:p-8',
          minHeightClassName,
        )}
      >
        <AuthFeatureBrand brandLabelClassName={brandLabelClassName} />
        {chip && <AuthFeatureChip chip={chip} />}
      </div>
    </div>
  )
}

function AuthFeatureBrand({
  brandLabelClassName,
}: Pick<AuthFeatureVisualProps, 'brandLabelClassName'>) {
  return (
    <div className="flex items-start justify-between gap-6">
      <div>
        <div
          className={cn(
            'text-[0.68rem] font-medium tracking-[0.3em] uppercase',
            brandLabelClassName,
          )}
        >
          Disciplers of Nations Academy
        </div>
        <div className="mt-3 font-serif text-[clamp(2rem,3.5vw,3rem)] leading-[0.94] tracking-[-0.045em] text-white">
          DINA
        </div>
      </div>
      <div className="border border-white/12 bg-black/18 px-4 py-3 text-[0.9rem] font-medium tracking-[0.26em] text-[#E9D9B4] uppercase">
        {new Date().getFullYear()}
      </div>
    </div>
  )
}

function AuthFeatureChip({
  chip,
}: {
  chip: NonNullable<AuthFeaturePanelProps['chip']>
}) {
  return (
    <div className="max-w-68 border border-white/12 bg-black/24 px-4 py-4 shadow-[0_24px_40px_-30px_rgba(0,0,0,0.55)] backdrop-blur-sm">
      <div className="text-[0.62rem] font-medium tracking-[0.28em] text-[#AFA28F] uppercase">
        {chip.label}
      </div>
      <div className="mt-2 font-serif text-xl leading-tight text-[#F8F4EC]">
        {chip.value}
      </div>
    </div>
  )
}

export function AuthPageShell({
  backgroundImage,
  tone,
  eyebrow,
  title,
  quote,
  scripture,
  children,
  columnClassName,
  containerClassName,
  titleClassName,
  showHairline = false,
}: AuthPageShellProps) {
  const theme = authTone[tone]

  return (
    <section
      className={cn(
        'relative isolate min-h-svh overflow-hidden border-b',
        theme.section,
      )}
      style={{
        backgroundImage: `${theme.backgroundOverlay}, url(${backgroundImage})`,
        backgroundPosition: 'center',
        backgroundSize: 'cover',
      }}
    >
      <div className={cn('absolute inset-0', theme.radial)} />
      {showHairline && (
        <div
          className={cn(
            'absolute right-[8%] bottom-24 h-px w-16 lg:w-24',
            theme.hairline,
          )}
        />
      )}

      <div
        className={cn(
          'relative mx-auto px-3 py-18 sm:max-w-[calc(100%-4rem)] sm:px-6 sm:py-22 lg:max-w-[calc(100%-8rem)] lg:px-12 lg:py-24',
          containerClassName,
        )}
      >
        <div
          className={cn(
            'grid items-start gap-14 lg:grid-cols-[minmax(0,0.82fr)_minmax(24rem,1.18fr)] lg:gap-20',
            columnClassName,
          )}
        >
          <div className="hidden h-full flex-1 flex-col justify-between space-y-10 lg:flex">
            <AuthPageIntro
              eyebrow={eyebrow}
              title={title}
              quote={quote}
              scripture={scripture}
              theme={theme}
              titleClassName={titleClassName}
            />
            <AuthPageFooter theme={theme} />
          </div>

          <div className="mb-8 w-full text-center lg:hidden">
            <h1
              className={cn(
                'font-serif text-[clamp(2.5rem,5vw,4rem)] leading-[0.92] tracking-[-0.055em]',
                theme.title,
                titleClassName,
              )}
            >
              {title}
            </h1>
          </div>

          {children}
        </div>
      </div>
    </section>
  )
}

export function AuthFeaturePanel({
  backgroundImage,
  children,
  chip,
  minHeightClassName = 'min-h-72 lg:min-h-84',
  brandLabelClassName = 'text-[#E9D9B4]',
}: AuthFeaturePanelProps) {
  return (
    <div className="relative border border-white/10 bg-[#171717]/72 p-3.5 shadow-[0_42px_100px_-52px_rgba(0,0,0,0.82)] backdrop-blur-sm sm:p-6">
      <AuthFeatureVisual
        backgroundImage={backgroundImage}
        chip={chip}
        minHeightClassName={minHeightClassName}
        brandLabelClassName={brandLabelClassName}
      />

      <div className="gap-5 border-x border-b border-white/10 bg-[#151515]/88 px-4 py-5 sm:px-8 sm:py-8">
        {children}
      </div>
    </div>
  )
}

export function AuthFormSurface({ children, className }: AuthFormSurfaceProps) {
  return (
    <div
      className={cn(
        'min-h-76 border border-white/10 bg-white/3 p-4 shadow-[0_22px_36px_-30px_rgba(0,0,0,0.4)] sm:p-5',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function AuthCenteredState({
  backgroundImage,
  eyebrow,
  title,
  children,
}: AuthCenteredStateProps) {
  return (
    <section
      className="relative isolate min-h-svh overflow-hidden border-b border-[#1A1A1A]/10 text-[#1C1815]"
      style={{
        backgroundImage: `linear-gradient(to bottom, rgba(255,255,255,0.9), rgba(255,255,255,0.9)), url(${backgroundImage})`,
        backgroundPosition: 'center',
        backgroundSize: 'cover',
      }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(197,160,89,0.12),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.28),transparent_22%)]" />

      <div className="relative mx-auto max-w-[calc(100%-2rem)] px-5 py-18 sm:max-w-[calc(100%-4rem)] sm:px-6 sm:py-22 lg:max-w-[calc(100%-8rem)] lg:px-12 lg:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <div className="inline-flex flex-col items-center gap-3 text-[0.68rem] font-medium tracking-[0.3em] text-[#9B7A41] uppercase">
            <div className="h-px w-16 bg-[#9B7A41]/50" />
            {eyebrow}
          </div>

          <h1 className="mt-6 font-serif text-[clamp(3rem,5vw,5.1rem)] leading-[0.92] tracking-[-0.055em] text-[#1C1815]">
            {title}
          </h1>

          {children}
        </div>
      </div>
    </section>
  )
}

export function AuthLoadingState({
  backgroundImage,
  children,
}: AuthLoadingStateProps) {
  return (
    <section
      className="relative isolate flex min-h-svh items-center justify-center overflow-hidden border-b border-[#1A1A1A]/10 text-[#1C1815]"
      style={{
        backgroundImage: `linear-gradient(to bottom, rgba(255,255,255,0.9), rgba(255,255,255,0.9)), url(${backgroundImage})`,
        backgroundPosition: 'center',
        backgroundSize: 'cover',
      }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(197,160,89,0.12),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.28),transparent_22%)]" />
      <div className="relative flex items-center justify-center py-8">
        {children}
      </div>
    </section>
  )
}

export function EnrolmentPageShell({
  image,
  imageAlt,
  imageKey,
  label,
  title,
  quote,
  children,
}: EnrolmentPageShellProps) {
  return (
    <section className="relative isolate min-h-svh overflow-hidden bg-[#111111] text-[#F8F4EC]">
      <div className="grid min-h-svh lg:grid-cols-2">
        <aside className="relative hidden min-h-svh overflow-hidden lg:block">
          <img
            key={imageKey}
            src={image}
            alt={imageAlt}
            className="animate-in fade-in h-full w-full object-cover duration-1500"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.28),rgba(0,0,0,0.62)),linear-gradient(180deg,rgba(0,0,0,0.12),rgba(0,0,0,0.68))]" />
          <div className="absolute inset-x-0 bottom-0 p-10 xl:p-14">
            <div className="max-w-md border border-white/12 bg-black/28 p-6 backdrop-blur-sm">
              <div className="text-[0.68rem] font-medium tracking-[0.3em] text-[#D4B373] uppercase">
                {label}
              </div>
              <h1 className="mt-4 font-serif text-[clamp(3rem,5vw,5.5rem)] leading-[0.9] tracking-[-0.055em] text-white">
                {title}
              </h1>
              <p className="mt-5 text-sm leading-7 tracking-[0.04em] text-[#E6DDCF]">
                {quote}
              </p>
            </div>
          </div>
        </aside>

        <div className="relative flex min-h-svh flex-col items-center justify-center bg-[#151515] px-5 pt-24 pb-10 sm:px-8 lg:px-12 lg:pt-20">
          <div className="p-6 text-center lg:hidden">
            <h1 className="mt-4 font-serif text-[clamp(3rem,5vw,5.5rem)] leading-[0.9] tracking-[-0.055em] text-white">
              {title}
            </h1>
          </div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(197,160,89,0.14),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.06),transparent_24%)]" />
          <div className="relative w-full max-w-xl">{children}</div>
        </div>
      </div>
    </section>
  )
}
