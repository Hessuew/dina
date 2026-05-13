import type { LandingItemBase } from '@/components/landing/types'
import marksBackground from '@/assets/images/bg/bg_marks.webp'
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

type MarkItem = LandingItemBase & {
  title: string
  quote: string
  quote2?: string
  description: string
  example: string
}

const marks: Array<MarkItem> = [
  {
    id: 'miracles',
    title: 'Miracles',
    quote:
      '"If I do not the works of my Father, believe me not. But if I do, though ye believe not me, believe the works." John 10:37–38.',
    description:
      'The gospel is confirmed by the works of Christ. In the church, miracles and gifts of the Spirit manifest; it is a buffet in the heavenly places.',
    example:
      "I had COVID-19 and was worn out. Juhani asked me to place my hand on the sickness, and I put it on my throat, which was on fire. Then he commanded the virus to die and my body to recover. Soon I sat up, which I could not do before, went to eat, started to clean, and finally said, “I'm surely healed.”",
  },
  {
    id: 'signs',
    title: 'Signs',
    quote:
      '"For as Jonas was a sign unto the Ninevites, so shall also the Son of man be to this generation." Luke 11:30',
    description:
      'When the dove returned to Noah with a fresh olive leaf, it was a sign that the flood was ending. When the Holy Spirit is present, He brings fresh things from heaven as a sign of His activity.',
    example:
      '“The Holy Spirit is here, continue praying!” People continued praying. Two began to laugh uncontrollably, one man fell to the ground, and some cried. The scene settled after 15 minutes, and the man rose from the ground after 1.5 hours. God moved powerfully. We asked the man what happened to him, and he said, “God renewed my call.”',
  },
  {
    id: 'wonders',
    title: 'Wonders',
    quote:
      '"And immediately he arose, took up the bed, and went forth before them all; insomuch that they were all amazed, and glorified God, saying, We never saw it on this fashion." Mark 2:12',
    description:
      'Wonders bring glory to God. Hallelujah! They make even doubters see that God is at work.',
    example:
      'While preaching, M started to shake under the power of God. “God, show more power!” M smashed to the ground, and the benches scattered. “Do you know God can put you over a country?” The power of God came upon M again, and she started to run like Elijah.',
  },
  {
    id: 'doctrine',
    title: 'Doctrine',
    quote:
      '"Jesus answered them, and said, My doctrine is not mine, but his that sent me. If any man will do his will, he shall know of the doctrine, whether it be of God, or whether I speak of myself." John 7:16-17',
    description:
      'Line-by-line doctrine, guided by the Holy Spirit, makes people strong. Genuine Bible study reveals mysteries.',
    example:
      'We have been studying the same verse in the Bible for two years, and we are still uncovering new insights. This is perhaps the fifth side journey we’ve taken along the way, yet each revelation has profoundly deepened and solidified our understanding.',
  },
  {
    id: 'revelation',
    title: 'Revelation',
    quote:
      '"It is not expedient for me doubtless to glory. I will come to visions and revelations of the Lord." 2 Cor 12:1',
    quote2:
      '"But I certify you, brethren, that the gospel which was preached of me is not after man. For I neither received it of man, neither was I taught it, but by the revelation of Jesus Christ." Galatians 1:11-12',
    description: '',
    example:
      "When a revelation comes from heaven, you will know it. Before that moment, it may seem dull, even if it is indeed the word and correct. But then, oh, it’s as if the heavens open, and you find yourself savoring oven-hot, fresh manna from heaven's bakery in the morning dew.",
  },
]

export function LandingMarksSection() {
  const { activeIndex, goToPrevious, goToNext } = useCarousel(marks.length)
  const activeMark = marks[activeIndex]

  return (
    <LandingImageSection
      id="marks"
      backgroundImageUrl={marksBackground}
      gradientFrom="rgba(10,10,11,0.9)"
      gradientTo="rgba(16,16,17,0.95)"
      className="min-h-screen border-b border-[#C5A059]/14 text-[#F7F4EE]"
    >
      <LandingSectionOverlay
        secondaryGradientFrom="rgba(255,255,255,0.06)"
        linePosition="right"
      />

      <LandingSectionContainer className="px-0 py-18 sm:py-22 lg:py-24">
        <div className="grid items-start gap-14 lg:grid-cols-[minmax(0,0.88fr)_minmax(24rem,1.12fr)] lg:gap-20">
          <div className="space-y-10 px-5 sm:px-0">
            <LandingScriptureSectionHeader
              eyebrowLabel="Presence of God"
              eyebrowTopLineCount={2}
              headline="Apostolic confirmations"
              headlineMaxW="max-w-[14ch]"
              headlineColor="#F8F4EC"
              textColor="#D3CAC0"
              scriptures={[
                {
                  quote:
                    'Ye men of Israel, hear these words; Jesus of Nazareth, a man approved of God among you by miracles and wonders and signs, which God did by him in the midst of you, as ye yourselves also know',
                  reference: 'Acts 2:22',
                },
              ]}
            />

            <LandingActiveItemNav
              label="Active mark"
              activeValue={activeMark.title}
              onPrevious={goToPrevious}
              onNext={goToNext}
              borderColor="border-white/10"
              prevButtonClass="border-white/12 bg-white/6 text-[#F8F4EC] hover:border-[#C5A059]/50 hover:bg-white/10"
              nextButtonClass="border-[#C5A059]/35 bg-[#1A1716] text-[#E9D9B4] hover:border-[#D6B16E] hover:text-white"
              labelColor="text-[#9B8A73]"
            />
          </div>

          <LandingFeaturePanel key={activeMark.id}>
            <LandingFeaturePanelHeader backgroundImageUrl={marksBackground}>
              <div className="relative min-h-84 space-y-8 p-4 sm:p-8 lg:h-100">
                <div>
                  <div className="text-[0.68rem] font-medium tracking-[0.3em] text-[#D4B373] uppercase">
                    Mark {activeIndex + 1} of {marks.length}
                  </div>
                  <div
                    className="animate-[fadeInSlideRight_0.7s_ease-out_forwards] opacity-0"
                    style={{ animationDelay: '0.1s' }}
                  >
                    <h3 className="mt-3 max-w-[12ch] font-serif text-[clamp(2.4rem,4vw,4rem)] leading-[0.94] tracking-[-0.045em] text-white">
                      {activeMark.title}
                    </h3>
                  </div>
                </div>

                <p
                  className="mt-4 max-w-2xl animate-[fadeInSlideRight_0.7s_ease-out_forwards] text-base leading-8 text-[#D6CCBE] opacity-0 sm:text-lg"
                  style={{ animationDelay: '0.3s' }}
                >
                  {activeMark.quote}
                </p>
                {activeMark.quote2 && (
                  <p
                    className="mt-4 max-w-2xl animate-[fadeInSlideRight_0.7s_ease-out_forwards] text-base leading-8 text-[#D6CCBE] opacity-0 sm:text-lg"
                    style={{ animationDelay: '0.3s' }}
                  >
                    {activeMark.quote2}
                  </p>
                )}

                <p
                  className="mt-4 max-w-2xl animate-[fadeInSlideRight_0.7s_ease-out_forwards] text-base leading-8 text-[#D6CCBE] opacity-0 sm:text-lg"
                  style={{ animationDelay: '0.3s' }}
                >
                  {activeMark.description}
                </p>
              </div>
            </LandingFeaturePanelHeader>

            <LandingFeaturePanelBody className="px-4 py-5 sm:px-8 sm:py-8">
              {activeMark.example && (
                <div
                  className="animate-[fadeInSlideRight_0.7s_ease-out_forwards] opacity-0"
                  style={{ animationDelay: '0.5s' }}
                >
                  <div className="mt-6 text-[0.68rem] font-medium tracking-[0.3em] text-[#8E816D] uppercase">
                    Testimony
                  </div>
                  <p className="mt-4 max-w-2xl text-base leading-8 text-[#D6CCBE] italic sm:text-lg">
                    {activeMark.example}
                  </p>
                </div>
              )}
            </LandingFeaturePanelBody>
          </LandingFeaturePanel>
        </div>
      </LandingSectionContainer>
    </LandingImageSection>
  )
}
