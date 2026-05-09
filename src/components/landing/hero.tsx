import { Link } from '@tanstack/react-router'
import marbleTexture from '@/assets/images/bg/bg_hero.webp'
import heroEmblem from '@/assets/images/bg/logo.webp'
import {
  LandingSection,
  LandingSectionContainer,
  LandingSectionEyebrow,
} from '@/components/landing/primitives'
import { cn } from '@/lib/utils'

type LandingHeroProps = {
  user?: unknown
}

function LandingMark() {
  return (
    <div className="flex items-center gap-4 text-[#C5A059] mix-blend-difference">
      <div className="flex flex-col items-start gap-1">
        <div className="h-0.5 w-6 rounded-3xl bg-current" />
        <div className="h-0.5 w-4 rounded-3xl bg-current" />
        <div className="h-0.5 w-2 rounded-3xl bg-current" />
      </div>
      <span className="text-[0.72rem] font-medium tracking-[0.3em] uppercase sm:text-[0.78rem]">
        DINA
      </span>
    </div>
  )
}

export function LandingPublicHeader() {
  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-50 px-4 pt-4 sm:px-6 lg:px-6">
      <div className="mx-auto flex h-12 max-w-[calc(100%-2rem)] items-center justify-between sm:max-w-[calc(100%-4rem)] lg:max-w-full">
        <Link to="/" className="pointer-events-auto">
          <LandingMark />
        </Link>

        <div className="pointer-events-auto">
          <Link
            to="/login"
            search={{ verified: false }}
            className="inline-flex h-10 items-center justify-center border border-[#1A1A1A]/10 px-4 text-[0.7rem] font-medium tracking-[0.24em] text-[#1A1A1A] uppercase shadow-[0_16px_28px_-24px_rgba(0,0,0,0.28)] backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:border-[#C5A059]/45 hover:text-[#1A1A1A]"
          >
            Sign In
          </Link>
        </div>
      </div>
    </header>
  )
}

function HeroVisual() {
  return (
    <div className="relative flex items-center justify-center lg:justify-end">
      <div className="relative h-120 w-full max-w-124 sm:h-144 sm:max-w-xl lg:h-168 lg:max-w-160">
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 lg:right-0 lg:left-auto lg:w-full">
          <div className="relative flex items-center justify-center">
            <img
              src={heroEmblem}
              alt="DINA emblem"
              className="relative w-full object-contain drop-shadow-[0_46px_54px_rgba(0,0,0,0.62)]"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export function LandingHeroEditorial({ user }: LandingHeroProps) {
  return (
    <LandingSection
      id="home"
      className="border-b border-[#1A1A1A]/10"
      style={{
        backgroundImage: `linear-gradient(180deg, rgba(255,255,255,0.82), rgba(255,255,255,0.45) 22%, rgba(248,244,236,0.9) 100%), url(${marbleTexture})`,
        backgroundPosition: 'center',
        backgroundSize: 'cover',
      }}
    >
      <div className="absolute bottom-24 left-[8%] h-px w-16 bg-[#1A1A1A]/10 lg:w-24" />

      <LandingSectionContainer className="pt-28 pb-20 sm:pt-32 sm:pb-22 lg:pt-36 lg:pb-24">
        <div className="grid min-h-[calc(100svh-14rem)] grid-cols-1 items-start gap-14 lg:grid-cols-[minmax(0,1.02fr)_minmax(24rem,0.98fr)] lg:gap-20">
          <div className="max-w-xl space-y-11 text-left">
            <div className="space-y-6">
              <LandingSectionEyebrow label="DINA" />

              <h1 className="max-w-[12ch] font-serif text-[clamp(3.9rem,7vw,6.7rem)] leading-[0.88] tracking-[-0.06em] text-[#1C1815]">
                <span className="block">Disciplers of</span>
                <span className={cn('block', !user && 'sm:whitespace-nowrap')}>
                  Nations Academy
                </span>
              </h1>

              <p className="max-w-lg font-serif text-[1.35rem] leading-8 text-[#5E5549] sm:text-[1.6rem]">
                Learn Christ, not theology.
              </p>

              <p className="max-w-xl text-base leading-8 font-light tracking-[0.05em] text-[#4B443A] sm:text-lg">
                "Now when they saw the boldness of Peter and John, and perceived
                that they were unlearned and ignorant men, they marvelled; and
                they took knowledge of them, that they had been with Jesus."
                Acts 4:13
              </p>
            </div>
          </div>

          <HeroVisual />
        </div>
      </LandingSectionContainer>
    </LandingSection>
  )
}
