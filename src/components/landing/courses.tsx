import type { LandingShowcaseItem } from '@/components/landing/types'
import graphiteBackground from '@/assets/images/bg/bg_courses.webp'
import houseGround from '@/assets/images/house/house_ground.webp'
import houseFoundation from '@/assets/images/house/house_foundation.webp'
import houseWalls from '@/assets/images/house/house_walls.webp'
import houseFraming from '@/assets/images/house/house_framing.webp'
import houseInterior from '@/assets/images/house/house_interior.webp'
import houseRoof from '@/assets/images/house/house_roof.webp'
import {
  LandingActiveItemNav,
  LandingFeaturePanel,
  LandingFeaturePanelBody,
  LandingFeaturePanelHeader,
  LandingImageSection,
  LandingItemGrid,
  LandingScriptureSectionHeader,
  LandingSectionContainer,
  LandingSectionOverlay,
} from '@/components/landing/primitives/primitives'
import { useCarousel } from '@/components/landing/hooks'

type CourseShowcaseItem = LandingShowcaseItem & {
  eyebrow: string
  lessons: [string, string, string]
  image: string
}

const courseShowcaseItems: Array<CourseShowcaseItem> = [
  {
    id: 'ground',
    number: '01',
    title: 'Ground',
    eyebrow: 'The Mercy of God, Salvation & the Life of Jesus',
    description:
      "Before anything is built, the ground must be prepared. God's mercy, salvation, and Jesus' life on earth.",
    lessons: ['The mercy of God', 'Salvation', 'The life of Jesus'],
    image: houseGround,
  },
  {
    id: 'foundation',
    number: '02',
    title: 'Foundation',
    eyebrow: 'The Foundation of the Believer',
    description:
      'Jesus came to turn people from sin to God. Faith (faithfulness) toward God. What it means to stand on Christ.',
    lessons: [
      'Build your life on Christ',
      'From sin to God',
      'Faith (faithfulness) toward God ',
    ],
    image: houseFoundation,
  },
  {
    id: 'walls',
    number: '03',
    title: 'Walls',
    eyebrow: 'The Death of Jesus',
    description:
      'How Jesus prepared his disciples for his death; how his life fulfilled OT prophecies. The cost and meaning of the cross.',
    lessons: [
      'The Death of Jesus',
      'OT Prophecy Fulfilled',
      'Preparing Disciples for the Cross',
    ],
    image: houseWalls,
  },
  {
    id: 'framing',
    number: '04',
    title: 'Framing',
    eyebrow: 'The Trinity — God, Jesus & the Holy Spirit',
    description:
      'The characteristics & nature of God; the work and mission of Jesus; building intimacy with the Holy Spirit and the fruits of the Spirit.',
    lessons: [
      'Nature of God',
      'Work of Jesus',
      'Intimacy with the Holy Spirit',
    ],
    image: houseFraming,
  },
  {
    id: 'interior',
    number: '05',
    title: 'Interior',
    eyebrow: 'Following Jesus: From encounter to transformation',
    description:
      'A personal case study based on Peter the disciple - from first encounter with Jesus to fully transformed character.',
    lessons: [
      "Peter's Encounter",
      'Following Jesus',
      'Character Transformation',
    ],
    image: houseInterior,
  },
  {
    id: 'roof',
    number: '06',
    title: 'Roof',
    eyebrow: 'Living the Christian Life in the Modern World',
    description:
      'Using biblical characters to show how believers live, understanding hardship, drawing out the nature of Jesus.',
    lessons: [
      'Living the Christian Life',
      'Biblical Characters',
      'Hardship & the Nature of Jesus',
    ],
    image: houseRoof,
  },
]

type CourseShowcaseSidebarProps = {
  activeCourse: CourseShowcaseItem
  activeIndex: number
  onSelect: (index: number) => void
  onPrevious: () => void
  onNext: () => void
}

function CourseGridItem({
  course,
  isActive,
}: {
  course: CourseShowcaseItem
  isActive: boolean
}) {
  return (
    <div>
      <div
        className={`text-[0.65rem] font-medium tracking-[0.28em] uppercase ${isActive ? 'text-[#D4B373]' : 'text-[#8A7B68]'}`}
      >
        {course.number}
      </div>
      <div
        className={`mt-2 font-serif text-xl ${isActive ? 'text-[#F8F4EC]' : 'text-[#F8F4EC]/70'}`}
      >
        {course.title}
      </div>
    </div>
  )
}

function CourseShowcaseSidebar({
  activeCourse,
  activeIndex,
  onSelect,
  onPrevious,
  onNext,
}: CourseShowcaseSidebarProps) {
  return (
    <div className="space-y-10 px-5 sm:px-0">
      <LandingScriptureSectionHeader
        eyebrowLabel="Curriculum Architecture"
        headline="Six courses"
        headlineMaxW="max-w-[12ch]"
        headlineColor="#F8F4EC"
        textColor="#CFC6B7"
        introText="Spiritual life should not stand upon a school of theology but upon Christ. It must be founded on a real revelation of the Son of God, full of grace and truth, revealed from heavenly places."
        scriptures={[
          {
            quote:
              'For every house is builded by some man; but he that built all things is God.',
            reference: 'Hebrews 3:4',
          },
        ]}
      />

      <LandingActiveItemNav
        label="Active course"
        activeValue={`${activeCourse.number}. ${activeCourse.title}`}
        onPrevious={onPrevious}
        onNext={onNext}
        borderColor="border-white/10"
        prevButtonClass="border-white/12 bg-white/6 text-[#F8F4EC] hover:border-[#C5A059]/50 hover:bg-white/10"
        nextButtonClass="border-[#C5A059]/35 bg-[#1C1C1D] text-[#E9D9B4] hover:border-[#D6B16E] hover:text-white"
      />

      <LandingItemGrid
        items={courseShowcaseItems}
        activeIndex={activeIndex}
        onSelect={onSelect}
        borderColor="border-white/10"
        bgColor="bg-white/3"
        activeBorderColor="border-[#C5A059]/42"
        activeBgColor="bg-white/8"
        arrowColor="text-[#8E816D]"
        activeArrowColor="text-[#E9D9B4]"
        renderItem={(course, _index, isActive) => (
          <CourseGridItem course={course} isActive={isActive} />
        )}
      />
    </div>
  )
}

function CoursePanelHero({ course }: { course: CourseShowcaseItem }) {
  return (
    <LandingFeaturePanelHeader backgroundImageUrl={graphiteBackground}>
      <div className="relative flex min-h-84 flex-col justify-between p-4 sm:p-8 lg:min-h-100">
        <div className="flex items-start justify-between gap-6">
          <div>
            <div className="text-[0.68rem] font-medium tracking-[0.3em] text-[#D4B373] uppercase">
              {course.eyebrow}
            </div>
            <div className="mt-3 font-serif text-[clamp(2.4rem,4vw,4rem)] leading-[0.94] tracking-[-0.045em] text-white">
              {course.title}
            </div>
          </div>
          <div className="border border-white/12 bg-black/18 px-4 py-3 text-[0.9rem] font-medium tracking-[0.26em] text-[#E9D9B4] uppercase">
            {course.number}
          </div>
        </div>

        <div className="max-w-60 border border-white/12 bg-black/24 px-4 py-4 shadow-[0_24px_40px_-30px_rgba(0,0,0,0.55)] backdrop-blur-sm">
          <img
            key={course.id}
            src={course.image}
            alt={course.title}
            className="animate-in fade-in h-full w-full object-cover duration-1500"
            loading="lazy"
          />
        </div>
      </div>
    </LandingFeaturePanelHeader>
  )
}

function CourseLessonAnchors({ lessons }: { lessons: Array<string> }) {
  return (
    <div>
      <div className="text-[0.68rem] font-medium tracking-[0.3em] text-[#8E816D] uppercase">
        Three lesson anchors
      </div>
      <div className="mt-4 space-y-3">
        {lessons.map((lesson, index) => (
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
  )
}

function CourseFeatureCard({ course }: { course: CourseShowcaseItem }) {
  return (
    <LandingFeaturePanel>
      <CoursePanelHero course={course} />

      <LandingFeaturePanelBody className="grid gap-8 px-4 py-5 sm:px-8 sm:py-8 lg:grid-cols-[minmax(0,1fr)_16rem]">
        <div>
          <div className="text-[0.68rem] font-medium tracking-[0.3em] text-[#8E816D] uppercase">
            Course description
          </div>
          <p className="mt-4 max-w-2xl text-base leading-8 text-[#D6CCBE] sm:text-lg">
            {course.description}
          </p>
        </div>

        <CourseLessonAnchors lessons={course.lessons} />
      </LandingFeaturePanelBody>

      <div className="mt-6 flex flex-col gap-5 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm leading-7 text-[#AFA28F]">
          Move through the six-course journey with the next and previous
          controls or select any course directly.
        </div>
        <div className="w-1/2" />
      </div>
    </LandingFeaturePanel>
  )
}

export function LandingCourseShowcase() {
  const { activeIndex, setActiveIndex, goToPrevious, goToNext } = useCarousel(
    courseShowcaseItems.length,
  )
  const activeCourse = courseShowcaseItems[activeIndex]

  return (
    <LandingImageSection
      id="courses"
      backgroundImageUrl={graphiteBackground}
      gradientFrom="rgba(10,10,11,0.9)"
      gradientTo="rgba(16,16,17,0.95)"
      className="border-b border-[#C5A059]/14 bg-[#121212] text-[#F8F4EC]"
    >
      <LandingSectionOverlay
        gradientPosition="top_left"
        gradientStop="28%"
        secondaryGradientFrom="rgba(255,255,255,0.06)"
        secondaryGradientPosition="bottom_right"
        linePosition="right"
      />

      <LandingSectionContainer className="px-0 py-18 sm:py-22 lg:py-24">
        <div className="grid items-start gap-14 lg:grid-cols-[minmax(0,0.85fr)_minmax(24rem,1.15fr)] lg:gap-20">
          <CourseShowcaseSidebar
            activeCourse={activeCourse}
            activeIndex={activeIndex}
            onSelect={setActiveIndex}
            onPrevious={goToPrevious}
            onNext={goToNext}
          />
          <CourseFeatureCard course={activeCourse} />
        </div>
      </LandingSectionContainer>
    </LandingImageSection>
  )
}
