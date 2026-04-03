import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import marbleTexture from '@/assets/images/bg.jpg'
import heroEmblem from '@/assets/images/DINA_v3-Photoroom.png'

type LandingHeroProps = {
  onLearnMore?: () => void
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
    <header className="pointer-events-none fixed inset-x-0 top-0 z-50 px-4 pt-4 sm:px-6 lg:px-8">
      <div className="mx-auto flex h-12 max-w-[calc(100%-2rem)] items-center justify-between sm:max-w-[calc(100%-4rem)] lg:max-w-full">
        <Link to="/" className="pointer-events-auto">
          <LandingMark />
        </Link>

        <div className="pointer-events-auto">
          <Link
            to="/login"
            search={{ verified: false }}
            className="bg-[# ]/76 inline-flex h-10 items-center justify-center border border-[#1A1A1A]/10 px-4 text-[0.7rem] font-medium tracking-[0.24em] text-[#1A1A1A] uppercase shadow-[0_16px_28px_-24px_rgba(0,0,0,0.28)] backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:border-[#C5A059]/45 hover:text-[#1A1A1A]"
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

export function LandingHeroEditorial({ onLearnMore }: LandingHeroProps) {
  return (
    <section
      id="home"
      className="relative isolate overflow-hidden border-b border-[#1A1A1A]/10"
      data-has-secondary={Boolean(onLearnMore)}
      style={{
        backgroundImage: `linear-gradient(180deg, rgba(255,255,255,0.82), rgba(255,255,255,0.45) 22%, rgba(248,244,236,0.9) 100%), url(${marbleTexture})`,
        backgroundPosition: 'center',
        backgroundSize: 'cover',
      }}
    >
      <div className="absolute top-24 left-[8%] h-px w-20 bg-[#C5A059]/50 lg:top-36 lg:w-28" />
      <div className="absolute bottom-24 left-[8%] h-px w-16 bg-[#1A1A1A]/10 lg:w-24" />

      <div className="relative mx-auto max-w-[calc(100%-2rem)] px-5 pt-28 pb-20 sm:max-w-[calc(100%-4rem)] sm:px-8 sm:pt-32 sm:pb-22 lg:max-w-[calc(100%-8rem)] lg:px-12 lg:pt-36 lg:pb-24">
        <div className="grid min-h-[calc(100svh-14rem)] grid-cols-1 items-start gap-14 lg:grid-cols-[minmax(0,1.02fr)_minmax(24rem,0.98fr)] lg:gap-20">
          <div className="max-w-xl space-y-11 text-left">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-3 text-[0.72rem] font-medium tracking-[0.3em] text-[#9B7A41] uppercase">
                <span className="h-px w-10 bg-[#C5A059]/55" />
                DINA
              </div>

              <h1 className="max-w-[12ch] font-serif text-[clamp(3.9rem,7vw,6.7rem)] leading-[0.88] tracking-[-0.06em] text-[#1C1815]">
                <span className="block">Disciplers of</span>
                <span className="block sm:whitespace-nowrap">
                  Nations Academy
                </span>
              </h1>

              <p className="max-w-lg font-serif text-[1.35rem] leading-8 text-[#5E5549] sm:text-[1.6rem]">
                Learn Christ, not theology.
              </p>

              <p className="max-w-xl text-base leading-8 font-light tracking-[0.05em] text-[#4B443A] sm:text-lg">
                An elite, world-class Bible academy for global leaders—timeless,
                authoritative, serene, and intellectually profound.
              </p>
            </div>

            <div className="pt-2">
              <Link
                to="/signup"
                search={{ token: '' }}
                className="group inline-flex h-14 items-center justify-center gap-3 border border-[#C5A059]/55 bg-linear-to-b from-[#2A2A2A] to-[#111111] px-8 font-serif text-base tracking-[0.12em] text-[#E9D9B4] shadow-[0_28px_60px_-28px_rgba(0,0,0,0.7)] transition-all hover:-translate-y-0.5 hover:border-[#D6B16E] hover:text-white"
              >
                Enrollment
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>

          <HeroVisual />
        </div>
      </div>
    </section>
  )
}
