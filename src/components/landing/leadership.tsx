import graphiteBackground from '@/assets/images/bg/bg_courses.webp'
import andrewImage from '@/assets/images/lecturers/andrew.jpg'
import akosyaImage from '@/assets/images/lecturers/akosya.jpg'
import juhaniImage from '@/assets/images/lecturers/juhani.webp'
import mahiImage from '@/assets/images/lecturers/mahi.jpg'
import sadeImage from '@/assets/images/lecturers/sade.jpeg'

type LeadershipMember = {
  name: string
  role: string
  category: 'executive' | 'directors'
  image?: string
}

const executives: Array<LeadershipMember> = [
  {
    name: 'Dr. Mahidere A.',
    role: 'President',
    category: 'executive',
    image: mahiImage,
  },
  { name: 'Dr. Ugo O.', role: 'President', category: 'executive' },
  { name: 'Ezinne O.', role: 'Vice-President', category: 'executive' },
  {
    name: 'Akosua O.',
    role: 'Secretary',
    category: 'executive',
    image: akosyaImage,
  },
  {
    name: 'Prof. Andrew A.',
    role: 'Chaplain',
    category: 'executive',
    image: andrewImage,
  },
]

const directors: Array<LeadershipMember> = [
  {
    name: 'Kene O.',
    role: 'Director of Legal Affairs',
    category: 'directors',
  },
  {
    name: 'Emmanuel E.',
    role: 'Director of Intercession',
    category: 'directors',
  },
  {
    name: 'Obi C.',
    role: 'Director of Operation',
    category: 'directors',
  },
  {
    name: 'Dr. Sade P.',
    role: 'Director of Health Affairs',
    category: 'directors',
    image: sadeImage,
  },
  {
    name: 'Juhani J.',
    role: 'Director of IT',
    category: 'directors',
    image: juhaniImage,
  },
]

function MemberCard({ member }: { member: LeadershipMember }) {
  return (
    <div className="group flex flex-col border border-white/10 bg-[#151515]/80 transition-colors hover:border-[#C5A059]/30">
      <div
        className="relative overflow-hidden border-b border-white/10"
        style={{
          backgroundImage: `linear-gradient(160deg, rgba(30,28,24,0.9), rgba(12,10,9,0.95)), url(${graphiteBackground})`,
          backgroundPosition: 'center',
          backgroundSize: 'cover',
        }}
      >
        <div className="flex aspect-4/3 items-center justify-center">
          {member.image ? (
            <img
              src={member.image}
              alt={member.name}
              className="h-16 w-16 object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center border border-white/12 bg-white/4 font-serif text-[1.4rem] tracking-[-0.02em] text-[#C5A059]">
              {member.name.charAt(0)}
            </div>
          )}
        </div>
        <div className="absolute bottom-0 left-0 h-px w-full bg-[linear-gradient(90deg,transparent,rgba(197,160,89,0.35),transparent)]" />
      </div>

      <div className="flex flex-1 flex-col gap-1 p-5">
        <div className="text-[0.62rem] font-medium tracking-[0.26em] text-[#9B7A41] uppercase">
          {member.role}
        </div>
        <div className="font-serif text-[1.05rem] leading-snug tracking-[-0.02em] text-[#F2ECE2]">
          {member.name}
        </div>
      </div>
    </div>
  )
}

export function LandingLeadershipSection() {
  return (
    <section
      className="relative isolate overflow-hidden border-b border-[#C5A059]/14 bg-[#121212] text-[#F8F4EC]"
      style={{
        backgroundImage: `linear-gradient(180deg, rgba(10,10,11,0.92), rgba(16,16,17,0.96)), url(${graphiteBackground})`,
        backgroundPosition: 'center',
        backgroundSize: 'cover',
      }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(197,160,89,0.1),transparent_36%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.04),transparent_28%)]" />

      <div className="relative mx-auto max-w-[calc(100%-2rem)] px-5 py-18 sm:max-w-[calc(100%-4rem)] sm:px-8 sm:py-22 lg:max-w-[calc(100%-8rem)] lg:px-12 lg:py-24">
        <div className="space-y-16">
          <div className="space-y-6">
            <div className="inline-flex flex-col gap-2 text-[0.72rem] font-medium tracking-[0.3em] text-[#9B7A41] uppercase">
              <div className="h-px w-20 bg-[#C5A059]/50 lg:w-28" />
              <div className="flex flex-row items-center gap-3">
                <span className="h-px w-10 bg-[#C5A059]/55" />
                Governance
              </div>
            </div>

            <h2 className="max-w-[14ch] font-serif text-[clamp(3rem,5vw,5.1rem)] leading-[0.92] tracking-[-0.055em] text-[#F8F4EC]">
              Executive Leadership
            </h2>

            <p className="max-w-xl text-base leading-8 font-light tracking-[0.04em] text-[#CFC6B7] sm:text-lg">
              "For it seemed good to the Holy Ghost, and to us, to lay upon you
              no greater burden than these necessary things"
              <span className="text-[0.72rem] font-medium tracking-[0.2em] text-[#9B7A41] uppercase">
                &nbsp;Acts 15:28
              </span>
            </p>
          </div>

          <div className="space-y-14">
            <div>
              <div className="mb-7 flex items-center gap-5">
                <div className="text-[0.68rem] font-medium tracking-[0.3em] text-[#8E816D] uppercase">
                  Presidents & Officers
                </div>
                <div className="h-px flex-1 bg-white/8" />
              </div>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                {executives.map((member) => (
                  <MemberCard key={member.name} member={member} />
                ))}
              </div>
            </div>

            <div>
              <div className="mb-7 flex items-center gap-5">
                <div className="text-[0.68rem] font-medium tracking-[0.3em] text-[#8E816D] uppercase">
                  Directors
                </div>
                <div className="h-px flex-1 bg-white/8" />
              </div>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                {directors.map((member) => (
                  <MemberCard key={member.name} member={member} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
