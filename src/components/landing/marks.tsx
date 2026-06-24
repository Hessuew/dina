import { useState } from 'react'
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
} from '@/components/landing/primitives/primitives'
import { useCarousel } from '@/components/landing/hooks'

type MarkItem = LandingItemBase & {
  title: string
  quote: string
  quote2?: string
  description: string
  example: string
  videoUrl?: string
}

const marks: Array<MarkItem> = [
  {
    id: 'miracle-1-stammering',
    title: 'Miracles (1)',
    quote:
      '"Now we know that God heareth not sinners: but if any man be a worshipper of God, and doeth his will, him he heareth. Since the world began was it not heard that any man opened the eyes of one that was born blind." Joh 9:31, 32',
    description: '',
    example: '',
    videoUrl: 'https://www.youtube.com/embed/Z1J0yjSdiVY',
  },
  {
    id: 'miracle-2-lung',
    title: 'Miracles (2)',
    quote:
      '"(As it is written, I have made thee a father of many nations,) before him whom he believed, even God, who quickeneth the dead, and calleth those things which be not as though they were." Rom 4:17',
    description: '',
    example: `30-year-long tobacco smoke-induced lung disease supernaturally re-created with a new lung in April 2026 after being slain under the Holy Spirit power for two consecutive days. She could never run without getting out of breath, but her friends were amazed and asked, “How is it possible that you're running and talking on the phone?”`,
  },
  {
    id: 'healing-covid',
    title: 'Healing',
    quote:
      '"If I do not the works of my Father, believe me not. But if I do, though ye believe not me, believe the works." John 10:37–38.',
    description:
      'The gospel is confirmed by the works of Christ. In the church, miracles and gifts of the Spirit manifest; it is a buffet in the heavenly places.',
    example:
      "I had COVID-19 and was worn out. Juhani asked me to place my hand on the sickness, and I put it on my throat, which was on fire. Then he commanded the virus to die and my body to recover. Soon I sat up, which I could not do before, went to eat, started to clean, and finally said, “I'm surely healed.”",
  },
  {
    id: 'deliverance-demons',
    title: 'Deliverance',
    quote:
      '"Now when the sun was setting, all they that had any sick with divers diseases brought them unto him; and he laid his hands on every one of them, and healed them. And devils also came out of many, crying out, and saying, Thou art Christ the Son of God. And he rebuking them suffered them not to speak: for they knew that he was Christ." Luke 4:40, 41',
    description: '',
    example: '',
    videoUrl: 'https://www.youtube.com/embed/w320cJTEXcE',
  },
  {
    id: 'repentance-restoration',
    title: 'Repentance, and Revival',
    quote:
      '"If my people, which are called by my name, shall humble themselves, and pray, and seek my face, and turn from their wicked ways; then will I hear from heaven, and will forgive their sin, and will heal their land." 2 Cro 7:14',
    description: '',
    example: '',
    videoUrl: 'https://www.youtube.com/embed/7qs0gvMAJOE',
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
  {
    id: 'psalm',
    title: 'Psalm and Spiritual Song',
    quote:
      '"And be not drunk with wine, wherein is excess; but be filled with the Spirit; Speaking to yourselves in psalms and hymns and spiritual songs, singing and making melody in your heart to the Lord;" Eph 5:19',
    description: '',
    example: '',
    videoUrl: 'https://www.youtube.com/embed/QOwyaJwklX4',
  },
  {
    id: 'prophecy',
    title: 'Prophecy',
    quote:
      '"But he that prophesieth speaketh unto men to edification, and exhortation, and comfort ... I would that ye all spake with tongues but rather that ye prophesied: for greater is he that prophesieth than he that speaketh with tongues, except he interpret, that the church may receive edifying." 1 Cor 14:3,5',
    description: '',
    example: '',
    videoUrl: 'https://www.youtube.com/embed/IrNlv4G71Eg',
  },
  {
    id: 'tongue',
    title: 'Tongue and Interpretation',
    quote:
      '"Even so ye, forasmuch as ye are zealous of spiritual gifts, seek that ye may excel to the edifying of the church. Wherefore let him that speaketh in an unknown tongue pray that he may interpret." 1 Cor 14:12,13',
    description: '',
    example: '',
    videoUrl: 'https://www.youtube.com/embed/ak7HZrWZ0mE',
  },
]

function YouTubeFacade({
  embedUrl,
  title,
}: {
  embedUrl: string
  title: string
}) {
  const [activated, setActivated] = useState(false)
  const videoId = embedUrl.split('/').pop()?.split('?')[0] ?? ''

  if (activated) {
    return (
      <div className="aspect-video w-full">
        <iframe
          src={`${embedUrl}?autoplay=1`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="h-full w-full"
        />
      </div>
    )
  }

  return (
    <div
      className="group relative aspect-video w-full cursor-pointer"
      onClick={() => setActivated(true)}
      onKeyDown={(e) =>
        (e.key === 'Enter' || e.key === ' ') && setActivated(true)
      }
      role="button"
      tabIndex={0}
      aria-label={`Play ${title}`}
    >
      <img
        src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`}
        alt={title}
        className="h-full w-full object-cover"
        loading="lazy"
      />
      <div className="absolute inset-0 bg-black/30 transition-colors group-hover:bg-black/20" />
      <div className="absolute inset-0 flex items-center justify-center">
        <svg
          viewBox="0 0 68 48"
          className="h-12 w-17 transition-opacity group-hover:opacity-80"
          aria-hidden="true"
        >
          <path
            d="M66.52 7.74c-.78-2.93-2.49-5.41-5.42-6.19C55.79.13 34 0 34 0S12.21.13 6.9 1.55c-2.93.78-4.63 3.26-5.42 6.19C.06 13.05 0 24 0 24s.06 10.95 1.48 16.26c.78 2.93 2.49 5.41 5.42 6.19C12.21 47.87 34 48 34 48s21.79-.13 27.1-1.55c2.93-.78 4.63-3.26 5.42-6.19C67.94 34.95 68 24 68 24s-.06-10.95-1.48-16.26z"
            fill="#f00"
          />
          <path d="M45 24 27 14v20" fill="#fff" />
        </svg>
      </div>
    </div>
  )
}

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
              <div className="relative h-104 space-y-8 overflow-hidden p-4 sm:h-96 sm:p-8 lg:h-100">
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

            <LandingFeaturePanelBody className="h-88 px-4 py-5 sm:px-8 sm:py-8 lg:h-88">
              {activeMark.videoUrl ? (
                <div
                  className="animate-[fadeInSlideRight_0.7s_ease-out_forwards] opacity-0"
                  style={{ animationDelay: '0.5s' }}
                >
                  <YouTubeFacade
                    embedUrl={activeMark.videoUrl}
                    title={activeMark.title}
                  />
                </div>
              ) : activeMark.example ? (
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
              ) : null}
            </LandingFeaturePanelBody>
          </LandingFeaturePanel>
        </div>
      </LandingSectionContainer>
    </LandingImageSection>
  )
}
