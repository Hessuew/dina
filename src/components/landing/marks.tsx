import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import marksBackground from '@/assets/images/bg6_v1.png'

type MarkItem = {
  id: string
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
  const [activeIndex, setActiveIndex] = useState(0)
  const activeMark = marks[activeIndex]

  const goToPrevious = () => {
    setActiveIndex((currentIndex) =>
      currentIndex === 0 ? marks.length - 1 : currentIndex - 1,
    )
  }

  const goToNext = () => {
    setActiveIndex((currentIndex) =>
      currentIndex === marks.length - 1 ? 0 : currentIndex + 1,
    )
  }

  return (
    <section
      id="marks"
      className="relative isolate min-h-screen overflow-hidden border-b border-[#C5A059]/14 text-[#F7F4EE]"
      style={{
        backgroundImage: `linear-gradient(180deg, rgba(10,10,11,0.9), rgba(16,16,17,0.95)), url(${marksBackground})`,
        backgroundPosition: 'center',
        backgroundSize: 'cover',
      }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(197,160,89,0.14),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.06),transparent_22%)]" />
      <div className="absolute right-[8%] bottom-24 h-px w-16 bg-white/12 lg:w-24" />

      <div className="relative mx-auto max-w-[calc(100%-2rem)] px-5 py-18 sm:max-w-[calc(100%-4rem)] sm:px-8 sm:py-22 lg:max-w-[calc(100%-8rem)] lg:px-12 lg:py-24">
        <div className="grid items-start gap-14 lg:grid-cols-[minmax(0,0.88fr)_minmax(24rem,1.12fr)] lg:gap-20">
          <div className="space-y-10">
            <div className="space-y-6">
              <div className="inline-flex flex-col gap-2 text-[0.72rem] font-medium tracking-[0.3em] text-[#9B7A41] uppercase">
                <div className="mb-2 h-px w-20 bg-[#C5A059]/50 lg:w-28" />
                <div className="h-px w-20 bg-[#C5A059]/50 lg:w-28" />
                <div className="flex flex-row items-center gap-3">
                  <span className="h-px w-10 bg-[#C5A059]/55" />
                  Presence of God
                </div>
              </div>

              <h2 className="max-w-[14ch] font-serif text-[clamp(3rem,5vw,5.1rem)] leading-[0.92] tracking-[-0.055em] text-[#F8F4EC]">
                Apostolic confirmations
              </h2>

              <p className="max-w-xl text-base leading-8 font-light tracking-[0.04em] text-[#D3CAC0] sm:text-lg">
                "Ye men of Israel, hear these words; Jesus of Nazareth, a man
                approved of God among you by miracles and wonders and signs,
                which God did by him in the midst of you, as ye yourselves also
                know" Acts 2:22
              </p>
            </div>

            <div className="flex items-center justify-between gap-6 border-y border-white/10 py-5">
              <div>
                <div className="text-[0.68rem] font-medium tracking-[0.3em] text-[#9B8A73] uppercase">
                  Active mark
                </div>
                <div className="mt-2 font-serif text-2xl text-[#F8F4EC]">
                  {activeMark.title}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={goToPrevious}
                  className="inline-flex h-12 w-12 items-center justify-center border border-white/12 bg-white/6 text-[#F8F4EC] transition-all hover:-translate-y-0.5 hover:border-[#C5A059]/50 hover:bg-white/10"
                  aria-label="Show previous mark"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={goToNext}
                  className="inline-flex h-12 w-12 items-center justify-center border border-[#C5A059]/35 bg-[#1A1716] text-[#E9D9B4] transition-all hover:-translate-y-0.5 hover:border-[#D6B16E] hover:text-white"
                  aria-label="Show next mark"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          <div
            key={activeMark.id}
            className="relative border border-white/10 bg-[#171717]/72 p-4 shadow-[0_42px_100px_-52px_rgba(0,0,0,0.82)] backdrop-blur-sm sm:p-6"
          >
            <div
              className="relative overflow-hidden border border-white/10"
              style={{
                backgroundImage: `linear-gradient(180deg, rgba(7,7,8,0.26), rgba(7,7,8,0.72)), url(${marksBackground})`,
                backgroundPosition: 'center',
                backgroundSize: 'cover',
              }}
            >
              <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.12),transparent_38%,rgba(197,160,89,0.14)_100%)]" />
              <div className="relative min-h-84 space-y-8 p-6 sm:p-8 lg:h-100">
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
            </div>

            <div className="border-x border-b border-white/10 bg-[#151515]/88 px-6 py-7 sm:px-8 sm:py-8">
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
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
