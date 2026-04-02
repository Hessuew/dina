import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react'
import facultyBackground from '@/assets/images/bg4_v1.png'

type Lecturer = {
  name: string
  title: string
  bio: string
}

type LecturerPair = {
  id: string
  number: string
  theme: string
  summary: string
  lecturers: [Lecturer, Lecturer]
}

const lecturerPairs: Array<LecturerPair> = [
  {
    id: 'apostolic-foundations',
    number: '01',
    theme: 'Apostolic Foundations',
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
    theme: 'Prayer and Presence',
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
    theme: 'Character and Holiness',
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
    theme: 'Leadership and Order',
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
    theme: 'Mission and Culture',
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
    theme: 'Endurance and Commission',
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
      className="relative isolate overflow-hidden border-b border-[#C5A059]/14 text-[#F7F4EE]"
      style={{
        backgroundImage: `linear-gradient(180deg, rgba(14,13,17,0.922), rgba(10,10,12,0.97)), url(${facultyBackground})`,
        backgroundPosition: 'center',
        backgroundSize: 'cover',
      }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(197,160,89,0.14),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.06),transparent_22%)]" />
      <div className="absolute top-24 left-[8%] h-px w-20 bg-[#C5A059]/45 lg:w-28" />
      <div className="absolute right-[8%] bottom-24 h-px w-16 bg-white/12 lg:w-24" />

      <div className="relative mx-auto max-w-[calc(100%-2rem)] px-5 py-18 sm:max-w-[calc(100%-4rem)] sm:px-8 sm:py-22 lg:max-w-[calc(100%-8rem)] lg:px-12 lg:py-24">
        <div className="grid items-start gap-14 lg:grid-cols-[minmax(0,0.82fr)_minmax(24rem,1.18fr)] lg:gap-20">
          <div className="space-y-10">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-3 text-[0.72rem] font-medium tracking-[0.32em] text-[#D4B373] uppercase">
                <span className="h-px w-10 bg-[#C5A059]/55" />
                Teaching Faculty
              </div>

              <h2 className="max-w-[11ch] font-serif text-[clamp(3rem,5vw,5.1rem)] leading-[0.92] tracking-[-0.055em] text-[#F8F4EC]">
                Six lecturer pairs, moving in harmony.
              </h2>

              <p className="max-w-xl text-base leading-8 font-light tracking-[0.04em] text-[#D3CAC0] sm:text-lg">
                Each part of the curriculum is carried by a teaching pair,
                bringing complementary strengths, clear doctrine, and pastoral
                depth to the formation journey.
              </p>
            </div>

            <div className="flex items-center justify-between gap-6 border-y border-white/10 py-5">
              <div>
                <div className="text-[0.68rem] font-medium tracking-[0.3em] text-[#9B8A73] uppercase">
                  Active pair
                </div>
                <div className="mt-2 font-serif text-2xl text-[#F8F4EC]">
                  {activePair.number}. {activePair.theme}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={goToPrevious}
                  className="inline-flex h-12 w-12 items-center justify-center border border-white/12 bg-white/6 text-[#F8F4EC] transition-all hover:-translate-y-0.5 hover:border-[#C5A059]/50 hover:bg-white/10"
                  aria-label="Show previous lecturer pair"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={goToNext}
                  className="inline-flex h-12 w-12 items-center justify-center border border-[#C5A059]/35 bg-[#1A1716] text-[#E9D9B4] transition-all hover:-translate-y-0.5 hover:border-[#D6B16E] hover:text-white"
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
                        ? 'border-[#C5A059]/42 bg-white/8 shadow-[0_24px_44px_-34px_rgba(0,0,0,0.6)]'
                        : 'border-white/10 bg-white/[0.03] hover:border-white/18 hover:bg-white/[0.05]'
                    }`}
                  >
                    <div>
                      <div className="text-[0.65rem] font-medium tracking-[0.28em] text-[#9B8A73] uppercase">
                        {pair.number}
                      </div>
                      <div className="mt-2 font-serif text-xl text-[#F8F4EC]">
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

          <div className="relative border border-white/10 bg-[#151311]/70 p-4 shadow-[0_42px_100px_-52px_rgba(0,0,0,0.84)] backdrop-blur-sm sm:p-6">
            <div
              className="border border-white/10 px-6 py-7 sm:px-8 sm:py-8"
              style={{
                backgroundImage: `linear-gradient(180deg, rgba(22,20,20,0.44), rgba(7,7,8,0.7)), url(${facultyBackground})`,
                backgroundPosition: 'center',
                backgroundSize: 'cover',
              }}
            >
              <div className="flex items-start justify-between gap-6">
                <div>
                  <div className="text-[0.68rem] font-medium tracking-[0.3em] text-[#D4B373] uppercase">
                    Pair theme
                  </div>
                  <div className="mt-3 max-w-[12ch] font-serif text-[clamp(2.4rem,4vw,4rem)] leading-[0.94] tracking-[-0.045em] text-white">
                    {activePair.theme}
                  </div>
                </div>
                <div className="border border-white/12 bg-black/18 px-4 py-3 text-[0.9rem] font-medium tracking-[0.26em] text-[#E9D9B4] uppercase">
                  {activePair.number}
                </div>
              </div>

              <p className="mt-6 max-w-2xl text-base leading-8 text-[#D8D0C7] sm:text-lg">
                {activePair.summary}
              </p>
            </div>

            <div className="grid gap-5 border-x border-b border-white/10 bg-[#141211]/88 px-6 py-7 sm:px-8 sm:py-8 lg:grid-cols-2">
              {activePair.lecturers.map((lecturer, index) => (
                <div
                  key={`${activePair.id}-${lecturer.name}`}
                  className="border border-white/10 bg-white/[0.04] p-4 shadow-[0_22px_36px_-30px_rgba(0,0,0,0.45)]"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-22 w-20 shrink-0 items-center justify-center border border-[#C5A059]/22 bg-linear-to-b from-white/10 to-white/4 text-center">
                      <div>
                        <div className="text-[0.6rem] font-medium tracking-[0.26em] text-[#AFA28F] uppercase">
                          Image
                        </div>
                        <div className="mt-2 text-[0.58rem] tracking-[0.18em] text-[#CFC6B7] uppercase">
                          Coming later
                        </div>
                      </div>
                    </div>

                    <div className="min-w-0">
                      <div className="text-[0.62rem] font-medium tracking-[0.28em] text-[#D4B373] uppercase">
                        Lecturer {index + 1}
                      </div>
                      <div className="mt-2 font-serif text-[1.45rem] leading-tight text-[#F8F4EC]">
                        {lecturer.name}
                      </div>
                      <div className="mt-2 text-sm leading-6 text-[#D2C8BC]">
                        {lecturer.title}
                      </div>
                    </div>
                  </div>

                  <p className="mt-5 text-sm leading-7 text-[#C9C0B6] sm:text-[0.96rem]">
                    {lecturer.bio}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-6 flex flex-col gap-5 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm leading-7 text-[#AFA28F]">
                Navigate through six teaching pairs now, then replace the image
                placeholders with lecturer portraits later.
              </div>
              <Link
                to="/signup"
                search={{ token: '' }}
                className="inline-flex h-12 items-center justify-center gap-3 border border-[#C5A059]/40 bg-linear-to-b from-[#2A2A2A] to-[#111111] px-6 text-[0.74rem] font-medium tracking-[0.24em] text-[#E9D9B4] uppercase shadow-[0_26px_50px_-30px_rgba(0,0,0,0.7)] transition-all hover:-translate-y-0.5 hover:border-[#D6B16E] hover:text-white"
              >
                Meet the faculty
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
