import { useState } from 'react'
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react'
import facultyBackground from '@/assets/images/bg/bg_lecturers.webp'
import andrewImage from '@/assets/images/lecturers/andrew.jpg'
import akosyaImage from '@/assets/images/lecturers/akosya.webp'
import juhaniImage from '@/assets/images/lecturers/juhani.webp'
import mahiImage from '@/assets/images/lecturers/mahi.png'
import sadeImage from '@/assets/images/lecturers/sade.jpeg'
import ezinneImage from '@/assets/images/lecturers/ezinne.jpg'
import {
  LandingFeaturePanel,
  LandingFeaturePanelBody,
  LandingFeaturePanelHeader,
  LandingSection,
  LandingSectionContainer,
  LandingSectionEyebrow,
} from '@/components/landing/primitives'

type Lecturer = {
  name: string
  title: string
  bio: string
  image?: string
}

type LecturerPair = {
  id: string
  number: string
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
        title: '',
        bio: 'Professor Andrew is an award-winning physician and world-class scholar in preventing childhood obesity. He leads urFIT-child research group in Finland and a born-again Christian who demonstrates the power of the Holy Ghost daily.',
        image: andrewImage,
      },
      {
        name: 'Ella O.',
        title: '',
        bio: '',
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
        title: '',
        bio: 'Juhani is an experienced software developer. His passion is to know the Holy Spirit and to see Finland turn to God, city by city. The fire of God is evident in his life, and through him the world will see Jesus.',
        image: juhaniImage,
      },
      {
        name: 'Akosua O.',
        title: '',
        bio: 'Currently pursuing a degree in Computer Science.',
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
        title: '',
        bio: '',
      },
      {
        name: 'Ezinne O.',
        title: '',
        bio: 'Ezinne Onyeka is a disciple of the Lord, devoted daily to learning at His feet and loving Him wholeheartedly. She is also a Product Leader focused on AI enablement, managing the development and launch of AI voice and multimodal products across Europe.',
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
        title: '',
        bio: 'I am a Christian with a passion for teaching Christ and spreading the gospel of our Lord and saviour Jesus.',
        image: sadeImage,
      },
      {
        name: 'Blessing A.',
        title: '',
        bio: '',
      },
    ],
  },
  {
    id: 'mission-and-culture',
    number: '05',
    course: "Peter's Encounter, Following & Transformation",
    theme: 'Interior',
    lecturers: [
      {
        name: 'Kene O.',
        title: '',
        bio: '',
      },
      {
        name: 'Mahidere A.',
        title: '',
        bio: 'I am Mahidere W. Ali (Preferred: Mahi). I currently live in Finland and am an epidemiology researcher with a medical background. God brought me to Finland to renew my life and calling.',
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
        title: '',
        bio: '',
      },
      {
        name: 'Ugo O.',
        title: '',
        bio: '',
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
    <LandingSection
      id="teachers"
      className="border-b border-[#1A1A1A]/10 text-[#1C1815]"
      style={{
        backgroundImage: `linear-gradient(to bottom, rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0.9)), url(${facultyBackground})`,
        backgroundPosition: 'center',
        backgroundSize: 'cover',
      }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(197,160,89,0.12),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.28),transparent_22%)]" />
      <div className="absolute right-[8%] bottom-24 h-px w-16 bg-[#1A1A1A]/12 lg:w-24" />

      <LandingSectionContainer className="py-18 sm:py-22 lg:py-24">
        <div className="grid items-start gap-14 lg:grid-cols-[minmax(0,0.82fr)_minmax(24rem,1.18fr)] lg:gap-20">
          <div className="space-y-10">
            <div className="space-y-6">
              <LandingSectionEyebrow label="Teaching Faculty" tone="deep" />

              <h2 className="block max-w-[14ch] font-serif text-[clamp(3rem,5vw,5.1rem)] leading-[0.92] tracking-[-0.055em] whitespace-nowrap text-[#1C1815]">
                Six lecturer pairs
              </h2>

              <p className="max-w-xl text-base leading-8 font-light tracking-[0.04em] text-[#4E463D] sm:text-lg">
                "As they ministered to the Lord, and fasted, the Holy Ghost
                said, Separate me Barnabas and Saul for the work whereunto I
                have called them."
                <span className="text-[0.72rem] font-medium tracking-[0.2em] text-[#9B7A41] uppercase">
                  &nbsp;Acts 13:2
                </span>
                <br />
                <br />
                "After these things the Lord appointed other seventy also, and
                sent them two and two before his face."
                <span className="text-[0.72rem] font-medium tracking-[0.2em] text-[#9B7A41] uppercase">
                  &nbsp;Luke 10:1
                </span>
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

            <div className="hidden gap-3 sm:grid sm:grid-cols-2">
              {lecturerPairs.map((pair, index) => {
                const isActive = index === activeIndex

                return (
                  <button
                    key={pair.id}
                    type="button"
                    onClick={() => setActiveIndex(index)}
                    className={`group flex items-center justify-between gap-4 border px-4 py-4 text-left transition-all ${
                      isActive
                        ? 'border-[#C5A059]/42 bg-[#1A1716] shadow-[0_24px_44px_-34px_rgba(0,0,0,0.6)]'
                        : 'border-[#1A1A1A]/10 bg-[#1A1716]/80 hover:border-[#C5A059]/30 hover:bg-[#1A1716]/90'
                    }`}
                  >
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

          <LandingFeaturePanel>
            <LandingFeaturePanelHeader backgroundImageUrl={facultyBackground}>
              <div className="relative flex min-h-84 flex-col justify-between p-6 sm:p-8 lg:min-h-100">
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

            <LandingFeaturePanelBody className="grid gap-5 px-6 py-7 sm:px-8 sm:py-8 lg:grid-cols-2">
              {activePair.lecturers.map((lecturer, index) => (
                <div
                  key={`${activePair.id}-${lecturer.name}`}
                  className="min-h-108 border border-white/10 bg-white/3 p-5 shadow-[0_22px_36px_-30px_rgba(0,0,0,0.4)]"
                >
                  <div className="flex items-start gap-4">
                    {lecturer.image ? (
                      <div className="h-20 w-20 shrink-0 overflow-hidden border border-[#C5A059]/30 bg-black/24 backdrop-blur-sm">
                        <img
                          src={lecturer.image}
                          alt={lecturer.name}
                          className="h-full w-full object-cover"
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
                      <div className="mt-2 text-sm leading-6 text-[#C9C0B6]">
                        {lecturer.title}
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
    </LandingSection>
  )
}
