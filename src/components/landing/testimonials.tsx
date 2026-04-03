import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import testimonialBackground from '@/assets/images/bg5_v2.png'

type TestimonialItem = {
  id: string
  name: string
  role: string
  quote: string
  theme: string
  discipledBy: string
}

const testimonials: Array<TestimonialItem> = [
  {
    id: 'anna-k',
    name: 'Anna K.',
    role: 'Discipleship Apprentice',
    quote:
      'The teaching did not merely inform me; it reordered my inner life. I left with a deeper love for Scripture and a steadier walk with Christ.',
    theme: 'Apostolic Foundations',
    discipledBy: 'Lecturer One & Lecturer Two',
  },
  {
    id: 'daniel-m',
    name: 'Daniel M.',
    role: 'Church Leadership Resident',
    quote:
      'For the first time, doctrine felt weighty, beautiful, and profoundly livable. The clarity I received now shapes every decision I make in ministry.',
    theme: 'Apostolic Foundations',
    discipledBy: 'Lecturer One & Lecturer Two',
  },
  {
    id: 'ruth-a',
    name: 'Ruth A.',
    role: 'Prayer Community Coordinator',
    quote:
      'This formation renewed my prayer life from the inside out. I learned how to stay before God long enough for my motives to be purified.',
    theme: 'Prayer and Presence',
    discipledBy: 'Lecturer Three & Lecturer Four',
  },
  {
    id: 'michael-o',
    name: 'Michael O.',
    role: 'Worship Team Leader',
    quote:
      'The lectures gave language to what my spirit had long desired: nearness, reverence, and a life arranged around the presence of God.',
    theme: 'Prayer and Presence',
    discipledBy: 'Lecturer Three & Lecturer Four',
  },
  {
    id: 'grace-t',
    name: 'Grace T.',
    role: 'Young Adults Mentor',
    quote:
      'I was confronted lovingly, formed deeply, and strengthened practically. My character has become far more anchored than my gifting alone ever allowed.',
    theme: 'Character and Holiness',
    discipledBy: 'Lecturer Five & Lecturer Six',
  },
  {
    id: 'samuel-j',
    name: 'Samuel J.',
    role: 'Bible Study Facilitator',
    quote:
      'The emphasis on holiness and discernment gave me courage to live with conviction. It helped me guard what God is building in me.',
    theme: 'Character and Holiness',
    discipledBy: 'Lecturer Five & Lecturer Six',
  },
  {
    id: 'esther-n',
    name: 'Esther N.',
    role: 'Ministry Operations Lead',
    quote:
      'DINA showed me that order is not cold structure; it is how wisdom protects calling. I lead now with more peace and greater precision.',
    theme: 'Leadership and Order',
    discipledBy: 'Lecturer Seven & Lecturer Eight',
  },
  {
    id: 'jonah-b',
    name: 'Jonah B.',
    role: 'Community Pastor',
    quote:
      'The leadership pair helped me understand responsibility as stewardship. Their teaching made authority feel both weighty and deeply pastoral.',
    theme: 'Leadership and Order',
    discipledBy: 'Lecturer Seven & Lecturer Eight',
  },
  {
    id: 'lina-p',
    name: 'Lina P.',
    role: 'Family Discipleship Worker',
    quote:
      'The mission framework was expansive without becoming abstract. I began to see culture, family, and community as places where Christ can truly reign.',
    theme: 'Mission and Culture',
    discipledBy: 'Lecturer Nine & Lecturer Ten',
  },
  {
    id: 'isaac-d',
    name: 'Isaac D.',
    role: 'Urban Outreach Fellow',
    quote:
      'I came in with zeal but little structure. I left with conviction, perspective, and a clearer sense of how to serve my city faithfully.',
    theme: 'Mission and Culture',
    discipledBy: 'Lecturer Nine & Lecturer Ten',
  },
  {
    id: 'miriam-s',
    name: 'Miriam S.',
    role: 'Church Plant Resident',
    quote:
      'This teaching gave me endurance for the long road. It taught me how to stand steady under pressure without losing tenderness or faith.',
    theme: 'Endurance and Commission',
    discipledBy: 'Lecturer Eleven & Lecturer Twelve',
  },
  {
    id: 'caleb-r',
    name: 'Caleb R.',
    role: 'Cross-Cultural Ministry Apprentice',
    quote:
      'The final formation was not about ambition but faithfulness. I now feel sent with greater humility, clarity, and Christ-centered courage.',
    theme: 'Endurance and Commission',
    discipledBy: 'Lecturer Eleven & Lecturer Twelve',
  },
]

function getRelativeOffset(activeIndex: number, index: number): number {
  const forwardDistance =
    (index - activeIndex + testimonials.length) % testimonials.length
  const backwardDistance = forwardDistance - testimonials.length

  return Math.abs(forwardDistance) <= Math.abs(backwardDistance)
    ? forwardDistance
    : backwardDistance
}

function getCardMotionStyle(offset: number) {
  if (offset === 0) {
    return {
      opacity: 1,
      zIndex: 30,
      filter: 'blur(0px)',
      transform: 'translate3d(-50%, 0, 0) scale(1)',
    }
  }

  if (Math.abs(offset) === 1) {
    return {
      opacity: 0.58,
      zIndex: 20,
      filter: 'blur(0px)',
      transform: `translate3d(calc(-50% + ${offset * 23}rem), 0, 0) scale(0.84)`,
    }
  }

  if (Math.abs(offset) === 2) {
    return {
      opacity: 0.22,
      zIndex: 10,
      filter: 'blur(1.5px)',
      transform: `translate3d(calc(-50% + ${offset * 38}rem), 0, 0) scale(0.72)`,
    }
  }

  return {
    opacity: 0,
    zIndex: 0,
    filter: 'blur(6px)',
    transform: `translate3d(calc(-50% + ${offset < 0 ? -48 : 48}rem), 0, 0) scale(0.68)`,
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
      className="relative isolate overflow-hidden border-b border-[#1A1A1A]/10 text-[#1C1815]"
    >
      <div className="absolute inset-0 overflow-hidden">
        <div
          className="absolute h-full w-full"
          style={{
            backgroundImage: `url(${testimonialBackground})`,
            backgroundPosition: 'center',
            backgroundSize: 'cover',
            transformOrigin: 'center',
          }}
        />
      </div>
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.42),rgba(250,247,241,0.54)_20%,rgba(247,242,233,0.7)_60%,rgba(247,243,237,0.82)_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.35),transparent_22%),radial-gradient(circle_at_bottom_right,rgba(197,160,89,0.14),transparent_24%)]" />
      <div className="absolute top-24 left-[8%] h-px w-20 bg-[#C5A059]/42 lg:w-28" />
      <div className="absolute right-[8%] bottom-24 h-px w-16 bg-[#1A1A1A]/12 lg:w-24" />

      <div className="relative mx-auto max-w-[calc(100%-2rem)] px-5 py-18 sm:max-w-[calc(100%-4rem)] sm:px-8 sm:py-22 lg:max-w-[calc(100%-8rem)] lg:px-12 lg:py-24">
        <div className="space-y-14">
          <div className="grid items-end gap-10 lg:grid-cols-[minmax(0,1fr)_auto]">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-3 text-[0.72rem] font-medium tracking-[0.32em] text-[#9B7A41] uppercase">
                <span className="h-px w-10 bg-[#C5A059]/55" />
                Testimonies of formation
              </div>

              <h2 className="max-w-[12ch] font-serif text-[clamp(3rem,5vw,5.1rem)] leading-[0.92] tracking-[-0.055em] text-[#1C1815]">
                Voices shaped by faithful discipleship.
              </h2>

              <p className="max-w-2xl text-base leading-8 font-light tracking-[0.04em] text-[#4E463D] sm:text-lg">
                Twelve testimonies from people formed under these lecturers,
                each reflecting the depth, gentleness, and authority of the DINA
                journey.
              </p>
            </div>

            <div className="flex items-center gap-3 justify-self-start lg:justify-self-end">
              <button
                type="button"
                onClick={goToPrevious}
                className="inline-flex h-12 w-12 items-center justify-center border border-[#1A1A1A]/10 bg-[#FCFBF8]/74 text-[#1C1815] shadow-[0_22px_34px_-30px_rgba(0,0,0,0.24)] backdrop-blur-sm transition-all duration-500 ease-out hover:-translate-y-0.5 hover:border-[#C5A059]/50 hover:bg-white/80"
                aria-label="Show previous testimony"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={goToNext}
                className="inline-flex h-12 w-12 items-center justify-center border border-[#C5A059]/35 bg-[#1A1716] text-[#E9D9B4] shadow-[0_26px_40px_-28px_rgba(0,0,0,0.4)] transition-all duration-500 ease-out hover:-translate-y-0.5 hover:border-[#D6B16E] hover:text-white"
                aria-label="Show next testimony"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="space-y-8">
            <div className="relative h-116 overflow-hidden sm:h-124 lg:h-128">
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
                    className={`absolute top-0 left-1/2 flex h-full w-76 flex-col justify-between overflow-hidden rounded-xl border px-5 py-6 text-left shadow-[0_34px_72px_-44px_rgba(0,0,0,0.32)] backdrop-blur-[3px] transition-[transform,opacity,filter,background-color,border-color] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] sm:w-92 lg:w-116 xl:w-124 ${
                      isFocused
                        ? 'cursor-default border-[#1A1A1A]/12 bg-[#FCFBF8]/82'
                        : 'cursor-pointer border-[#1A1A1A]/10 bg-white/54 hover:border-[#C5A059]/30 hover:bg-white/68'
                    }`}
                    style={getCardMotionStyle(offset)}
                  >
                    <div className="absolute inset-0 bg-linear-to-b from-white/18 via-transparent to-white/6" />
                    <div className="relative flex min-h-full flex-col justify-between gap-8">
                      <div className="space-y-5">
                        <div className="inline-flex items-center gap-3 text-[0.62rem] font-medium tracking-[0.28em] text-[#9B7A41] uppercase">
                          <span className="h-px w-8 bg-[#C5A059]/45" />
                          {item.theme}
                        </div>

                        <blockquote
                          className={`font-serif leading-[1.55] text-[#1C1815] ${
                            isFocused
                              ? 'text-[1.48rem] sm:text-[1.7rem]'
                              : 'text-[1rem] lg:text-[1.08rem]'
                          }`}
                        >
                          “{item.quote}”
                        </blockquote>
                      </div>

                      <div className="space-y-4 border-t border-[#1A1A1A]/10 pt-5">
                        <div>
                          <div className="text-[0.64rem] font-medium tracking-[0.28em] text-[#8A7B68] uppercase">
                            Testimony
                          </div>
                          <div className="mt-2 font-serif text-[1.22rem] text-[#1C1815]">
                            {item.name}
                          </div>
                          <div className="mt-1 text-sm leading-6 text-[#544C42]">
                            {item.role}
                          </div>
                        </div>

                        <div className="text-[0.72rem] leading-6 tracking-[0.08em] text-[#5E5549] uppercase">
                          Discipled by {item.discipledBy}
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
                      ? 'w-10 bg-[#1A1A1A]'
                      : 'w-5 bg-[#1A1A1A]/18 hover:bg-[#C5A059]/44'
                  }`}
                />
              ))}
            </div>

            <div className="flex flex-col gap-5 border-t border-[#1A1A1A]/10 pt-6 lg:flex-row lg:items-center lg:justify-between"></div>
          </div>
        </div>
      </div>
    </section>
  )
}
