import graphiteBackground from '@/assets/images/bg/bg_courses.webp'
import andrewImage from '@/assets/images/lecturers/andrew.webp'
import akosyaImage from '@/assets/images/lecturers/akosya.webp'
import emmanuelImage from '@/assets/images/lecturers/emmanuel.webp'
import ezinneImage from '@/assets/images/lecturers/ezinne.webp'
import juhaniImage from '@/assets/images/lecturers/juhani.webp'
import keneImage from '@/assets/images/lecturers/kene.webp'
import mahiImage from '@/assets/images/lecturers/mahi.webp'
import sadeImage from '@/assets/images/lecturers/sade.webp'
import {
  LandingImageSection,
  LandingScriptureSectionHeader,
  LandingSectionContainer,
  LandingSectionOverlay,
} from '@/components/landing/primitives'

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
  {
    name: 'Ezinne O.',
    role: 'Vice-President',
    category: 'executive',
    image: ezinneImage,
  },
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
    image: keneImage,
  },
  {
    name: 'Emmanuel E.',
    role: 'Director of Intercession',
    category: 'directors',
    image: emmanuelImage,
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
              loading="lazy"
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
    <LandingImageSection
      backgroundImageUrl={graphiteBackground}
      gradientFrom="rgba(10,10,11,0.92)"
      gradientTo="rgba(16,16,17,0.96)"
      className="border-b border-[#C5A059]/14 bg-[#121212] text-[#F8F4EC]"
    >
      <LandingSectionOverlay
        gradientFrom="rgba(197,160,89,0.1)"
        gradientStop="36%"
        secondaryGradientFrom="rgba(255,255,255,0.04)"
        secondaryGradientStop="28%"
      />

      <LandingSectionContainer className="py-18 sm:py-22 lg:py-24">
        <div className="space-y-16">
          <LandingScriptureSectionHeader
            eyebrowLabel="Governance"
            headline="Executive Leadership"
            headlineMaxW="max-w-[14ch]"
            headlineColor="#F8F4EC"
            textColor="#CFC6B7"
            scriptures={[
              {
                quote:
                  'For it seemed good to the Holy Ghost, and to us, to lay upon you no greater burden than these necessary things',
                reference: 'Acts 15:28',
              },
            ]}
          />

          <div className="space-y-14">
            <div>
              <div className="mb-7 flex items-center gap-5">
                <div className="text-[0.68rem] font-medium tracking-[0.3em] text-[#8E816D] uppercase">
                  Presidents & Officers
                </div>
                <div className="h-px flex-1 bg-white/8" />
              </div>
              <div className="grid grid-cols-2 gap-5 md:grid-cols-3 xl:grid-cols-5">
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
              <div className="grid grid-cols-2 gap-5 md:grid-cols-3 xl:grid-cols-5">
                {directors.map((member) => (
                  <MemberCard key={member.name} member={member} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </LandingSectionContainer>
    </LandingImageSection>
  )
}
