import type { LandingItemBase } from '@/components/landing/types'
import testimonialBackground from '@/assets/images/bg/bg_testimonials.webp'
import {
  LandingActiveItemNav,
  LandingImageSection,
  LandingSectionContainer,
  LandingSectionEyebrowCentered,
} from '@/components/landing/primitives/primitives'
import { useCarousel } from '@/components/landing/hooks'

type TestimonialItem = LandingItemBase & {
  name: string
  role: string
  quote: string
  theme: string
}

const testimonials: Array<TestimonialItem> = [
  {
    id: 'andrew-a',
    name: 'Andrew A.',
    role: 'Apostle, Professor',
    quote:
      'Jesus Christ discipled me Himself during my “Arabia peninsula” experience for three years, and He conducted a “graduation ceremony” for me personally. In the last twenty years I have discipled scores of believers, in the strength of my encounters, to experience the same Jesus. My disciples are now demonstrating supernatural signs and wonders globally.',
    theme: 'Ground',
  },
  {
    id: 'ella',
    name: 'Ella O.',
    role: 'Pastor, -',
    quote:
      'Discipleship has been instrumental in my walk with God and relationship with people. Through discipleship, I further learn what love is. LOVE: Let Others Verify Experientially. Discipleship shows me what 2nd Corinthians 3:18 says and inspires me to emulate it. My discipleship journey has been one of growth and clarity. I have gotten scripture based answers to concerns which has taught me to search the scriptures for guidance in all walks of life.',
    theme: 'Ground',
  },
  {
    id: 'juhani-j',
    name: 'Juhani J.',
    role: 'Bishop, Programmer',
    quote:
      'Being discipled by my dear brother has changed me irreversibly for the rest of my life. Weight in the spirit matters. Now, carrying a heavy measure of what I have received, I am giving it to others. My dear disciples have become prayer warriors, staying in the cave of Adullam through 5–12 prayer meetings and enjoying them.',
    theme: 'Foundation',
  },
  {
    id: 'akosua-o',
    name: 'Akosua O.',
    role: 'Pastor, Junior programmer',
    quote:
      'Through discipleship, I have experienced significant growth in my faith. It has deepened my knowledge of the Bible, strengthened my spiritual understanding, and equipped me with practical tools to live a spiritually grounded life. Additionally, through discipleship, I have gained wisdom that I would not have acquired otherwise.',
    theme: 'Foundation',
  },
  {
    id: 'emmanuel-e',
    name: 'Emmanuel E.',
    role: 'Pastor, -',
    quote:
      'Over the years, following Christ in the school of discipleship has continually been transforming me to become more like Christ. The Holy Spirit is accomplishing this work in my life, both personally and through men full of the Holy Spirit who also follow Christ.',
    theme: 'Walls',
  },
  {
    id: 'ezinne',
    name: 'Ezinne O.',
    role: 'Pastor, -',
    quote:
      'Discipleship has rooted me in the Word of God. It builds and guides me with God, at work, and in daily life. I receive scripture-based answers to difficult questions, reminders of God’s love and care, and are built to serve Jesus wholeheartedly. Through discipleship, I learn the in-depth Word of God, how to apply it daily, and gain structure for personal and spiritual growth. It is a light in my life I feel incredibly privileged to have.',
    theme: 'Walls',
  },
  {
    id: 'nonso',
    name: 'Nonso',
    role: 'Pastor, -',
    quote:
      'Discipleship was primarily instrumental to my encounter with the reality of the person of the Holy Spirit, who carried me into the fellowship of his fullness. My personal walk with the Lord which hitherto was routine, usual and uneventful became a flaming and exciting daily walk of love and faith in ever increasing strides.',
    theme: 'Framing',
  },
  {
    id: 'sade',
    name: 'Sade P.',
    role: 'Pastor, -',
    quote:
      'My journey of discipleship is rooted in God’s grace! Discipleship has helped me to live intentionally and with purpose for Christ. It came to me at a point in my life where I had no direction and all hope seemed lost. Now I seek to live out Christ’s love daily, growing in faith and guiding others toward purpose and truth.',
    theme: 'Framing',
  },
  // {
  //   id: 'blessing',
  //   name: 'Blessing A.',
  //   role: 'Pastor, -',
  //   quote:
  //     'Raised in a Christian home and active in church from a young age, I later came to a personal surrender to God through His mercy at a crusade. My discipleship journey continues by His grace as I grow in faith, serve in youth ministry, and participate in evangelism. I desire to help others discover their identity, draw closer to God, and experience wholeness in every area of life.',
  //   theme: 'Framing',
  // },
  {
    id: 'kene',
    name: 'Kene O.',
    role: 'Pastor, -',
    quote:
      'I am blessed to be discipled by the Holy Spirit. Through His guidance, I am connected to people of faith who have helped shape and sharpen my walk with God. Discipleship is teaching me to deny self, take up my cross, and follow Jesus Christ in word and action, sharing the gospel with respect and love, while growing in understanding and knowledge of God’s Word and love.',
    theme: 'Covering',
  },
  {
    id: 'mahi',
    name: 'Mahidere A.',
    role: 'Pastor, -',
    quote:
      'God provided disciplers for me from this very team, where I was built up and grew in Christ. Many single sessions marked by encounters with the power, wisdom, and comfort of the Holy Spirit have saved me from great crises. The right discipler aids you to rightly position yourself with Jesus Christ.',
    theme: 'Covering',
  },
  {
    id: 'obi',
    name: 'Obi C.',
    role: 'Pastor, -',
    quote:
      'Discipleship has been a refining journey through God’s Word, the Holy Spirit, and fellowship with other believers. It has helped me grow beyond religiosity into a more purposeful and assured walk with God. Through it, I am learning what it means to live according to God’s Word and purpose, finding greater clarity, joy, and direction. My desire is to share that same hope and purpose with others through the way I live, serve, and relate to them.  ',
    theme: 'Rooftop',
  },
  {
    id: 'ugo',
    name: 'Ugo O.',
    role: 'Pastor, -',
    quote:
      'My discipleship story mirrors the prodigal son — turning away from the matchless love of Christ and humbly returning to the only place where true joy, peace, and love are found. I am forever grateful to have been discipled back into the body of Christ. To be part of His kingdom of priests is a privilege, and to have the pleasure of discipling others into that same freedom and fullness is an honor.',
    theme: 'Rooftop',
  },
]

function getRelativeOffset(activeIndex: number, itemIndex: number): number {
  const totalItems = testimonials.length
  let offset = itemIndex - activeIndex

  if (offset > totalItems / 2) {
    offset -= totalItems
  } else if (offset < -totalItems / 2) {
    offset += totalItems
  }

  return offset
}

function getCardMotionStyle(offset: number) {
  const absOffset = Math.abs(offset)
  const direction = offset > 0 ? 1 : -1

  if (absOffset === 0) {
    return {
      transform: 'translateX(-50%) translateY(0) scale(1)',
      opacity: 1,
      zIndex: 30,
      filter: 'blur(0px)',
    }
  }

  if (absOffset === 1) {
    return {
      transform: `translateX(calc(-50% + ${direction * 62}%)) translateY(4%) scale(0.92)`,
      opacity: 0.72,
      zIndex: 20,
      filter: 'blur(0.5px)',
    }
  }

  if (absOffset === 2) {
    return {
      transform: `translateX(calc(-50% + ${direction * 88}%)) translateY(6%) scale(0.84)`,
      opacity: 0.32,
      zIndex: 10,
      filter: 'blur(1.5px)',
    }
  }

  return {
    transform: `translateX(calc(-50% + ${direction * 100}%)) translateY(8%) scale(0.76)`,
    opacity: 0,
    zIndex: 0,
    filter: 'blur(3px)',
  }
}

export function LandingTestimonialsSection() {
  const { activeIndex, setActiveIndex, goToPrevious, goToNext } = useCarousel(
    testimonials.length,
  )

  return (
    <LandingImageSection
      id="testimonials"
      backgroundImageUrl={testimonialBackground}
      gradientFrom="rgba(14,13,17,0.922)"
      gradientTo="rgba(10,10,12,0.97)"
      className="border-b border-[#C5A059]/14 text-[#F7F4EE]"
    >
      <LandingSectionContainer className="py-18 sm:py-22 lg:py-28">
        <div className="space-y-16">
          <div className="mx-auto max-w-3xl space-y-8 text-center">
            <LandingSectionEyebrowCentered label="Formation of pillars" />

            <h2 className="font-serif text-[clamp(3.2rem,6vw,5.5rem)] leading-[0.9] tracking-[-0.055em] text-white">
              Experiences
            </h2>

            <blockquote className="text-[0.6rem] font-medium tracking-[0.3em] text-[#D4B373] italic">
              "And when James, Cephas, and John, who seemed to be pillars"
            </blockquote>

            <LandingActiveItemNav
              label="Testimony"
              activeValue={`${activeIndex + 1} / ${testimonials.length}`}
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

          <div className="space-y-8">
            <div className="relative h-104 overflow-hidden sm:h-108 lg:h-116">
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
                    className={`absolute top-0 left-1/2 flex h-full w-76 flex-col justify-between overflow-hidden border px-4 py-5 text-left shadow-[0_34px_72px_-44px_rgba(0,0,0,0.72)] backdrop-blur-sm transition-[transform,opacity,filter,background-color,border-color] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] sm:w-92 lg:w-116 lg:px-6 lg:py-7 xl:w-124 ${
                      isFocused
                        ? 'cursor-default border-[#C5A059]/50 bg-[#0F0D0C]/92'
                        : 'cursor-pointer border-[#C5A059]/20 bg-black/60 hover:border-[#C5A059]/35 hover:bg-black/75'
                    }`}
                    style={getCardMotionStyle(offset)}
                  >
                    <div className="relative flex min-h-full flex-col justify-between gap-2 lg:gap-4">
                      <div className="space-y-2 md:space-y-6">
                        <div className="inline-flex items-center gap-3 text-[0.6rem] font-medium tracking-[0.3em] text-[#D4B373] uppercase">
                          <span className="h-px w-6 bg-[#C5A059]/45" />
                          {item.theme}
                        </div>

                        <blockquote className="font-serif text-base text-[0.9rem] leading-[1.6] text-white md:text-[1rem] lg:text-[1.1rem] xl:text-[1.2rem]">
                          "{item.quote}"
                        </blockquote>
                      </div>

                      <div className="border-t border-white/8 pt-2 lg:pt-6">
                        <div className="text-[0.62rem] font-medium tracking-[0.3em] text-[#9B8A73] uppercase">
                          Testimony
                        </div>
                        <div className="pt-2 font-serif text-[1.3rem] text-white">
                          {item.name}
                        </div>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>

            <div className="flex flex-col items-center gap-3">
              <div className="flex flex-wrap items-center justify-center gap-2">
                {testimonials
                  .slice(0, Math.ceil(testimonials.length / 2))
                  .map((item, index) => (
                    <button
                      key={`indicator-${item.id}`}
                      type="button"
                      onClick={() => setActiveIndex(index)}
                      aria-label={`Show testimony from ${item.name}`}
                      className={`border px-3 py-1.5 text-[0.65rem] font-medium tracking-[0.28em] uppercase transition-all duration-500 ease-out ${
                        index === activeIndex
                          ? 'border-[#C5A059]/42 bg-white/8 text-[#D4B373] shadow-[0_24px_44px_-34px_rgba(0,0,0,0.6)]'
                          : 'border-white/10 bg-white/3 text-[#8E816D] hover:border-white/18 hover:bg-white/5'
                      }`}
                    >
                      {item.name}
                    </button>
                  ))}
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2">
                {testimonials
                  .slice(Math.ceil(testimonials.length / 2))
                  .map((item, index) => {
                    const actualIndex =
                      index + Math.ceil(testimonials.length / 2)
                    return (
                      <button
                        key={`indicator-${item.id}`}
                        type="button"
                        onClick={() => setActiveIndex(actualIndex)}
                        aria-label={`Show testimony from ${item.name}`}
                        className={`border px-3 py-1.5 text-[0.65rem] font-medium tracking-[0.28em] uppercase transition-all duration-500 ease-out ${
                          actualIndex === activeIndex
                            ? 'border-[#C5A059]/42 bg-white/8 text-[#D4B373] shadow-[0_24px_44px_-34px_rgba(0,0,0,0.6)]'
                            : 'border-white/10 bg-white/3 text-[#8E816D] hover:border-white/18 hover:bg-white/5'
                        }`}
                      >
                        {item.name}
                      </button>
                    )
                  })}
              </div>
            </div>

            <div className="text-end">
              <blockquote className="text-[0.6rem] font-medium tracking-[0.3em] text-[#D4B373] italic">
                "Make disciples of all nations"
              </blockquote>
            </div>
          </div>
        </div>
      </LandingSectionContainer>
    </LandingImageSection>
  )
}
