import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import testimonialBackground from '@/assets/images/bg4_v1.png'

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
      'The teaching did not merely inform me; it reordered my inner life. I left with a deeper love for Scripture and a steadier walk with Christ.',
    theme: 'Ground',
  },
  {
    id: 'ella',
    name: 'Ella',
    role: 'Pastor, -',
    quote:
      'For the first time, doctrine felt weighty, beautiful, and profoundly livable. The clarity I received now shapes every decision I make in ministry.',
    theme: 'Ground',
  },
  {
    id: 'juhani-j',
    name: 'Juhani J.',
    role: 'Bishop, Programmer',
    quote:
      'This formation renewed my prayer life from the inside out. I learned how to stay before God long enough for my motives to be purified.',
    theme: 'Foundation',
  },
  {
    id: 'akosua-o',
    name: 'Akosua O.',
    role: 'Pastor, Junior programmer',
    quote:
      'The lectures gave language to what my spirit had long desired: nearness, reverence, and a life arranged around the presence of God.',
    theme: 'Foundation',
  },
  {
    id: 'emmanuel-e',
    name: 'Emmanuel E.',
    role: 'Pastor, -',
    quote:
      'I was confronted lovingly, formed deeply, and strengthened practically. My character has become far more anchored than my gifting alone ever allowed.',
    theme: 'Walls',
  },
  {
    id: 'ezinne',
    name: 'Ezinne',
    role: 'Pastor, -',
    quote:
      'The emphasis on holiness and discernment gave me courage to live with conviction. It helped me guard what God is building in me.',
    theme: 'Walls',
  },
  {
    id: 'sade',
    name: 'Sade',
    role: 'Pastor, -',
    quote:
      'DINA showed me that order is not cold structure; it is how wisdom protects calling. I lead now with more peace and greater precision.',
    theme: 'Framing',
  },
  {
    id: 'blessing',
    name: 'Blessing',
    role: 'Pastor, -',
    quote:
      'The leadership pair helped me understand responsibility as stewardship. Their teaching made authority feel both weighty and deeply pastoral.',
    theme: 'Framing',
  },
  {
    id: 'kene',
    name: 'Kene',
    role: 'Pastor, -',
    quote:
      'The teaching on worship recentered my entire posture before God. I now approach ministry from a place of adoration, not just duty.',
    theme: 'Covering',
  },
  {
    id: 'mahi',
    name: 'Mahidere A.',
    role: 'Pastor, -',
    quote:
      "I learned that spiritual authority is not about control; it is about carrying the weight of God's purposes with humility and strength.",
    theme: 'Covering',
  },
  {
    id: 'obi',
    name: 'Obi',
    role: 'Pastor, -',
    quote:
      'The formation journey taught me that maturity is not measured by gifting but by how deeply Christ has shaped my character.',
    theme: 'Rooftop',
  },
  {
    id: 'ugo',
    name: 'Ugo',
    role: 'Pastor, -',
    quote:
      'DINA gave me a vision for discipleship that is both tender and uncompromising. I now lead with more clarity and far more love.',
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
                    <div className="relative flex min-h-full flex-col justify-between gap-10">
                      <div className="space-y-6">
                        <div className="inline-flex items-center gap-3 text-[0.6rem] font-medium tracking-[0.3em] text-[#D4B373] uppercase">
                          <span className="h-px w-6 bg-[#C5A059]/45" />
                          {item.theme}
                        </div>

                        <blockquote className="font-serif text-[1.32rem] leading-[1.6] text-white sm:text-[1.55rem]">
                          "{item.quote}"
                        </blockquote>
                      </div>

                      <div className="border-t border-white/8 pt-6">
                        <div className="text-[0.62rem] font-medium tracking-[0.3em] text-[#9B8A73] uppercase">
                          Testimony
                        </div>
                        <div className="mt-2 font-serif text-[1.3rem] text-white">
                          {item.name}
                        </div>
                        <div className="mt-1 text-sm leading-6 text-[#D8D0C7]">
                          {item.role}
                        </div>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2">
              {testimonials.map((item, index) => (
                <button
                  key={`indicator-${item.id}`}
                  type="button"
                  onClick={() => setActiveIndex(index)}
                  aria-label={`Show testimony from ${item.name}`}
                  className={`h-1.5 transition-all duration-500 ease-out ${
                    index === activeIndex
                      ? 'w-10 bg-white'
                      : 'w-5 bg-white/18 hover:bg-[#C5A059]/44'
                  }`}
                />
              ))}
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
