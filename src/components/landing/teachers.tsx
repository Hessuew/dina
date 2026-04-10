import { useState } from 'react'
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react'
import facultyBackground from '@/assets/images/bg7.png'

type Lecturer = {
  name: string
  title: string
  bio: string
}

type LecturerPair = {
  id: string
  number: string
  course: string
  theme: string
  summary: string
  lecturers: [Lecturer, Lecturer]
}

const lecturerPairs: Array<LecturerPair> = [
  {
    id: 'apostolic-foundations',
    number: '01',
    course: 'The Mercy of God, Salvation & the Life of Jesus',
    theme: 'Ground',
    summary:
      'A paired teaching rhythm that grounds students in Scripture, identity, and the theological weight of discipleship.',
    lecturers: [
      {
        name: 'Lecturer One',
        title: 'Senior Lecturer in Biblical Foundations',
        bio: 'Guides students into biblical clarity, disciplined reading, and a Christ-centered understanding of truth.',
      },
      {
        name: 'Lecturer Two',
        title: 'Lecturer in Spiritual Formation',
        bio: 'Focuses on inner life, repentance, and practices that shape hidden faithfulness over time.',
      },
    ],
  },
  {
    id: 'prayer-and-presence',
    number: '02',
    course: 'The Foundation of the Believer',
    theme: 'Foundation',
    summary:
      'A teaching pair devoted to prayer, intimacy with God, and the cultivation of a deep inner life that sustains leadership.',
    lecturers: [
      {
        name: 'Lecturer Three',
        title: 'Lecturer in Prayer and Devotion',
        bio: 'Teaches students how to build rhythms of prayer that produce depth, attentiveness, and endurance.',
      },
      {
        name: 'Lecturer Four',
        title: 'Lecturer in Presence and Worship',
        bio: 'Leads formation around reverence, worship, and the practice of remaining near to the presence of God.',
      },
    ],
  },
  {
    id: 'character-and-holiness',
    number: '03',
    course: 'The Death of Jesus',
    theme: 'Walls',
    summary:
      'A formation-centered pair shaping conviction, holiness, discernment, and the moral architecture of trustworthy leaders.',
    lecturers: [
      {
        name: 'Lecturer Five',
        title: 'Lecturer in Character Formation',
        bio: 'Strengthens integrity, maturity, and resilience so leadership is carried with credibility and weight.',
      },
      {
        name: 'Lecturer Six',
        title: 'Lecturer in Holiness and Discernment',
        bio: 'Equips students to guard desire, reject mixture, and live with holy clarity in complex times.',
      },
    ],
  },
  {
    id: 'leadership-and-order',
    number: '04',
    course: 'The Trinity — God, Jesus & the Holy Spirit',
    theme: 'Framing',
    summary:
      'A structured teaching duo shaping students in biblical order, leadership design, and the stewardship of responsibility.',
    lecturers: [
      {
        name: 'Lecturer Seven',
        title: 'Lecturer in Kingdom Leadership',
        bio: 'Forms leaders who can carry responsibility with wisdom, courage, and servant-hearted authority.',
      },
      {
        name: 'Lecturer Eight',
        title: 'Lecturer in Biblical Order',
        bio: 'Clarifies patterns of alignment, governance, and structure that help callings mature into lasting work.',
      },
    ],
  },
  {
    id: 'mission-and-culture',
    number: '05',
    course: "Peter's Encounter, Following & Transformation",
    theme: 'Interior',
    summary:
      'A missional pair preparing students to disciple communities, read culture wisely, and influence nations with conviction.',
    lecturers: [
      {
        name: 'Lecturer Nine',
        title: 'Lecturer in Mission and Public Witness',
        bio: 'Develops a theology of witness that helps students carry Christ faithfully into public life and society.',
      },
      {
        name: 'Lecturer Ten',
        title: 'Lecturer in Culture and Discipleship',
        bio: 'Explores how biblical formation can shape families, churches, and wider communities with wisdom.',
      },
    ],
  },
  {
    id: 'endurance-and-commission',
    number: '06',
    course: 'Living the Christian Life in the Modern World',
    theme: 'Roof',
    summary:
      'A final pair focused on perseverance, spiritual covering, and the courage required to be sent with mature authority.',
    lecturers: [
      {
        name: 'Lecturer Eleven',
        title: 'Lecturer in Endurance and Covering',
        bio: 'Teaches perseverance under pressure and the strength that grows through faithful submission and trust.',
      },
      {
        name: 'Lecturer Twelve',
        title: 'Lecturer in Commission and Influence',
        bio: 'Helps students discern calling, embrace assignment, and move toward the nations with clarity and boldness.',
      },
    ],
  },
]

export function LandingTeacherSection() {
  const [activeIndex, setActiveIndex] = useState(0)
  const activePair = lecturerPairs[activeIndex]

  const goToPrevious = () => {
    setActiveIndex((currentIndex) =>
      currentIndex === 0 ? lecturerPairs.length - 1 : currentIndex - 1,
    )
  }

  const goToNext = () => {
    setActiveIndex((currentIndex) =>
      currentIndex === lecturerPairs.length - 1 ? 0 : currentIndex + 1,
    )
  }

  return (
    <section
      id="teachers"
      className="relative isolate overflow-hidden border-b border-[#1A1A1A]/10 text-[#1C1815]"
      style={{
        backgroundImage: `url(${facultyBackground})`,
        backgroundPosition: 'center',
        backgroundSize: 'cover',
      }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(197,160,89,0.12),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.28),transparent_22%)]" />
      <div className="absolute right-[8%] bottom-24 h-px w-16 bg-[#1A1A1A]/12 lg:w-24" />

      <div className="relative mx-auto max-w-[calc(100%-2rem)] px-5 py-18 sm:max-w-[calc(100%-4rem)] sm:px-8 sm:py-22 lg:max-w-[calc(100%-8rem)] lg:px-12 lg:py-24">
        <div className="grid items-start gap-14 lg:grid-cols-[minmax(0,0.82fr)_minmax(24rem,1.18fr)] lg:gap-20">
          <div className="space-y-10">
            <div className="space-y-6">
              <div className="inline-flex flex-col gap-2 text-[0.72rem] font-medium tracking-[0.3em] text-[#6e562d] uppercase">
                <div className="h-px w-20 bg-[#6e562d]/50 lg:w-28" />
                <div className="flex flex-row items-center gap-3">
                  <span className="h-px w-10 bg-[#6e562d]/55" />
                  Teaching Faculty
                </div>
              </div>

              <h2 className="max-w-[11ch] font-serif text-[clamp(3rem,5vw,5.1rem)] leading-[0.92] tracking-[-0.055em] text-[#1C1815]">
                Six lecturer pairs, moving in harmony.
              </h2>

              <p className="max-w-xl text-base leading-8 font-light tracking-[0.04em] text-[#4E463D] sm:text-lg">
                Each part of the curriculum is carried by a teaching pair,
                bringing complementary strengths, clear doctrine, and pastoral
                depth to the formation journey.
              </p>
            </div>

            <div className="flex items-center justify-between gap-6 border-y border-[#1A1A1A]/10 py-5">
              <div>
                <div className="text-[0.68rem] font-medium tracking-[0.3em] text-[#6e562d] uppercase">
                  Active pair
                </div>
                <div className="mt-2 font-serif text-2xl text-[#1C1815]">
                  {activePair.number}. {activePair.theme}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={goToPrevious}
                  className="inline-flex h-12 w-12 items-center justify-center border border-[#1A1A1A]/10 bg-[#FCFBF8]/74 text-[#1C1815] shadow-[0_22px_34px_-30px_rgba(0,0,0,0.24)] backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:border-[#C5A059]/50 hover:bg-white/80"
                  aria-label="Show previous lecturer pair"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={goToNext}
                  className="inline-flex h-12 w-12 items-center justify-center border border-[#C5A059]/35 bg-[#1A1716] text-[#E9D9B4] shadow-[0_26px_40px_-28px_rgba(0,0,0,0.4)] transition-all hover:-translate-y-0.5 hover:border-[#D6B16E] hover:text-white"
                  aria-label="Show next lecturer pair"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {lecturerPairs.map((pair, index) => {
                const isActive = index === activeIndex

                return (
                  <button
                    key={pair.id}
                    type="button"
                    onClick={() => setActiveIndex(index)}
                    className={`group flex items-center justify-between gap-4 border px-4 py-4 text-left transition-all ${
                      isActive
                        ? 'border-[#C5A059]/42 bg-white/80 shadow-[0_24px_44px_-34px_rgba(0,0,0,0.24)]'
                        : 'border-[#1A1A1A]/10 bg-white/50 hover:border-[#1A1A1A]/18 hover:bg-white/60'
                    }`}
                  >
                    <div>
                      <div className="text-[0.65rem] font-medium tracking-[0.28em] text-[#8A7B68] uppercase">
                        {pair.number}
                      </div>
                      <div className="mt-2 font-serif text-xl text-[#1C1815]">
                        {pair.theme}
                      </div>
                    </div>
                    <ArrowRight
                      className={`h-4 w-4 transition-transform ${
                        isActive
                          ? 'translate-x-0 text-[#E9D9B4]'
                          : 'text-[#9B8A73] group-hover:translate-x-0.5'
                      }`}
                    />
                  </button>
                )
              })}
            </div>
          </div>

          <div className="relative border border-[#1A1A1A]/10 bg-white/54 p-4 shadow-[0_42px_100px_-52px_rgba(0,0,0,0.24)] backdrop-blur-sm sm:p-6">
            <div
              className="border border-[#1A1A1A]/10 px-6 py-7 sm:px-8 sm:py-8"
              style={{
                backgroundImage: `linear-gradient(180deg, rgba(255,255,255,0.72), rgba(250,247,241,0.82)), url(${facultyBackground})`,
                backgroundPosition: 'center',
                backgroundSize: 'cover',
              }}
            >
              <div className="flex items-start justify-between gap-6 lg:min-h-48">
                <div>
                  <div className="text-[0.68rem] font-medium tracking-[0.3em] text-[#9B7A41] uppercase">
                    Pair theme
                  </div>
                  <div className="mt-3 max-w-[14ch] font-serif text-[clamp(2.4rem,4vw,4rem)] leading-[0.94] tracking-[-0.045em] text-[#1C1815]">
                    {activePair.course}
                  </div>
                </div>
                <div className="border border-[#1A1A1A]/12 bg-white/38 px-4 py-3 text-[0.9rem] font-medium tracking-[0.26em] text-[#9B7A41] uppercase">
                  {activePair.number}
                </div>
              </div>

              <p className="mt-6 max-w-2xl text-base leading-8 text-[#4E463D] sm:text-lg">
                {activePair.summary}
              </p>
            </div>

            <div className="grid gap-5 border-x border-b border-[#1A1A1A]/10 bg-white/68 px-6 py-7 sm:px-8 sm:py-8 lg:min-h-100 lg:grid-cols-2">
              {activePair.lecturers.map((lecturer, index) => (
                <div
                  key={`${activePair.id}-${lecturer.name}`}
                  className="border border-[#1A1A1A]/10 bg-white/54 p-4 shadow-[0_22px_36px_-30px_rgba(0,0,0,0.18)]"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-22 w-20 shrink-0 items-center justify-center border border-[#C5A059]/22 bg-linear-to-b from-white/68 to-white/42 text-center">
                      <div>
                        <div className="text-[0.6rem] font-medium tracking-[0.26em] text-[#8A7B68] uppercase">
                          Image
                        </div>
                        <div className="mt-2 text-[0.58rem] tracking-[0.18em] text-[#6B5F52] uppercase">
                          Coming later
                        </div>
                      </div>
                    </div>

                    <div className="min-w-0">
                      <div className="text-[0.62rem] font-medium tracking-[0.28em] text-[#9B7A41] uppercase">
                        Lecturer {index + 1}
                      </div>
                      <div className="mt-2 font-serif text-[1.45rem] leading-tight text-[#1C1815]">
                        {lecturer.name}
                      </div>
                      <div className="mt-2 text-sm leading-6 text-[#544C42]">
                        {lecturer.title}
                      </div>
                    </div>
                  </div>

                  <p className="mt-5 text-sm leading-7 text-[#5E5549] sm:text-[0.96rem]">
                    {lecturer.bio}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-6 flex flex-col gap-5 border-t border-[#1A1A1A]/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm leading-7 text-[#6B5F52]">
                Navigate through six teaching pairs now, then replace the image
                placeholders with lecturer portraits later.
              </div>
              <div className="w-48" />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
