import type { TeacherWithCourse } from '@/types/teacher'
import facultyBackground from '@/assets/images/bg/bg_lecturers.webp'
import gemsImage from '@/assets/images/bg/gems.webp'
import andrewImage from '@/assets/images/lecturers/andrew.webp'
import akosyaImage from '@/assets/images/lecturers/akosya.webp'
import blessingImage from '@/assets/images/lecturers/blessing.webp'
import ellaImage from '@/assets/images/lecturers/ella.webp'
import emmanuelImage from '@/assets/images/lecturers/emmanuel.webp'
import ezinneImage from '@/assets/images/lecturers/ezinne.webp'
import juhaniImage from '@/assets/images/lecturers/juhani.webp'
import keneImage from '@/assets/images/lecturers/kene.webp'
import mahiImage from '@/assets/images/lecturers/mahi.webp'
import sadeImage from '@/assets/images/lecturers/sade.webp'
import obiImage from '@/assets/images/lecturers/obi.webp'
import ugoImage from '@/assets/images/lecturers/ugo.webp'
import { GEM_IMAGE_MAP } from '@/utils/gems'
import {
  LandingActiveItemNav,
  LandingFeaturePanel,
  LandingFeaturePanelBody,
  LandingFeaturePanelHeader,
  LandingImageSection,
  LandingScriptureSectionHeader,
  LandingSectionContainer,
  LandingSectionOverlay,
} from '@/components/landing/primitives'
import { useCarousel } from '@/components/landing/hooks'

const LECTURER_BIO_MAP: Record<string, string> = {
  'Andrew A.':
    'Professor Andrew is an award-winning physician and world-class scholar in preventing childhood obesity. He leads urFIT-child research group in Finland and a born-again Christian who demonstrates the power of the Holy Ghost daily.',
  'Ella O.':
    'Emmanuella is an experienced Sustainability and Climate Change Consultant advising public and private organisations locally and globally. She helps organisations design and implement ESG and sustainability transformation strategies.',
  'Juhani J.':
    'Juhani is an experienced software developer. His passion is to know the Holy Spirit and to see Finland turn to God, city by city. The fire of God is evident in his life, and through him the world will see Jesus.',
  'Akosua O.':
    'Akosua is studying computer science and is passionate about faith, discipleship, and sharing the Gospel. Through church ministry, evangelism, and teaching, she continues growing in prayer, biblical understanding, and service.',
  'Emmanuel E.':
    'Emmanuel is a Gospel minister, author, web developer, and brand specialist from Nigeria, dedicated to proclaiming the Gospel of Jesus through outreaches, Christian books, and global digital ministry platforms.',
  'Ezinne O.':
    'Ezinne is a disciple of the Lord, devoted daily to learning at His feet and loving Him wholeheartedly. She is also a Product Leader focused on AI enablement, managing the development and launch of AI voice and multimodal products across Europe.',
  'Sade P.':
    'Sade is a Psychiatrist passionate about teaching and mentoring the next generation of doctors. She works across inpatient and community settings, delivering compassionate, evidence-based, and holistic patient-centred care.',
  'Blessing A.':
    'Blessing is a Psychiatrist and solution-focused practitioner with a special interest in lifestyle medicine, addiction support, and youth counselling, with a passion for helping people achieve lasting wellbeing.',
  'Kene O.':
    'Kene is a Capital Markets and Derivatives solicitor dual qualified in England, Wales, and Nigeria. She contributes to international financial industry working groups, promoting collaboration, market standards, and innovation.',
  'Mahidere A.':
    'Mahidere (Mahi) is an epidemiology researcher with a medical background based in Finland. She believes God brought her to Finland to renew her life, strengthen her faith, and restore her calling.',
  Chinomnso:
    'Obi is a private markets professional with experience in investor relations, family office advisory, fiduciary mandates, and private asset valuations across Jersey, Luxembourg, London, and China. He believes a fulfilled life is guided by God, wisdom, and eternal purpose.',
  'Ugo O.':
    'EU Qualified Medical Doctor with over 10 years of experience spanning clinical medicine and the pharmaceutical industry. Committed to work that affects the quality of life of patients, consumers, and society.',
}

const PAIR_META = [
  {
    id: 'ground',
    number: '01',
    theme: 'Ground',
    course: 'The Mercy of God, Salvation & the Life of Jesus',
  },
  {
    id: 'foundation',
    number: '02',
    theme: 'Foundation',
    course: 'The Foundation of the Believer',
  },
  {
    id: 'walls',
    number: '03',
    theme: 'Walls',
    course: 'The Death of Jesus',
  },
  {
    id: 'framing',
    number: '04',
    theme: 'Framing',
    course: 'The Trinity — God, Jesus & the Holy Spirit',
  },
  {
    id: 'interior',
    number: '05',
    theme: 'Interior',
    course: 'Following Jesus: From encounter to transformation',
  },
  {
    id: 'roof',
    number: '06',
    theme: 'Roof',
    course: 'Living the Christian Life in the Modern World',
  },
]

// ============================================================================
// GEM CAROUSEL SECTION
// ============================================================================

// Ordered by pair: Ground (0,1), Foundation (2,3), Walls (4,5),
// Framing (6,7), Interior (8,9), Roof (10,11)
const gemLecturers: Array<TeacherWithCourse> = [
  {
    id: 'gl-andrew',
    fullName: 'Andrew A.',
    email: '',
    bio: LECTURER_BIO_MAP['Andrew A.'] ?? null,
    lecturerTitle: 'Ground',
    gemstone: 'amethyst',
    avatarUrl: andrewImage,
    createdAt: new Date(0),
    course: null,
  },
  {
    id: 'gl-ella',
    fullName: 'Ella O.',
    email: '',
    bio: LECTURER_BIO_MAP['Ella O.'] ?? null,
    lecturerTitle: 'Ground',
    gemstone: 'sapphire',
    avatarUrl: ellaImage,
    createdAt: new Date(0),
    course: null,
  },
  {
    id: 'gl-juhani',
    fullName: 'Juhani J.',
    email: '',
    bio: LECTURER_BIO_MAP['Juhani J.'] ?? null,
    lecturerTitle: 'Foundation',
    gemstone: 'jasper',
    avatarUrl: juhaniImage,
    createdAt: new Date(0),
    course: null,
  },
  {
    id: 'gl-akosua',
    fullName: 'Akosua O.',
    email: '',
    bio: LECTURER_BIO_MAP['Akosua O.'] ?? null,
    lecturerTitle: 'Foundation',
    gemstone: 'sardonyx',
    avatarUrl: akosyaImage,
    createdAt: new Date(0),
    course: null,
  },
  {
    id: 'gl-emmanuel',
    fullName: 'Emmanuel E.',
    email: '',
    bio: LECTURER_BIO_MAP['Emmanuel E.'] ?? null,
    lecturerTitle: 'Walls',
    gemstone: 'chrysoprasus',
    avatarUrl: emmanuelImage,
    createdAt: new Date(0),
    course: null,
  },
  {
    id: 'gl-ezinne',
    fullName: 'Ezinne O.',
    email: '',
    bio: LECTURER_BIO_MAP['Ezinne O.'] ?? null,
    lecturerTitle: 'Walls',
    gemstone: 'emerald',
    avatarUrl: ezinneImage,
    createdAt: new Date(0),
    course: null,
  },
  {
    id: 'gl-sade',
    fullName: 'Sade P.',
    email: '',
    bio: LECTURER_BIO_MAP['Sade P.'] ?? null,
    lecturerTitle: 'Framing',
    gemstone: 'sardius',
    avatarUrl: sadeImage,
    createdAt: new Date(0),
    course: null,
  },
  {
    id: 'gl-blessing',
    fullName: 'Blessing A.',
    email: '',
    bio: LECTURER_BIO_MAP['Blessing A.'] ?? null,
    lecturerTitle: 'Framing',
    gemstone: 'beryl',
    avatarUrl: blessingImage,
    createdAt: new Date(0),
    course: null,
  },
  {
    id: 'gl-kene',
    fullName: 'Kene O.',
    email: '',
    bio: LECTURER_BIO_MAP['Kene O.'] ?? null,
    lecturerTitle: 'Interior',
    gemstone: 'chalcedony',
    avatarUrl: keneImage,
    createdAt: new Date(0),
    course: null,
  },
  {
    id: 'gl-mahi',
    fullName: 'Mahidere A.',
    email: '',
    bio: LECTURER_BIO_MAP['Mahidere A.'] ?? null,
    lecturerTitle: 'Interior',
    gemstone: 'jacinth',
    avatarUrl: mahiImage,
    createdAt: new Date(0),
    course: null,
  },
  {
    id: 'gl-chinomnso',
    fullName: 'Chinomnso',
    email: '',
    bio: LECTURER_BIO_MAP['Chinomnso'] ?? null,
    lecturerTitle: 'Roof',
    gemstone: 'chrysolite',
    avatarUrl: obiImage,
    createdAt: new Date(0),
    course: null,
  },
  {
    id: 'gl-ugo',
    fullName: 'Ugo O.',
    email: '',
    bio: LECTURER_BIO_MAP['Ugo O.'] ?? null,
    lecturerTitle: 'Roof',
    gemstone: 'topaz',
    avatarUrl: ugoImage,
    createdAt: new Date(0),
    course: null,
  },
]

function getGemInitials(fullName: string): string {
  const names = fullName.trim().split(' ')
  if (names.length === 1) return names[0].substring(0, 2).toUpperCase()
  return (names[0][0] + names[names.length - 1][0]).toUpperCase()
}

function GemLecturerCard({
  teacher,
  onClick,
}: {
  teacher: TeacherWithCourse
  onClick: () => void
}) {
  return (
    <div
      className="group relative h-full w-full cursor-pointer overflow-hidden border border-[#C5A059]/40 bg-[#0F0C07] shadow-[0_42px_100px_-52px_rgba(0,0,0,0.82)] transition-all duration-300 hover:border-[#C5A059]/70"
      onClick={onClick}
    >
      {/* inner decorative gold border */}
      <div className="pointer-events-none absolute inset-[7px] z-10 border border-[#C5A059]/20 transition-colors duration-300 group-hover:border-[#C5A059]/40" />

      {/* full-bleed image or initials fallback */}
      {teacher.avatarUrl ? (
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${teacher.avatarUrl})` }}
          role="img"
          aria-label={teacher.fullName}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-[#1A1716]">
          <div className="flex size-20 items-center justify-center border border-[#C5A059]/30 bg-[#1C1A17] font-serif text-2xl text-[#E9D9B4]">
            {getGemInitials(teacher.fullName)}
          </div>
        </div>
      )}

      {/* top dark gradient for label readability */}
      <div className="absolute inset-x-0 top-0 h-28 bg-linear-to-b from-black/70 to-transparent" />

      {/* top: course theme label */}
      {teacher.lecturerTitle && (
        <div className="absolute inset-x-0 top-5 z-20 flex flex-col items-center gap-2 px-4">
          <span className="text-center text-[0.58rem] font-medium tracking-[0.36em] text-[#D4B373] uppercase">
            {teacher.lecturerTitle}
          </span>
          <div className="h-px w-6 bg-[#C5A05988]" />
        </div>
      )}

      {/* bottom frosted overlay — always visible, taller to fit name + bio */}
      <div
        className="absolute inset-x-0 bottom-0 z-20 h-[55%] mask-[linear-gradient(to_bottom,transparent_0%,black_28%)]"
        style={{
          background:
            'linear-gradient(to bottom, transparent 0%, rgba(5,4,2,0.92) 100%)',
        }}
      >
        <div className="flex h-full flex-col justify-end gap-1.5 px-3 pb-4">
          <div className="h-px w-7 bg-white/20" />
          <div className="flex items-center gap-2">
            {teacher.gemstone && GEM_IMAGE_MAP[teacher.gemstone] && (
              <img
                src={GEM_IMAGE_MAP[teacher.gemstone]}
                alt={teacher.gemstone}
                className="size-12 object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]"
              />
            )}
            <h3 className="font-serif text-xl leading-tight text-white italic">
              {teacher.fullName}
            </h3>
          </div>
          {teacher.bio && (
            <p className="text-sm leading-[1.6] text-white/75">{teacher.bio}</p>
          )}
        </div>
      </div>
    </div>
  )
}

function getGemRelativeOffset(
  activeIndex: number,
  itemIndex: number,
  total: number = PAIR_META.length,
): number {
  let offset = itemIndex - activeIndex
  if (offset > total / 2) offset -= total
  else if (offset < -total / 2) offset += total
  return offset
}

function getMobileSingleCardMotionStyle(offset: number) {
  const abs = Math.abs(offset)
  const dir = offset > 0 ? 1 : -1
  if (abs === 0) {
    return {
      transform: 'translateX(-50%) translateY(0) scale(1)',
      opacity: 1,
      zIndex: 30,
      filter: 'blur(0px)',
    }
  }
  if (abs === 1) {
    return {
      transform: `translateX(calc(-50% + ${dir * 120}%)) translateY(0) scale(0.92)`,
      opacity: 0,
      zIndex: 20,
      filter: 'blur(0px)',
    }
  }
  return {
    transform: `translateX(calc(-50% + ${dir * 130}%)) translateY(0) scale(0.88)`,
    opacity: 0,
    zIndex: 0,
    filter: 'blur(0px)',
  }
}

function getGemCardMotionStyle(offset: number) {
  const abs = Math.abs(offset)
  const dir = offset > 0 ? 1 : -1

  if (abs === 0) {
    return {
      transform: 'translateX(-50%) translateY(0) scale(1)',
      opacity: 1,
      zIndex: 30,
      filter: 'blur(0px)',
    }
  }
  if (abs === 1) {
    return {
      transform: `translateX(calc(-50% + ${dir * 58}%)) translateY(4%) scale(0.91)`,
      opacity: 0.68,
      zIndex: 20,
      filter: 'blur(0.5px)',
    }
  }
  if (abs === 2) {
    return {
      transform: `translateX(calc(-50% + ${dir * 86}%)) translateY(7%) scale(0.82)`,
      opacity: 0,
      zIndex: 10,
      filter: 'blur(1.5px)',
    }
  }
  return {
    transform: `translateX(calc(-50% + ${dir * 100}%)) translateY(8%) scale(0.74)`,
    opacity: 0,
    zIndex: 0,
    filter: 'blur(3px)',
  }
}

export function LandingLecturerGemsSection() {
  const { activeIndex, setActiveIndex, goToPrevious, goToNext } = useCarousel(
    PAIR_META.length,
  )
  const m = useCarousel(gemLecturers.length)

  const activePair = PAIR_META[activeIndex]

  return (
    <LandingImageSection
      id="teacher-gems"
      backgroundImageUrl={facultyBackground}
      gradientFrom="rgba(255,255,255,0.9)"
      gradientTo="rgba(255,255,255,0.9)"
      className="border-b border-[#1A1A1A]/10 text-[#1C1815]"
    >
      <LandingSectionOverlay
        gradientFrom="rgba(197,160,89,0.12)"
        secondaryGradientFrom="rgba(255,255,255,0.28)"
        linePosition="right"
        lineColor="#1A1A1A/12"
      />

      <LandingSectionContainer className="relative px-0 py-18 sm:py-22 lg:py-24">
        <div className="space-y-14">
          <div className="grid gap-12 px-5 sm:px-0 lg:grid-cols-[minmax(0,0.90fr)_minmax(24rem,1.10fr)] lg:items-start lg:gap-12">
            {/* Two-column header */}
            {/* Left: scriptures + two-line headline */}
            <LandingScriptureSectionHeader
              eyebrowLabel="Teaching Faculty"
              eyebrowTone="deep"
              headlineColor="#1C1815"
              headlineMaxW="max-w-[18ch]"
              headline={
                <>
                  Twelve Lecturers
                  <br />
                  <span className="text-[#C5A059] italic">Twelve Stones</span>
                </>
              }
              introText={
                <>
                  <span className="mb-2 block text-[0.6rem] font-medium tracking-[0.28em] text-[#9B7A41] uppercase">
                    The DINA Anthem · A Song of Commanders
                  </span>
                  <span className="text-[#C5A059]">♫</span> <br />
                  <em>
                    Command me Lord,
                    <br />
                    Command me Lord,
                    <br />
                    That I may be, a commander,
                    <br />
                    <br />
                    Command me Lord,
                    <br />
                    To lead battalions,
                    <br />
                    That will turn men's hearts,
                    <br />
                    back to God
                  </em>{' '}
                  <br />
                  <span className="text-[#C5A059]">♫</span>
                </>
              }
              scriptures={[
                {
                  quote:
                    'After these things the Lord appointed other seventy also, and sent them two and two before his face.',
                  reference: 'Luke 10:1',
                },
              ]}
            />

            {/* Right: dark feature panel — active pair info + gems image */}
            <LandingFeaturePanel>
              <LandingFeaturePanelHeader backgroundImageUrl={facultyBackground}>
                <div className="relative flex min-h-48 flex-col justify-between gap-5 p-4 sm:p-6 lg:min-h-72">
                  <div className="flex items-start justify-between gap-6">
                    <div>
                      <div className="text-[0.68rem] font-medium tracking-[0.3em] text-[#D4B373] uppercase">
                        The Twelve Stones
                      </div>
                      <div className="mt-3 max-w-[22ch] font-serif text-[clamp(1rem,2vw,1.5rem)] leading-tight tracking-[-0.02em] text-white/90 italic">
                        "The foundations of the wall of the city were garnished
                        with all manner of precious stones."
                      </div>
                    </div>
                    <div className="shrink-0 border border-[#C5A059]/35 bg-black/24 px-3 py-2 text-[0.8rem] font-medium tracking-[0.26em] text-[#E9D9B4] uppercase">
                      Rev. 21
                    </div>
                  </div>
                  <div className="h-px w-full bg-[#C5A059]/20" />
                  <div className="border border-white/12 bg-black/24 px-4 py-3 backdrop-blur-sm">
                    <div className="text-[0.58rem] font-medium tracking-[0.28em] text-[#AFA28F] uppercase">
                      The Twelve Foundations
                    </div>
                    <div className="mt-2 text-[0.68rem] leading-[1.9] font-medium tracking-[0.18em] text-[#D4B373] uppercase">
                      Jasper · Sapphire · Chalcedony · Emerald
                      <br className="hidden sm:block" />
                      Sardonyx · Sardius · Chrysolyte · Beryl
                      <br className="hidden sm:block" />
                      Topaz · Chrysoprasus · Jacinth · Amethyst
                    </div>
                  </div>
                </div>
              </LandingFeaturePanelHeader>
              <LandingFeaturePanelBody>
                <img
                  src={gemsImage}
                  alt="The twelve stones"
                  className="w-full p-2"
                  loading="lazy"
                />
              </LandingFeaturePanelBody>
            </LandingFeaturePanel>
          </div>

          {/* MOBILE: one lecturer at a time over all 12 */}
          <div className="space-y-10 md:hidden">
            <LandingActiveItemNav
              className="items-center"
              label="Active pair"
              activeValue={`${PAIR_META[Math.floor(m.activeIndex / 2)].number}. ${PAIR_META[Math.floor(m.activeIndex / 2)].theme}`}
              onPrevious={m.goToPrevious}
              onNext={m.goToNext}
              borderColor="border-[#1A1A1A]/10"
              prevButtonClass="border-[#1A1A1A]/10 bg-[#FCFBF8]/74 text-[#1C1815] shadow-[0_22px_34px_-30px_rgba(0,0,0,0.24)] backdrop-blur-sm hover:border-[#C5A059]/50 hover:bg-white/80"
              nextButtonClass="border-[#C5A059]/35 bg-[#1A1716] text-[#E9D9B4] shadow-[0_26px_40px_-28px_rgba(0,0,0,0.4)] hover:border-[#D6B16E] hover:text-white"
              labelColor="text-[#6e562d]"
              valueColor="text-[#1C1815]"
            />
            <div className="relative h-144 overflow-hidden">
              {gemLecturers.map((lecturer, index) => {
                const offset = getGemRelativeOffset(
                  m.activeIndex,
                  index,
                  gemLecturers.length,
                )
                const isVisible = Math.abs(offset) <= 1
                return (
                  <div
                    key={lecturer.id}
                    aria-hidden={!isVisible}
                    className="absolute top-0 left-1/2 w-full"
                    style={{
                      height: '100%',
                      ...getMobileSingleCardMotionStyle(offset),
                      transition:
                        'transform 700ms cubic-bezier(0.22,1,0.36,1), opacity 700ms cubic-bezier(0.22,1,0.36,1)',
                    }}
                  >
                    <GemLecturerCard
                      teacher={lecturer}
                      onClick={() => m.setActiveIndex(index)}
                    />
                  </div>
                )
              })}
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {PAIR_META.map((pair, index) => {
                const isActive = index === Math.floor(m.activeIndex / 2)
                return (
                  <button
                    key={pair.id}
                    type="button"
                    onClick={() => m.setActiveIndex(index * 2)}
                    aria-label={`Show ${pair.theme} lecturers`}
                    className={`border px-3 py-1.5 text-[0.65rem] font-medium tracking-[0.28em] uppercase transition-all duration-500 ease-out ${
                      isActive
                        ? 'border-[#C5A059]/42 bg-[#1A1716]/8 text-[#1C1815] shadow-[0_24px_44px_-34px_rgba(0,0,0,0.2)]'
                        : 'border-[#1A1A1A]/10 bg-white/40 text-[#8A7B68] hover:border-[#1A1A1A]/18 hover:bg-white/60'
                    }`}
                  >
                    {pair.theme}
                  </button>
                )
              })}
            </div>
          </div>

          {/* DESKTOP: pair 3D carousel (unchanged) */}
          <div className="hidden space-y-10 md:block">
            <LandingActiveItemNav
              className="max-w-xs items-center"
              label="Active pair"
              activeValue={`${activePair.number}. ${activePair.theme}`}
              onPrevious={goToPrevious}
              onNext={goToNext}
              borderColor="border-[#1A1A1A]/10"
              prevButtonClass="border-[#1A1A1A]/10 bg-[#FCFBF8]/74 text-[#1C1815] shadow-[0_22px_34px_-30px_rgba(0,0,0,0.24)] backdrop-blur-sm hover:border-[#C5A059]/50 hover:bg-white/80"
              nextButtonClass="border-[#C5A059]/35 bg-[#1A1716] text-[#E9D9B4] shadow-[0_26px_40px_-28px_rgba(0,0,0,0.4)] hover:border-[#D6B16E] hover:text-white"
              labelColor="text-[#6e562d]"
              valueColor="text-[#1C1815]"
            />

            {/* Pair carousel: 2 cards side by side per slot */}
            <div className="relative h-96 overflow-hidden sm:h-104 md:h-112 lg:min-h-120">
              {PAIR_META.map((pair, index) => {
                const offset = getGemRelativeOffset(activeIndex, index)
                const isVisible = Math.abs(offset) <= 2

                return (
                  <div
                    key={pair.id}
                    aria-hidden={!isVisible}
                    className="absolute top-0 left-1/2 w-76 cursor-pointer sm:w-92 md:w-152 lg:w-200"
                    style={{
                      height: '100%',
                      ...getGemCardMotionStyle(offset),
                      transition:
                        'transform 700ms cubic-bezier(0.22,1,0.36,1), opacity 700ms cubic-bezier(0.22,1,0.36,1), filter 700ms cubic-bezier(0.22,1,0.36,1)',
                    }}
                    onClick={() => setActiveIndex(index)}
                  >
                    <div className="relative h-full">
                      <div className="absolute inset-y-0 left-0 w-full sm:w-[calc(50%-0.25rem)]">
                        <GemLecturerCard
                          teacher={gemLecturers[index * 2]}
                          onClick={() => setActiveIndex(index)}
                        />
                      </div>
                      <div className="absolute inset-y-0 right-0 sm:w-[calc(50%-0.25rem)]">
                        <GemLecturerCard
                          teacher={gemLecturers[index * 2 + 1]}
                          onClick={() => setActiveIndex(index)}
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* 6 theme buttons — single row */}
            <div className="flex flex-wrap items-center justify-center gap-2">
              {PAIR_META.map((pair, index) => {
                const isActive = index === activeIndex
                return (
                  <button
                    key={pair.id}
                    type="button"
                    onClick={() => setActiveIndex(index)}
                    aria-label={`Show ${pair.theme} lecturers`}
                    className={`border px-3 py-1.5 text-[0.65rem] font-medium tracking-[0.28em] uppercase transition-all duration-500 ease-out ${
                      isActive
                        ? 'border-[#C5A059]/42 bg-[#1A1716]/8 text-[#1C1815] shadow-[0_24px_44px_-34px_rgba(0,0,0,0.2)]'
                        : 'border-[#1A1A1A]/10 bg-white/40 text-[#8A7B68] hover:border-[#1A1A1A]/18 hover:bg-white/60'
                    }`}
                  >
                    {pair.theme}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </LandingSectionContainer>
    </LandingImageSection>
  )
}
