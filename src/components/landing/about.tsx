import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import graniteBlueBackground from '@/assets/images/bg3_v1.png'

type AboutPillar = {
  label: string
  description: string
}

type AboutHighlight = {
  label: string
  value: string
}

const aboutPillars: Array<AboutPillar> = [
  {
    label: 'Scripture',
    description:
      'Forming disciples who are grounded in biblical truth before public influence.',
  },
  {
    label: 'Wisdom',
    description:
      'Developing practical judgment, maturity, and disciplined character for real leadership.',
  },
  {
    label: 'Nations',
    description:
      'Preparing believers to carry Christ-centered influence into communities and societies.',
  },
]

const aboutHighlights: Array<AboutHighlight> = [
  {
    label: 'Mission',
    value: 'Raise biblically grounded disciples who transform their spheres for the glory of God.',
  },
  {
    label: 'Vision',
    value: 'See nations shaped by believers walking in faith, wisdom, and excellence.',
  },
]

export function LandingAboutSection() {
  return (
    <section
      id="about"
      className="relative isolate overflow-hidden border-b border-[#C5A059]/14 text-[#F7F4EE]"
      style={{
        backgroundImage: `linear-gradient(180deg, rgba(10,14,20,0.9), rgba(12,16,22,0.95)), url(${graniteBlueBackground})`,
        backgroundPosition: 'center',
        backgroundSize: 'cover',
      }}
    >
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'radial-gradient(circle at top left, rgba(197,160,89,0.15), transparent 28%), radial-gradient(circle at bottom right, rgba(127,154,180,0.14), transparent 26%)',
        }}
      />
      <div className="absolute top-24 left-[8%] h-px w-20 bg-[#C5A059]/45 lg:w-28" />
      <div className="absolute right-[8%] bottom-24 h-px w-16 bg-white/12 lg:w-24" />

      <div className="relative mx-auto max-w-[calc(100%-2rem)] px-5 py-18 sm:max-w-[calc(100%-4rem)] sm:px-8 sm:py-22 lg:max-w-[calc(100%-8rem)] lg:px-12 lg:py-24">
        <div className="grid items-start gap-14 lg:grid-cols-[minmax(0,1.02fr)_minmax(22rem,0.98fr)] lg:gap-20">
          <div className="space-y-10">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-3 text-[0.72rem] font-medium tracking-[0.32em] text-[#D4B373] uppercase">
                <span className="h-px w-10 bg-[#C5A059]/55" />
                About DINA
              </div>

              <h2 className="max-w-[12ch] font-serif text-[clamp(3rem,5vw,5.2rem)] leading-[0.92] tracking-[-0.055em] text-[#F8F4EC]">
                A Bible academy shaped for leaders, nations, and long obedience.
              </h2>

              <p className="max-w-2xl text-base leading-8 font-light tracking-[0.04em] text-[#D2D8DF] sm:text-lg">
                Disciples Institute for Nations Academy equips believers with
                biblical depth, disciplined character, and practical wisdom so
                they can carry faithful influence into homes, churches,
                communities, and nations.
              </p>

              <p className="max-w-xl font-serif text-[1.28rem] leading-8 text-[#E5D9C1] sm:text-[1.48rem]">
                Formation before platform. Christ before visibility.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {aboutPillars.map((pillar) => (
                <div
                  key={pillar.label}
                  className="border border-white/10 bg-white/[0.04] px-5 py-5 shadow-[0_24px_44px_-34px_rgba(0,0,0,0.55)] backdrop-blur-sm"
                >
                  <div className="text-[0.66rem] font-medium tracking-[0.28em] text-[#D4B373] uppercase">
                    {pillar.label}
                  </div>
                  <p className="mt-3 text-sm leading-7 text-[#CDD5DE]">
                    {pillar.description}
                  </p>
                </div>
              ))}
            </div>

            <div className="pt-2">
              <Link
                to="/signup"
                search={{ token: '' }}
                className="inline-flex h-13 items-center justify-center gap-3 border border-[#C5A059]/45 bg-linear-to-b from-[#2A2A2A] to-[#111111] px-7 text-[0.74rem] font-medium tracking-[0.24em] text-[#E9D9B4] uppercase shadow-[0_28px_56px_-30px_rgba(0,0,0,0.72)] transition-all hover:-translate-y-0.5 hover:border-[#D6B16E] hover:text-white"
              >
                Begin the journey
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="relative border border-white/10 bg-[#101720]/56 p-4 shadow-[0_46px_110px_-56px_rgba(0,0,0,0.82)] backdrop-blur-sm sm:p-5">
            <div
              className="border border-white/10 px-6 py-7 sm:px-8 sm:py-8"
              style={{
                backgroundImage:
                  'linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))',
              }}
            >
              <div className="text-[0.68rem] font-medium tracking-[0.3em] text-[#D4B373] uppercase">
                The mandate
              </div>
              <div className="mt-4 max-w-[16ch] font-serif text-[clamp(2.2rem,4vw,3.7rem)] leading-[0.96] tracking-[-0.05em] text-[#F8F4EC]">
                Form disciples who can carry truth with weight.
              </div>
              <div className="mt-8 h-px w-16 bg-[#C5A059]/45" />

              <div className="mt-8 space-y-4">
                {aboutHighlights.map((item) => (
                  <div
                    key={item.label}
                    className="border border-white/10 bg-black/18 px-5 py-5"
                  >
                    <div className="text-[0.65rem] font-medium tracking-[0.28em] text-[#AFA28F] uppercase">
                      {item.label}
                    </div>
                    <p className="mt-3 text-sm leading-7 text-[#D2D8DF] sm:text-[0.96rem]">
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <div className="border border-white/10 bg-white/[0.04] px-4 py-4">
                <div className="text-[0.62rem] font-medium tracking-[0.28em] text-[#AFA28F] uppercase">
                  Emphasis
                </div>
                <div className="mt-2 font-serif text-xl text-[#F8F4EC]">
                  Depth
                </div>
              </div>
              <div className="border border-white/10 bg-white/[0.04] px-4 py-4">
                <div className="text-[0.62rem] font-medium tracking-[0.28em] text-[#AFA28F] uppercase">
                  Posture
                </div>
                <div className="mt-2 font-serif text-xl text-[#F8F4EC]">
                  Wisdom
                </div>
              </div>
              <div className="border border-white/10 bg-white/[0.04] px-4 py-4">
                <div className="text-[0.62rem] font-medium tracking-[0.28em] text-[#AFA28F] uppercase">
                  Horizon
                </div>
                <div className="mt-2 font-serif text-xl text-[#F8F4EC]">
                  Nations
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
