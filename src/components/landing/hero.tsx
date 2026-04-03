import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import marbleTexture from '@/assets/images/bg.jpg'
import heroEmblem from '@/assets/images/DINA_v3-Photoroom.png'

type LandingHeroProps = {
  onLearnMore?: () => void
}

function LandingMark() {
  return (
    <div className="flex items-center gap-3">
      <div className="relative flex h-10 w-10 items-center justify-center border border-[#C5A059]/35 bg-[#FCFBF8] shadow-[0_18px_32px_-24px_rgba(0,0,0,0.28)]">
        <img
          src={heroEmblem}
          alt="DINA"
          className="relative h-7 w-7 object-contain"
        />
      </div>
      <span className="text-[0.78rem] font-medium tracking-[0.34em] text-[#1A1A1A] uppercase">
        DINA
      </span>
    </div>
  )
}

export function LandingPublicHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-[#1A1A1A]/8 bg-[#FCFBF8]/96 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto grid h-[4.75rem] max-w-[calc(100%-2rem)] grid-cols-[1fr_auto_1fr] items-center sm:max-w-[calc(100%-4rem)] lg:max-w-[calc(100%-8rem)]">
        <div className="justify-self-start">
          <Link
            to="/login"
            search={{ verified: false }}
            className="inline-flex h-10 items-center justify-center border border-[#1A1A1A]/10 bg-white px-4 text-[0.7rem] font-medium tracking-[0.24em] text-[#1A1A1A] uppercase shadow-[0_16px_28px_-24px_rgba(0,0,0,0.28)] transition-all hover:-translate-y-0.5 hover:border-[#C5A059]/45 hover:text-[#1A1A1A]"
          >
            Sign In
          </Link>
        </div>

        <Link to="/" className="justify-self-center px-4">
          <LandingMark />
        </Link>

        <div className="flex items-center gap-4 justify-self-end">
          <div className="hidden h-px w-14 bg-[#1A1A1A]/10 sm:block" />
          <span className="hidden text-[0.62rem] font-medium tracking-[0.28em] text-[#7A6E5E] uppercase lg:inline">
            Learn Christ
          </span>
        </div>
      </div>
    </header>
  )
}

function HeroVisual() {
  return (
    <div className="relative flex items-center justify-center lg:justify-end">
      <div className="relative h-140 w-full max-w-132 sm:h-156 lg:h-192">
        {/* <div
          className="absolute -inset-y-10 -right-12 hidden w-[120%] opacity-40 blur-[2px] lg:block"
          style={{
            backgroundImage: `linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,0.08) 28%, rgba(26,26,26,0.16) 100%), url(${v3})`,
            backgroundPosition: 'center',
            backgroundSize: 'cover',
          }}
        />
        <div
          className="absolute inset-y-0 right-0 w-[90%] border border-[#C5A059]/24 shadow-[0_55px_120px_-52px_rgba(0,0,0,0.8)]"
          style={{
            backgroundImage: `linear-gradient(180deg, rgba(11, 11, 13, 0.58), rgba(28, 28, 32, 0.78)), url(${v3})`,
            backgroundPosition: 'center 28%',
            backgroundSize: 'cover',
          }}
        /> */}
        <div className="absolute top-[33%] -right-10 w-full -translate-y-1/2">
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
      {/* <div
        className="absolute inset-y-0 right-0 hidden w-[48%] opacity-90 lg:block"
        style={{
          backgroundImage: `linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(248,244,236,0.1) 10%, rgba(26,26,26,0.14) 100%), url(${v3})`,
          backgroundPosition: 'center right',
          backgroundSize: 'cover',
        }}
      /> */}
      <div className="absolute top-24 left-[8%] h-px w-20 bg-[#C5A059]/50 lg:w-28" />
      <div className="absolute bottom-24 left-[8%] h-px w-16 bg-[#1A1A1A]/10 lg:w-24" />

      <div className="relative mx-auto max-w-[calc(100%-2rem)] px-5 pt-18 pb-20 sm:max-w-[calc(100%-4rem)] sm:px-8 sm:pt-22 lg:max-w-[calc(100%-8rem)] lg:px-12 lg:pt-2 lg:pb-24">
        <div className="grid min-h-[calc(100vh-2rem)] grid-cols-1 items-center gap-16 lg:grid-cols-[minmax(0,1.05fr)_minmax(22rem,0.95fr)] lg:gap-24">
          <div className="max-w-3xl space-y-10 text-left">
            {/* <div className="inline-flex items-center border border-[#1A1A1A]/10 bg-white/55 px-4 py-2 text-[0.66rem] font-medium tracking-[0.34em] text-[#5E5549] uppercase shadow-[0_20px_40px_-30px_rgba(0,0,0,0.35)] backdrop-blur-sm">
              Elite Bible academy for global leaders
            </div> */}

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

            <div className="pt-4">
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
