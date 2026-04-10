import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react'
import graphiteBackground from '@/assets/images/bg2_v1.png'

type CourseShowcaseItem = {
  id: string
  number: string
  title: string
  eyebrow: string
  description: string
  lessons: [string, string, string]
}

const courseShowcaseItems: Array<CourseShowcaseItem> = [
  {
    id: 'ground',
    number: '01',
    title: 'Ground',
    eyebrow: 'House of truth',
    description:
      'Establish a life that is rooted in Scripture, identity in Christ, and disciplined obedience before anything else is built.',
    lessons: [
      'Authority of Scripture',
      'Identity and repentance',
      'Habits of hidden formation',
    ],
  },
  {
    id: 'foundation',
    number: '02',
    title: 'Foundation',
    eyebrow: 'Deep inner life',
    description:
      'Recover the hidden sources that sustain long-term ministry: prayer, presence, purity of motive, and spiritual hunger.',
    lessons: [
      'Prayer that opens depth',
      'Learning the presence of God',
      'Drawing from living water',
    ],
  },
  {
    id: 'walls',
    number: '03',
    title: 'Walls',
    eyebrow: 'Guarding the house',
    description:
      'Build holy boundaries that preserve conviction, protect character, and keep the inner life from compromise.',
    lessons: [
      'Holiness and separation',
      'Guarding thought and desire',
      'Discernment against mixture',
    ],
  },
  {
    id: 'framing',
    number: '04',
    title: 'Framing',
    eyebrow: 'Kingdom structure',
    description:
      'Give shape to calling through biblical order, leadership architecture, and a worldview strong enough to carry responsibility.',
    lessons: [
      'Biblical worldview and order',
      'Leadership that carries weight',
      'Alignment of life and mission',
    ],
  },
  {
    id: 'interior',
    number: '05',
    title: 'Interior',
    eyebrow: 'Covering and endurance',
    description:
      'Learn endurance, spiritual covering, and mature strength so what God builds in you can endure pressure and weather.',
    lessons: [
      'Perseverance under pressure',
      'Honor, covering, and trust',
      'Standing firm in adversity',
    ],
  },
  {
    id: 'roof',
    number: '06',
    title: 'Roof',
    eyebrow: 'Sent to the nations',
    description:
      'Move from formation into mission with clarity, courage, and a Christ-centered vision for influence among people and nations.',
    lessons: [
      'Calling, assignment, and burden',
      'Discipling culture and community',
      'Being sent with authority',
    ],
  },
]

export function LandingCourseShowcase() {
  const [activeIndex, setActiveIndex] = useState(0)
  const activeCourse = courseShowcaseItems[activeIndex]

  const goToPrevious = () => {
    setActiveIndex((currentIndex) =>
      currentIndex === 0 ? courseShowcaseItems.length - 1 : currentIndex - 1,
    )
  }

  const goToNext = () => {
    setActiveIndex((currentIndex) =>
      currentIndex === courseShowcaseItems.length - 1 ? 0 : currentIndex + 1,
    )
  }

  return (
    <section
      id="courses"
      className="relative isolate overflow-hidden border-b border-[#C5A059]/14 bg-[#121212] text-[#F8F4EC]"
      style={{
        backgroundImage: `linear-gradient(180deg, rgba(10,10,11,0.9), rgba(16,16,17,0.95)), url(${graphiteBackground})`,
        backgroundPosition: 'center',
        backgroundSize: 'cover',
      }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(197,160,89,0.14),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.06),transparent_22%)]" />
      <div className="absolute right-[8%] bottom-24 h-px w-16 bg-white/12 lg:w-24" />

      <div className="relative mx-auto max-w-[calc(100%-2rem)] px-5 py-18 sm:max-w-[calc(100%-4rem)] sm:px-8 sm:py-22 lg:max-w-[calc(100%-8rem)] lg:px-12 lg:py-24">
        <div className="grid items-start gap-14 lg:grid-cols-[minmax(0,0.85fr)_minmax(24rem,1.15fr)] lg:gap-20">
          <div className="space-y-10">
            <div className="space-y-6">
              <div className="inline-flex flex-col gap-2 text-[0.72rem] font-medium tracking-[0.3em] text-[#9B7A41] uppercase">
                <div className="h-px w-20 bg-[#C5A059]/50 lg:w-28" />
                <div className="flex flex-row items-center gap-3">
                  <span className="h-px w-10 bg-[#C5A059]/55" />
                  Curriculum Architecture
                </div>
              </div>

              <h2 className="max-w-[12ch] font-serif text-[clamp(3rem,5vw,5.2rem)] leading-[0.92] tracking-[-0.055em] text-[#F8F4EC]">
                Six courses, revealed one by one
              </h2>

              <p className="max-w-xl text-base leading-8 font-light tracking-[0.04em] text-[#CFC6B7] sm:text-lg">
                A premium formation journey shaped like a house: each course
                adds one structural layer, from foundation to fully made house.
              </p>
            </div>

            <div className="flex items-center justify-between gap-6 border-y border-white/10 py-5">
              <div>
                <div className="text-[0.68rem] font-medium tracking-[0.3em] text-[#8E816D] uppercase">
                  Active course
                </div>
                <div className="mt-2 font-serif text-2xl text-[#F8F4EC]">
                  {activeCourse.number}. {activeCourse.title}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={goToPrevious}
                  className="inline-flex h-12 w-12 items-center justify-center border border-white/12 bg-white/6 text-[#F8F4EC] transition-all hover:-translate-y-0.5 hover:border-[#C5A059]/50 hover:bg-white/10"
                  aria-label="Show previous course"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={goToNext}
                  className="inline-flex h-12 w-12 items-center justify-center border border-[#C5A059]/35 bg-[#1C1C1D] text-[#E9D9B4] transition-all hover:-translate-y-0.5 hover:border-[#D6B16E] hover:text-white"
                  aria-label="Show next course"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {courseShowcaseItems.map((course, index) => {
                const isActive = index === activeIndex

                return (
                  <button
                    key={course.id}
                    type="button"
                    onClick={() => setActiveIndex(index)}
                    className={`group flex items-center justify-between gap-4 border px-4 py-4 text-left transition-all ${
                      isActive
                        ? 'border-[#C5A059]/42 bg-white/8 shadow-[0_24px_44px_-34px_rgba(0,0,0,0.6)]'
                        : 'border-white/10 bg-white/[0.03] hover:border-white/18 hover:bg-white/[0.05]'
                    }`}
                  >
                    <div>
                      <div className="text-[0.65rem] font-medium tracking-[0.28em] text-[#8E816D] uppercase">
                        {course.number}
                      </div>
                      <div className="mt-2 font-serif text-xl text-[#F8F4EC]">
                        {course.title}
                      </div>
                    </div>
                    <ArrowRight
                      className={`h-4 w-4 transition-transform ${
                        isActive
                          ? 'translate-x-0 text-[#E9D9B4]'
                          : 'text-[#8E816D] group-hover:translate-x-0.5'
                      }`}
                    />
                  </button>
                )
              })}
            </div>
          </div>

          <div className="relative border border-white/10 bg-[#171717]/72 p-4 shadow-[0_42px_100px_-52px_rgba(0,0,0,0.82)] backdrop-blur-sm sm:p-6">
            <div
              className="relative overflow-hidden border border-white/10"
              style={{
                backgroundImage: `linear-gradient(180deg, rgba(7,7,8,0.26), rgba(7,7,8,0.72)), url(${graphiteBackground})`,
                backgroundPosition: 'center',
                backgroundSize: 'cover',
              }}
            >
              <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.12),transparent_38%,rgba(197,160,89,0.14)_100%)]" />
              <div className="relative flex min-h-[21rem] flex-col justify-between p-6 sm:p-8 lg:min-h-[25rem]">
                <div className="flex items-start justify-between gap-6">
                  <div>
                    <div className="text-[0.68rem] font-medium tracking-[0.3em] text-[#D4B373] uppercase">
                      {activeCourse.eyebrow}
                    </div>
                    <div className="mt-3 font-serif text-[clamp(2.4rem,4vw,4rem)] leading-[0.94] tracking-[-0.045em] text-white">
                      {activeCourse.title}
                    </div>
                  </div>
                  <div className="border border-white/12 bg-black/18 px-4 py-3 text-[0.9rem] font-medium tracking-[0.26em] text-[#E9D9B4] uppercase">
                    {activeCourse.number}
                  </div>
                </div>

                <div className="max-w-[15rem] border border-white/12 bg-black/24 px-4 py-4 shadow-[0_24px_40px_-30px_rgba(0,0,0,0.55)] backdrop-blur-sm">
                  <div className="text-[0.62rem] font-medium tracking-[0.28em] text-[#AFA28F] uppercase">
                    Thumbnail
                  </div>
                  <div className="mt-2 font-serif text-xl leading-tight text-[#F8F4EC]">
                    House of Formation
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-8 border-x border-b border-white/10 bg-[#151515]/88 px-6 py-7 sm:px-8 sm:py-8 lg:grid-cols-[minmax(0,1fr)_16rem]">
              <div>
                <div className="text-[0.68rem] font-medium tracking-[0.3em] text-[#8E816D] uppercase">
                  Course description
                </div>
                <p className="mt-4 max-w-2xl text-base leading-8 text-[#D6CCBE] sm:text-lg">
                  {activeCourse.description}
                </p>
              </div>

              <div>
                <div className="text-[0.68rem] font-medium tracking-[0.3em] text-[#8E816D] uppercase">
                  Three lesson anchors
                </div>
                <div className="mt-4 space-y-3">
                  {activeCourse.lessons.map((lesson, index) => (
                    <div
                      key={lesson}
                      className="flex items-start gap-3 border-b border-white/8 pb-3 last:border-b-0 last:pb-0"
                    >
                      <span className="pt-0.5 text-[0.72rem] font-medium tracking-[0.24em] text-[#C5A059] uppercase">
                        0{index + 1}
                      </span>
                      <span className="text-sm leading-6 text-[#F2ECE2] sm:text-[0.98rem]">
                        {lesson}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-5 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm leading-7 text-[#AFA28F]">
                Move through the six-course journey with the next and previous
                controls or select any course directly.
              </div>
              <Link
                to="/signup"
                search={{ token: '' }}
                className="inline-flex h-12 items-center justify-center gap-3 border border-[#C5A059]/40 bg-linear-to-b from-[#2A2A2A] to-[#111111] px-6 text-[0.74rem] font-medium tracking-[0.24em] text-[#E9D9B4] uppercase shadow-[0_26px_50px_-30px_rgba(0,0,0,0.7)] transition-all hover:-translate-y-0.5 hover:border-[#D6B16E] hover:text-white"
              >
                Explore enrollment
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
