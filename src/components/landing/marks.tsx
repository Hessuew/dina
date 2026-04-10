import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import marksBackground from '@/assets/images/bg6_v1.png'

type MarkItem = {
  id: string
  title: string
  description: string
}

const marks: Array<MarkItem> = [
  {
    id: 'miracles',
    title: 'Miracles',
    description:
      "We believe in the present-day power of God to heal, deliver, and transform lives through supernatural intervention. Miracles are not relics of the past but living expressions of Christ's authority today.",
  },
  {
    id: 'signs',
    title: 'Signs',
    description:
      'God confirms His word through signs that point beyond themselves to deeper realities. We teach students to recognize and steward the signs that authenticate the gospel and reveal the kingdom.',
  },
  {
    id: 'wonders',
    title: 'Wonders',
    description:
      'The awe-inspiring works of God that stir faith, provoke worship, and display His glory. We cultivate an expectation for the wonder-working power of the Holy Spirit in every sphere of ministry.',
  },
  {
    id: 'doctrine',
    title: 'Doctrine',
    description:
      'Sound doctrine is the anchor of formation. We hold to historic, biblical orthodoxy with clarity and conviction, refusing mixture while embracing the fullness of apostolic teaching.',
  },
  {
    id: 'revelation',
    title: 'Revelation',
    description:
      'The progressive unveiling of Christ through Scripture, the Spirit, and the community of faith. We train students to receive, test, and walk in the revelation that sustains mature discipleship.',
  },
]

export function LandingMarksSection() {
  const [activeIndex, setActiveIndex] = useState(0)
  const activeMark = marks[activeIndex]

  const goToPrevious = () => {
    setActiveIndex((currentIndex) =>
      currentIndex === 0 ? marks.length - 1 : currentIndex - 1,
    )
  }

  const goToNext = () => {
    setActiveIndex((currentIndex) =>
      currentIndex === marks.length - 1 ? 0 : currentIndex + 1,
    )
  }

  return (
    <section
      id="marks"
      className="relative isolate overflow-hidden border-b border-[#C5A059]/14 text-[#F7F4EE]"
      style={{
        backgroundImage: `linear-gradient(180deg, rgba(14,13,17,0.622), rgba(10,10,12,0.67)), url(${marksBackground})`,
        backgroundPosition: 'center',
        backgroundSize: 'cover',
      }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(197,160,89,0.14),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.06),transparent_22%)]" />
      <div className="absolute right-[8%] bottom-24 h-px w-16 bg-white/12 lg:w-24" />

      <div className="relative mx-auto max-w-[calc(100%-2rem)] px-5 py-18 sm:max-w-[calc(100%-4rem)] sm:px-8 sm:py-22 lg:max-w-[calc(100%-8rem)] lg:px-12 lg:py-24">
        <div className="grid items-start gap-14 lg:grid-cols-[minmax(0,0.88fr)_minmax(24rem,1.12fr)] lg:gap-20">
          <div className="space-y-10">
            <div className="space-y-6">
              <div className="inline-flex flex-col gap-2 text-[0.72rem] font-medium tracking-[0.3em] text-[#9B7A41] uppercase">
                <div className="mb-2 h-px w-20 bg-[#C5A059]/50 lg:w-28" />
                <div className="h-px w-20 bg-[#C5A059]/50 lg:w-28" />
                <div className="flex flex-row items-center gap-3">
                  <span className="h-px w-10 bg-[#C5A059]/55" />
                  Marks of Formation
                </div>
              </div>

              <h2 className="max-w-[14ch] font-serif text-[clamp(3rem,5vw,5.1rem)] leading-[0.92] tracking-[-0.055em] text-[#F8F4EC]">
                Five convictions that shape everything.
              </h2>

              <p className="max-w-xl text-base leading-8 font-light tracking-[0.04em] text-[#D3CAC0] sm:text-lg">
                These are not abstract ideas but lived realities that define the
                DINA formation journey. Each mark is woven into our teaching,
                worship, and community life.
              </p>
            </div>

            <div className="flex items-center justify-between gap-6 border-y border-white/10 py-5">
              <div>
                <div className="text-[0.68rem] font-medium tracking-[0.3em] text-[#9B8A73] uppercase">
                  Active mark
                </div>
                <div className="mt-2 font-serif text-2xl text-[#F8F4EC]">
                  {activeMark.title}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={goToPrevious}
                  className="inline-flex h-12 w-12 items-center justify-center border border-white/12 bg-white/6 text-[#F8F4EC] transition-all hover:-translate-y-0.5 hover:border-[#C5A059]/50 hover:bg-white/10"
                  aria-label="Show previous mark"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={goToNext}
                  className="inline-flex h-12 w-12 items-center justify-center border border-[#C5A059]/35 bg-[#1A1716] text-[#E9D9B4] transition-all hover:-translate-y-0.5 hover:border-[#D6B16E] hover:text-white"
                  aria-label="Show next mark"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {marks.map((mark, index) => {
                const isActive = index === activeIndex

                return (
                  <button
                    key={mark.id}
                    type="button"
                    onClick={() => setActiveIndex(index)}
                    className={`group flex items-start gap-3 border px-4 py-4 text-left transition-all ${
                      isActive
                        ? 'border-[#C5A059]/42 bg-white/8 shadow-[0_24px_44px_-34px_rgba(0,0,0,0.6)]'
                        : 'border-white/10 bg-white/3 hover:border-white/18 hover:bg-white/5'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-serif text-xl text-[#F8F4EC]">
                        {mark.title}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          <div
            key={activeMark.id}
            className="relative flex min-h-112 flex-col justify-center space-y-8 border border-white/10 bg-[#151311]/70 px-6 py-10 shadow-[0_42px_100px_-52px_rgba(0,0,0,0.84)] backdrop-blur-sm sm:px-10 sm:py-12 lg:min-h-128"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(197,160,89,0.08),transparent_32%)]" />

            <div className="relative space-y-8">
              <div
                className="animate-[fadeInSlideUp_0.7s_ease-out_forwards] opacity-0"
                style={{ animationDelay: '0.1s' }}
              >
                <div className="text-[0.68rem] font-medium tracking-[0.3em] text-[#D4B373] uppercase">
                  Mark {activeIndex + 1} of {marks.length}
                </div>
                <h3 className="mt-3 max-w-[10ch] font-serif text-[clamp(3.2rem,5vw,5.5rem)] leading-[0.9] tracking-[-0.055em] text-white">
                  {activeMark.title}
                </h3>
              </div>

              <div
                className="animate-[fadeInSlideUp_0.7s_ease-out_forwards] opacity-0"
                style={{ animationDelay: '0.4s' }}
              >
                <p className="max-w-2xl text-base leading-8 text-[#D8D0C7] sm:text-lg">
                  {activeMark.description}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {marks.map((mark, index) => (
                <button
                  key={`indicator-${mark.id}`}
                  type="button"
                  onClick={() => setActiveIndex(index)}
                  aria-label={`Show ${mark.title}`}
                  className={`h-1.5 transition-all duration-500 ease-out ${
                    index === activeIndex
                      ? 'w-10 bg-white'
                      : 'w-5 bg-white/18 hover:bg-[#C5A059]/44'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
