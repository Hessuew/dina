import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import testimonialBackground from '@/assets/images/bg/bg_testimonials.webp'

type TestimonialItem = {
  id: string
  name: string
  role: string
  quote: string
  theme: string
}

const testimonials: Array<TestimonialItem> = [
  {
    id: 'andrew-a',
    name: 'Andrew A.',
    role: 'Apostle, Professor',
    quote:
      'Jesus Christ discipled me Himself during my “Arabia peninsula” experience for three years, and He conducted a “graduation ceremony” for me personally. In the last twenty years I have discipled scores of believers, in the strength of my encounters, to experience the same Jesus. My disciples are now demonstrating supernatural signs and wonders globally.',
    theme: 'Ground',
  },
  {
    id: 'ella',
    name: 'Ella O.',
    role: 'Pastor, -',
    quote: '',
    theme: 'Ground',
  },
  {
    id: 'juhani-j',
    name: 'Juhani J.',
    role: 'Bishop, Programmer',
    quote:
      'Being discipled by my dear brother has changed me irreversibly for the rest of my life. Weight in the spirit matters. Now, carrying a heavy measure of what I have received, I am giving it to others. My dear disciples have become prayer warriors, staying in the cave of Adullam through 5–12 prayer meetings and enjoying them.',
    theme: 'Foundation',
  },
  {
    id: 'akosua-o',
    name: 'Akosua O.',
    role: 'Pastor, Junior programmer',
    quote:
      'Through discipleship, I have experienced significant growth in my faith. It has deepened my knowledge of the Bible, strengthened my spiritual understanding, and equipped me with practical tools to live a spiritually grounded life. Additionally, through discipleship, I have gained wisdom that I would not have acquired otherwise.',
    theme: 'Foundation',
  },
  {
    id: 'emmanuel-e',
    name: 'Emmanuel E.',
    role: 'Pastor, -',
    quote: '',
    theme: 'Walls',
  },
  {
    id: 'ezinne',
    name: 'Ezinne O.',
    role: 'Pastor, -',
    quote:
      'Discipleship has rooted me in the Word of God. It builds and guides me with God, at work, and in daily life. I receive scripture-based answers to difficult questions, reminders of God’s love and care, and are built to serve Jesus wholeheartedly. Through discipleship, I learn the in-depth Word of God, how to apply it daily, and gain structure for personal and spiritual growth. It is a light in my life I feel incredibly privileged to have.',

    theme: 'Walls',
  },
  {
    id: 'sade',
    name: 'Sade P.',
    role: 'Pastor, -',
    quote:
      'My journey of discipleship is rooted in God’s grace! Discipleship has helped me to live intentionally and with purpose for Christ. It came to me at a point in my life where I had no direction and all hope seemed lost. Now I seek to live out Christ’s love daily, growing in faith and guiding others toward purpose and truth.',
    theme: 'Framing',
  },
  {
    id: 'blessing',
    name: 'Blessing A.',
    role: 'Pastor, -',
    quote: '',
    theme: 'Framing',
  },
  {
    id: 'kene',
    name: 'Kene O.',
    role: 'Pastor, -',
    quote: '',
    theme: 'Covering',
  },
  {
    id: 'mahi',
    name: 'Mahidere A.',
    role: 'Pastor, -',
    quote:
      'God provided disciplers for me from this very team, where I was built up and grew in Christ. Many single sessions marked by encounters with the power, wisdom, and comfort of the Holy Spirit have saved me from great crises. The right discipler aids you to rightly position yourself with Jesus Christ.',
    theme: 'Covering',
  },
  {
    id: 'obi',
    name: 'Obi C.',
    role: 'Pastor, -',
    quote: '',
    theme: 'Rooftop',
  },
  {
    id: 'ugo',
    name: 'Ugo O.',
    role: 'Pastor, -',
    quote: '',
    theme: 'Rooftop',
  },
]

function getRelativeOffset(activeIndex: number, itemIndex: number): number {
  const totalItems = testimonials.length
  let offset = itemIndex - activeIndex

  if (offset > totalItems / 2) {
    offset -= totalItems
  } else if (offset < -totalItems / 2) {
    offset += totalItems
  }

  return offset
}

function getCardMotionStyle(offset: number) {
  const absOffset = Math.abs(offset)
  const direction = offset > 0 ? 1 : -1

  if (absOffset === 0) {
    return {
      transform: 'translateX(-50%) translateY(0) scale(1)',
      opacity: 1,
      zIndex: 30,
      filter: 'blur(0px)',
    }
  }

  if (absOffset === 1) {
    return {
      transform: `translateX(calc(-50% + ${direction * 62}%)) translateY(4%) scale(0.92)`,
      opacity: 0.72,
      zIndex: 20,
      filter: 'blur(0.5px)',
    }
  }

  if (absOffset === 2) {
    return {
      transform: `translateX(calc(-50% + ${direction * 88}%)) translateY(6%) scale(0.84)`,
      opacity: 0.32,
      zIndex: 10,
      filter: 'blur(1.5px)',
    }
  }

  return {
    transform: `translateX(calc(-50% + ${direction * 100}%)) translateY(8%) scale(0.76)`,
    opacity: 0,
    zIndex: 0,
    filter: 'blur(3px)',
  }
}

export function LandingTestimonialsSection() {
  const [activeIndex, setActiveIndex] = useState(0)

  const goToPrevious = () => {
    setActiveIndex((currentIndex) =>
      currentIndex === 0 ? testimonials.length - 1 : currentIndex - 1,
    )
  }

  const goToNext = () => {
    setActiveIndex((currentIndex) =>
      currentIndex === testimonials.length - 1 ? 0 : currentIndex + 1,
    )
  }

  return (
    <section
      id="testimonials"
      className="relative isolate overflow-hidden border-b border-[#C5A059]/14 text-[#F7F4EE]"
      style={{
        backgroundImage: `linear-gradient(180deg, rgba(14,13,17,0.922), rgba(10,10,12,0.97)), url(${testimonialBackground})`,
        backgroundPosition: 'center',
        backgroundSize: 'cover',
      }}
    >
      {/* <div
        className="absolute inset-0"
        style={{
          backgroundImage: `url(${testimonialBackground})`,
          backgroundPosition: 'center',
          backgroundSize: 'cover',
        }}
      />
      <div className="absolute inset-0 bg-linear-to-b from-[#0A0807] via-[#0C0A09]/95 to-[#0A0807]" />
      <div className="absolute inset-0 bg-linear-to-b from-[#0A0807] via-[#0C0A09]/5 to-[#0A0807]" />

      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(26,23,22,0.88),transparent_28%,rgba(10,8,7,0.92)_100%)]" /> */}

      <div className="relative mx-auto max-w-[calc(100%-2rem)] px-5 py-18 sm:max-w-[calc(100%-4rem)] sm:px-8 sm:py-22 lg:max-w-[calc(100%-8rem)] lg:px-12 lg:py-28">
        <div className="space-y-16">
          <div className="mx-auto max-w-3xl space-y-8 text-center">
            <div className="inline-flex flex-col items-center gap-3 text-[0.68rem] font-medium tracking-[0.3em] text-[#D4B373] uppercase">
              <div className="h-px w-16 bg-[#C5A059]/50" />
              Formation of pillars
            </div>

            <h2 className="font-serif text-[clamp(3.2rem,6vw,5.5rem)] leading-[0.9] tracking-[-0.055em] text-white">
              Experiences
            </h2>

            <blockquote className="text-[0.6rem] font-medium tracking-[0.3em] text-[#D4B373] italic">
              "And when James, Cephas, and John, who seemed to be pillars"
            </blockquote>

            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={goToPrevious}
                className="inline-flex h-11 w-11 items-center justify-center border border-white/12 bg-white/6 text-[#F8F4EC] transition-all duration-500 ease-out hover:border-[#C5A059]/50 hover:bg-white/10"
                aria-label="Show previous testimony"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="text-sm font-medium tracking-[0.2em] text-[#9B8A73] uppercase">
                {activeIndex + 1} / {testimonials.length}
              </div>
              <button
                type="button"
                onClick={goToNext}
                className="inline-flex h-11 w-11 items-center justify-center border border-[#C5A059]/35 bg-[#1A1716] text-[#E9D9B4] shadow-[0_26px_40px_-28px_rgba(0,0,0,0.4)] transition-all duration-500 ease-out hover:border-[#D6B16E] hover:text-white"
                aria-label="Show next testimony"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="space-y-8">
            <div className="relative h-104 overflow-hidden sm:h-108 lg:h-116">
              {testimonials.map((item, index) => {
                const offset = getRelativeOffset(activeIndex, index)
                const isFocused = offset === 0
                const isVisible = Math.abs(offset) <= 2

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveIndex(index)}
                    aria-hidden={!isVisible}
                    tabIndex={isVisible ? 0 : -1}
                    className={`absolute top-0 left-1/2 flex h-full w-76 flex-col justify-between overflow-hidden border px-6 py-7 text-left shadow-[0_34px_72px_-44px_rgba(0,0,0,0.72)] backdrop-blur-sm transition-[transform,opacity,filter,background-color,border-color] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] sm:w-92 lg:w-116 xl:w-124 ${
                      isFocused
                        ? 'cursor-default border-[#C5A059]/50 bg-[#0F0D0C]/92'
                        : 'cursor-pointer border-[#C5A059]/20 bg-black/60 hover:border-[#C5A059]/35 hover:bg-black/75'
                    }`}
                    style={getCardMotionStyle(offset)}
                  >
                    <div className="relative flex min-h-full flex-col justify-between gap-4">
                      <div className="space-y-6">
                        <div className="inline-flex items-center gap-3 text-[0.6rem] font-medium tracking-[0.3em] text-[#D4B373] uppercase">
                          <span className="h-px w-6 bg-[#C5A059]/45" />
                          {item.theme}
                        </div>

                        <blockquote className="font-serif text-base text-[0.9rem] leading-[1.6] text-white md:text-[1rem] lg:text-[1.1rem] xl:text-[1.2rem]">
                          "{item.quote}"
                        </blockquote>
                      </div>

                      <div className="border-t border-white/8 pt-4 lg:pt-6">
                        <div className="text-[0.62rem] font-medium tracking-[0.3em] text-[#9B8A73] uppercase">
                          Testimony
                        </div>
                        <div className="pt-2 font-serif text-[1.3rem] text-white">
                          {item.name}
                        </div>
                        {/* <div className="mt-1 text-sm leading-6 text-[#D8D0C7]">
                          {item.role}
                        </div> */}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>

            <div className="flex flex-col items-center gap-3">
              <div className="flex flex-wrap items-center justify-center gap-2">
                {testimonials
                  .slice(0, Math.ceil(testimonials.length / 2))
                  .map((item, index) => (
                    <button
                      key={`indicator-${item.id}`}
                      type="button"
                      onClick={() => setActiveIndex(index)}
                      aria-label={`Show testimony from ${item.name}`}
                      className={`border px-3 py-1.5 text-[0.65rem] font-medium tracking-[0.28em] uppercase transition-all duration-500 ease-out ${
                        index === activeIndex
                          ? 'border-[#C5A059]/42 bg-white/8 text-[#D4B373] shadow-[0_24px_44px_-34px_rgba(0,0,0,0.6)]'
                          : 'border-white/10 bg-white/3 text-[#8E816D] hover:border-white/18 hover:bg-white/5'
                      }`}
                    >
                      {item.name}
                    </button>
                  ))}
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2">
                {testimonials
                  .slice(Math.ceil(testimonials.length / 2))
                  .map((item, index) => {
                    const actualIndex =
                      index + Math.ceil(testimonials.length / 2)
                    return (
                      <button
                        key={`indicator-${item.id}`}
                        type="button"
                        onClick={() => setActiveIndex(actualIndex)}
                        aria-label={`Show testimony from ${item.name}`}
                        className={`border px-3 py-1.5 text-[0.65rem] font-medium tracking-[0.28em] uppercase transition-all duration-500 ease-out ${
                          actualIndex === activeIndex
                            ? 'border-[#C5A059]/42 bg-white/8 text-[#D4B373] shadow-[0_24px_44px_-34px_rgba(0,0,0,0.6)]'
                            : 'border-white/10 bg-white/3 text-[#8E816D] hover:border-white/18 hover:bg-white/5'
                        }`}
                      >
                        {item.name}
                      </button>
                    )
                  })}
              </div>
            </div>

            <div className="text-end">
              <blockquote className="text-[0.6rem] font-medium tracking-[0.3em] text-[#D4B373] italic">
                "Make disciples of all nations"
              </blockquote>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
