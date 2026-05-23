import type { LandingNumberedItem } from '@/components/landing/types'
import facultyBackground from '@/assets/images/bg/bg_lecturers.webp'
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
import {
  LandingActiveItemNav,
  LandingFeaturePanel,
  LandingFeaturePanelBody,
  LandingFeaturePanelHeader,
  LandingImageSection,
  LandingItemGrid,
  LandingScriptureSectionHeader,
  LandingSection,
  LandingSectionContainer,
  LandingSectionEyebrowCentered,
  LandingSectionOverlay,
} from '@/components/landing/primitives'
import { useCarousel } from '@/components/landing/hooks'
import { TeacherCard } from '@/components/card/TeacherCard'
import type { TeacherWithCourse } from '@/types/teacher'

type Lecturer = {
  name: string
  bio: string
  image?: string
}

type LecturerPair = LandingNumberedItem & {
  course: string
  theme: string
  lecturers: [Lecturer, Lecturer]
}

const lecturerPairs: Array<LecturerPair> = [
  {
    id: 'apostolic-foundations',
    number: '01',
    course: 'The Mercy of God, Salvation & the Life of Jesus',
    theme: 'Ground',
    lecturers: [
      {
        name: 'Andrew A.',
        bio: 'Professor Andrew is an award-winning physician and world-class scholar in preventing childhood obesity. He leads urFIT-child research group in Finland and a born-again Christian who demonstrates the power of the Holy Ghost daily.',
        image: andrewImage,
      },
      {
        name: 'Ella O.',
        bio: 'Emmanuella is an experienced Sustainability and Climate Change Consultant advising public and private organisations locally and globally. She helps organisations design and implement ESG and sustainability transformation strategies.',
        image: ellaImage,
      },
    ],
  },
  {
    id: 'prayer-and-presence',
    number: '02',
    course: 'The Foundation of the Believer',
    theme: 'Foundation',
    lecturers: [
      {
        name: 'Juhani J.',
        bio: 'Juhani is an experienced software developer. His passion is to know the Holy Spirit and to see Finland turn to God, city by city. The fire of God is evident in his life, and through him the world will see Jesus.',
        image: juhaniImage,
      },
      {
        name: 'Akosua O.',
        bio: 'Akosua is studying computer science and is passionate about faith, discipleship, and sharing the Gospel. Through church ministry, evangelism, and teaching, she continues growing in prayer, biblical understanding, and service.',
        image: akosyaImage,
      },
    ],
  },
  {
    id: 'character-and-holiness',
    number: '03',
    course: 'The Death of Jesus',
    theme: 'Walls',
    lecturers: [
      {
        name: 'Emmanuel E.',
        bio: 'Emmanuel is a Gospel minister, author, web developer, and brand specialist from Nigeria, dedicated to proclaiming the Gospel of Jesus through outreaches, Christian books, and global digital ministry platforms.',
        image: emmanuelImage,
      },
      {
        name: 'Ezinne O.',
        bio: 'Ezinne is a disciple of the Lord, devoted daily to learning at His feet and loving Him wholeheartedly. She is also a Product Leader focused on AI enablement, managing the development and launch of AI voice and multimodal products across Europe.',
        image: ezinneImage,
      },
    ],
  },
  {
    id: 'leadership-and-order',
    number: '04',
    course: 'The Trinity — God, Jesus & the Holy Spirit',
    theme: 'Framing',
    lecturers: [
      {
        name: 'Sade P.',
        bio: 'Sade is a Psychiatrist passionate about teaching and mentoring the next generation of doctors. She works across inpatient and community settings, delivering compassionate, evidence-based, and holistic patient-centred care.',
        image: sadeImage,
      },
      {
        name: 'Blessing A.',
        bio: 'Blessing is a Psychiatrist and solution-focused practitioner with a special interest in lifestyle medicine, addiction support, and youth counselling, with a passion for helping people achieve lasting wellbeing.',
        image: blessingImage,
      },
    ],
  },
  {
    id: 'mission-and-culture',
    number: '05',
    course: 'Following Jesus: From encounter to transformation',
    theme: 'Interior',
    lecturers: [
      {
        name: 'Kene O.',
        bio: 'Kene is a Capital Markets and Derivatives solicitor dual qualified in England, Wales, and Nigeria. She contributes to international financial industry working groups, promoting collaboration, market standards, and innovation.',
        image: keneImage,
      },
      {
        name: 'Mahidere A.',
        bio: 'Mahidere (Mahi) is an epidemiology researcher with a medical background based in Finland. She believes God brought her to Finland to renew her life, strengthen her faith, and restore her calling.',
        image: mahiImage,
      },
    ],
  },
  {
    id: 'endurance-and-commission',
    number: '06',
    course: 'Living the Christian Life in the Modern World',
    theme: 'Roof',
    lecturers: [
      {
        name: 'Obi C.',
        bio: 'Obi is a private markets professional with experience in investor relations, family office advisory, fiduciary mandates, and private asset valuations across Jersey, Luxembourg, London, and China. He believes a fulfilled life is guided by God, wisdom, and eternal purpose.',
        image: obiImage,
      },
      {
        name: 'Ugo O.',
        bio: 'EU Qualified Medical Doctor with over 10 years of experience spanning clinical medicine and the pharmaceutical industry. My personal and professional interests are embedded ultimately in work that affects the quality of life of patients, consumers, and society.',
        image: ugoImage,
      },
    ],
  },
]

export function LandingTeacherSection() {
  const { activeIndex, setActiveIndex, goToPrevious, goToNext } = useCarousel(
    lecturerPairs.length,
  )
  const activePair = lecturerPairs[activeIndex]

  return (
    <LandingImageSection
      id="teachers"
      backgroundImageUrl={facultyBackground}
      gradientFrom="rgba(255, 255, 255, 0.9)"
      gradientTo="rgba(255, 255, 255, 0.9)"
      className="border-b border-[#1A1A1A]/10 text-[#1C1815]"
    >
      <LandingSectionOverlay
        gradientFrom="rgba(197,160,89,0.12)"
        secondaryGradientFrom="rgba(255,255,255,0.28)"
        linePosition="right"
        lineColor="#1A1A1A/12"
      />

      <LandingSectionContainer className="px-0 py-18 sm:py-22 lg:py-24">
        <div className="grid items-start gap-14 lg:grid-cols-[minmax(0,0.82fr)_minmax(24rem,1.18fr)] lg:gap-20">
          <div className="space-y-10 px-5 sm:px-0">
            <LandingScriptureSectionHeader
              eyebrowLabel="Teaching Faculty"
              eyebrowTone="deep"
              headline="Six lecturer pairs"
              headlineMaxW="max-w-[14ch]"
              headlineNowrap
              scriptures={[
                {
                  quote:
                    'As they ministered to the Lord, and fasted, the Holy Ghost said, Separate me Barnabas and Saul for the work whereunto I have called them.',
                  reference: 'Acts 13:2',
                },
                {
                  quote:
                    'After these things the Lord appointed other seventy also, and sent them two and two before his face.',
                  reference: 'Luke 10:1',
                },
              ]}
            />

            <LandingActiveItemNav
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

            <LandingItemGrid
              items={lecturerPairs}
              activeIndex={activeIndex}
              onSelect={setActiveIndex}
              borderColor="border-[#1A1A1A]/10"
              bgColor="bg-[#1A1716]/80"
              activeBorderColor="border-[#C5A059]/42"
              activeBgColor="bg-[#1A1716]"
              arrowColor="text-[#9B8A73]"
              activeArrowColor="text-[#E9D9B4]"
              renderItem={(pair, _index, isActive) => (
                <div>
                  <div
                    className={`text-[0.65rem] font-medium tracking-[0.28em] uppercase ${
                      isActive ? 'text-[#D4B373]' : 'text-[#8A7B68]'
                    }`}
                  >
                    {pair.number}
                  </div>
                  <div
                    className={`mt-2 font-serif text-xl ${
                      isActive ? 'text-[#F8F4EC]' : 'text-[#F8F4EC]/70'
                    }`}
                  >
                    {pair.theme}
                  </div>
                </div>
              )}
            />
          </div>

          <LandingFeaturePanel>
            <LandingFeaturePanelHeader backgroundImageUrl={facultyBackground}>
              <div className="relative flex min-h-84 flex-col justify-between p-4 sm:p-8 lg:min-h-100">
                <div className="flex items-start justify-between gap-6">
                  <div>
                    <div className="text-[0.68rem] font-medium tracking-[0.3em] text-[#9B7A41] uppercase">
                      Pair {activePair.number}
                    </div>
                    <div className="mt-3 max-w-[14ch] font-serif text-[clamp(1.8rem,4vw,4rem)] leading-[0.92] tracking-[-0.045em] text-white">
                      {activePair.course}
                    </div>
                  </div>
                  <div className="border border-white/12 bg-black/18 px-4 py-3 text-[0.9rem] font-medium tracking-[0.26em] text-[#E9D9B4] uppercase">
                    {activePair.number}
                  </div>
                </div>

                <div className="max-w-60 border border-white/12 bg-black/24 px-4 py-4 shadow-[0_24px_40px_-30px_rgba(0,0,0,0.55)] backdrop-blur-sm">
                  <div className="text-[0.62rem] font-medium tracking-[0.28em] text-[#AFA28F] uppercase">
                    Theme
                  </div>
                  <div className="mt-2 font-serif text-xl leading-tight text-[#a29f97]">
                    {activePair.theme}
                  </div>
                </div>
              </div>
            </LandingFeaturePanelHeader>

            <LandingFeaturePanelBody className="grid gap-5 px-3 py-5 sm:px-8 sm:py-8 lg:grid-cols-2">
              {activePair.lecturers.map((lecturer, index) => (
                <div
                  key={`${activePair.id}-${lecturer.name}`}
                  className="min-h-108 border border-white/10 bg-white/3 px-3 py-5 shadow-[0_22px_36px_-30px_rgba(0,0,0,0.4)]"
                >
                  <div className="flex items-start gap-4">
                    {lecturer.image ? (
                      <div className="h-20 w-20 shrink-0 overflow-hidden border border-[#C5A059]/30 bg-black/24 backdrop-blur-sm">
                        <img
                          key={lecturer.name}
                          src={lecturer.image}
                          alt={lecturer.name}
                          className="animate-in fade-in h-full w-full object-cover duration-1500"
                          loading="lazy"
                        />
                      </div>
                    ) : (
                      <div className="flex h-20 w-20 shrink-0 items-center justify-center border border-[#C5A059]/30 bg-black/24 text-center backdrop-blur-sm">
                        <div>
                          <div className="text-[0.58rem] font-medium tracking-[0.24em] text-[#9B8A73] uppercase">
                            Image
                          </div>
                          <div className="mt-1.5 text-[0.56rem] tracking-[0.16em] text-[#8E816D] uppercase">
                            Soon
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="min-w-0">
                      <div className="text-[0.62rem] font-medium tracking-[0.28em] text-[#D4B373] uppercase">
                        Lecturer {index + 1}
                      </div>
                      <div className="mt-2 font-serif text-[1.45rem] leading-tight text-[#F8F4EC]">
                        {lecturer.name}
                      </div>
                    </div>
                  </div>

                  <p className="mt-5 text-sm leading-7 text-[#D8D0C7] sm:text-[0.96rem]">
                    {lecturer.bio}
                  </p>
                </div>
              ))}
            </LandingFeaturePanelBody>
          </LandingFeaturePanel>
        </div>
      </LandingSectionContainer>
    </LandingImageSection>
  )
}

// ============================================================================
// GEM CAROUSEL SECTION
// ============================================================================

const GEM_COLORS: Record<string, string> = {
  jasper: '#8B2020',
  sapphire: '#1E40AF',
  chalcedony: '#8B9DC3',
  emerald: '#065F46',
  sardonyx: '#C2400C',
  sardius: '#DC4A1E',
  chrysolite: '#65A30D',
  beryl: '#38BDF8',
  topaz: '#D97706',
  chrysoprasus: '#10B981',
  jacinth: '#EA580C',
  amethyst: '#7C3AED',
}

const GEM_BG_COLORS: Record<string, string> = {
  jasper: '#130505',
  sapphire: '#05091A',
  chalcedony: '#0C0E14',
  emerald: '#040F0B',
  sardonyx: '#1A0805',
  sardius: '#1C0806',
  chrysolite: '#0C1304',
  beryl: '#05131A',
  topaz: '#1A1005',
  chrysoprasus: '#041A0E',
  jacinth: '#1A0804',
  amethyst: '#100519',
}

const gemLecturers: Array<TeacherWithCourse> = [
  {
    id: 'gl-juhani',
    fullName: 'Juhani J.',
    email: '',
    bio: null,
    lecturerTitle: null,
    gemstone: 'jasper',
    avatarUrl: juhaniImage,
    createdAt: new Date(0),
    course: null,
  },
  {
    id: 'gl-ella',
    fullName: 'Ella O.',
    email: '',
    bio: null,
    lecturerTitle: null,
    gemstone: 'sapphire',
    avatarUrl: ellaImage,
    createdAt: new Date(0),
    course: null,
  },
  {
    id: 'gl-kene',
    fullName: 'Kene O.',
    email: '',
    bio: null,
    lecturerTitle: null,
    gemstone: 'chalcedony',
    avatarUrl: keneImage,
    createdAt: new Date(0),
    course: null,
  },
  {
    id: 'gl-ezinne',
    fullName: 'Ezinne O.',
    email: '',
    bio: null,
    lecturerTitle: null,
    gemstone: 'emerald',
    avatarUrl: ezinneImage,
    createdAt: new Date(0),
    course: null,
  },
  {
    id: 'gl-akosua',
    fullName: 'Akosua O.',
    email: '',
    bio: null,
    lecturerTitle: null,
    gemstone: 'sardonyx',
    avatarUrl: akosyaImage,
    createdAt: new Date(0),
    course: null,
  },
  {
    id: 'gl-sade',
    fullName: 'Sade P.',
    email: '',
    bio: null,
    lecturerTitle: null,
    gemstone: 'sardius',
    avatarUrl: sadeImage,
    createdAt: new Date(0),
    course: null,
  },
  {
    id: 'gl-chinomnso',
    fullName: 'Chinomnso',
    email: '',
    bio: null,
    lecturerTitle: null,
    gemstone: 'chrysolite',
    avatarUrl: null,
    createdAt: new Date(0),
    course: null,
  },
  {
    id: 'gl-blessing',
    fullName: 'Blessing A.',
    email: '',
    bio: null,
    lecturerTitle: null,
    gemstone: 'beryl',
    avatarUrl: blessingImage,
    createdAt: new Date(0),
    course: null,
  },
  {
    id: 'gl-ugo',
    fullName: 'Ugo O.',
    email: '',
    bio: null,
    lecturerTitle: null,
    gemstone: 'topaz',
    avatarUrl: ugoImage,
    createdAt: new Date(0),
    course: null,
  },
  {
    id: 'gl-emmanuel',
    fullName: 'Emmanuel E.',
    email: '',
    bio: null,
    lecturerTitle: null,
    gemstone: 'chrysoprasus',
    avatarUrl: emmanuelImage,
    createdAt: new Date(0),
    course: null,
  },
  {
    id: 'gl-mahi',
    fullName: 'Mahidere A.',
    email: '',
    bio: null,
    lecturerTitle: null,
    gemstone: 'jacinth',
    avatarUrl: mahiImage,
    createdAt: new Date(0),
    course: null,
  },
  {
    id: 'gl-andrew',
    fullName: 'Andrew A.',
    email: '',
    bio: null,
    lecturerTitle: null,
    gemstone: 'amethyst',
    avatarUrl: andrewImage,
    createdAt: new Date(0),
    course: null,
  },
]

function getGemRelativeOffset(activeIndex: number, itemIndex: number): number {
  const total = gemLecturers.length
  let offset = itemIndex - activeIndex
  if (offset > total / 2) offset -= total
  else if (offset < -total / 2) offset += total
  return offset
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
      opacity: 0.28,
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
    gemLecturers.length,
  )

  const active = gemLecturers[activeIndex]
  const activeBg = active.gemstone
    ? (GEM_BG_COLORS[active.gemstone] ?? '#08080A')
    : '#08080A'

  const half = Math.ceil(gemLecturers.length / 2)

  return (
    <LandingSection
      id="teacher-gems"
      className="border-b border-[#C5A059]/14 text-[#F7F4EE]"
      style={{
        backgroundColor: activeBg,
        transition: 'background-color 900ms cubic-bezier(0.22,1,0.36,1)',
      }}
    >
      <div
        className="absolute inset-0 bg-cover bg-center opacity-[0.07]"
        style={{ backgroundImage: `url(${facultyBackground})` }}
      />

      <LandingSectionContainer className="relative py-18 sm:py-22 lg:py-28">
        <div className="space-y-14">
          <div className="mx-auto max-w-3xl space-y-8 text-center">
            <LandingSectionEyebrowCentered label="Stones and Names" />

            <h2 className="font-serif text-[clamp(3.2rem,6vw,5.5rem)] leading-[0.9] tracking-[-0.055em] text-white">
              The Twelve
            </h2>

            <LandingActiveItemNav
              label="Lecturer"
              activeValue={`${activeIndex + 1} / ${gemLecturers.length}`}
              onPrevious={goToPrevious}
              onNext={goToNext}
              borderColor="border-white/10"
              prevButtonClass="border-white/12 bg-white/6 text-[#F8F4EC] hover:border-[#C5A059]/50 hover:bg-white/10"
              nextButtonClass="border-[#C5A059]/35 bg-[#1A1716] text-[#E9D9B4] hover:border-[#D6B16E] hover:text-white"
              labelColor="text-[#9B8A73]"
              valueColor="text-[#9B8A73]"
              className="mx-auto max-w-xs"
            />
          </div>

          <div className="space-y-10">
            <div className="relative h-72 overflow-hidden sm:h-80 lg:h-96">
              {gemLecturers.map((lecturer, index) => {
                const offset = getGemRelativeOffset(activeIndex, index)
                const isVisible = Math.abs(offset) <= 2

                return (
                  <div
                    key={lecturer.id}
                    aria-hidden={!isVisible}
                    className="absolute top-0 left-1/2 w-48 cursor-pointer sm:w-56 lg:w-64"
                    style={{
                      ...getGemCardMotionStyle(offset),
                      transition:
                        'transform 700ms cubic-bezier(0.22,1,0.36,1), opacity 700ms cubic-bezier(0.22,1,0.36,1), filter 700ms cubic-bezier(0.22,1,0.36,1)',
                    }}
                    onClick={() => setActiveIndex(index)}
                  >
                    <TeacherCard
                      teacher={lecturer}
                      onClick={() => setActiveIndex(index)}
                    />
                  </div>
                )
              })}
            </div>

            <div className="flex flex-col items-center gap-3">
              <div className="flex flex-wrap items-center justify-center gap-2">
                {gemLecturers.slice(0, half).map((lecturer, index) => {
                  const isActive = index === activeIndex
                  const gemColor = lecturer.gemstone
                    ? GEM_COLORS[lecturer.gemstone]
                    : undefined
                  return (
                    <button
                      key={lecturer.id}
                      type="button"
                      onClick={() => setActiveIndex(index)}
                      aria-label={`Show ${lecturer.fullName}`}
                      className={`border px-3 py-1.5 text-[0.65rem] font-medium tracking-[0.28em] uppercase transition-all duration-500 ease-out ${
                        isActive && !gemColor
                          ? 'border-[#C5A059]/42 bg-white/8 text-[#D4B373]'
                          : !isActive
                            ? 'border-white/10 bg-white/3 text-[#8E816D] hover:border-white/18 hover:bg-white/5'
                            : ''
                      }`}
                      style={
                        isActive && gemColor
                          ? {
                              borderColor: `${gemColor}66`,
                              backgroundColor: 'rgba(255,255,255,0.06)',
                              color: gemColor,
                            }
                          : undefined
                      }
                    >
                      {lecturer.fullName}
                    </button>
                  )
                })}
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2">
                {gemLecturers.slice(half).map((lecturer, index) => {
                  const actualIndex = index + half
                  const isActive = actualIndex === activeIndex
                  const gemColor = lecturer.gemstone
                    ? GEM_COLORS[lecturer.gemstone]
                    : undefined
                  return (
                    <button
                      key={lecturer.id}
                      type="button"
                      onClick={() => setActiveIndex(actualIndex)}
                      aria-label={`Show ${lecturer.fullName}`}
                      className={`border px-3 py-1.5 text-[0.65rem] font-medium tracking-[0.28em] uppercase transition-all duration-500 ease-out ${
                        isActive && !gemColor
                          ? 'border-[#C5A059]/42 bg-white/8 text-[#D4B373]'
                          : !isActive
                            ? 'border-white/10 bg-white/3 text-[#8E816D] hover:border-white/18 hover:bg-white/5'
                            : ''
                      }`}
                      style={
                        isActive && gemColor
                          ? {
                              borderColor: `${gemColor}66`,
                              backgroundColor: 'rgba(255,255,255,0.06)',
                              color: gemColor,
                            }
                          : undefined
                      }
                    >
                      {lecturer.fullName}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </LandingSectionContainer>
    </LandingSection>
  )
}
