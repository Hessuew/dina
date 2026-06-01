import { ArrowRight } from 'lucide-react'
import type { ReactNode } from 'react'
import marbleTexture from '@/assets/images/bg/bg_hero.webp'
import {
  LandingImageSection,
  LandingScriptureSectionHeader,
  LandingSectionContainer,
  LandingSectionOverlay,
} from '@/components/landing/primitives'

type QAItem = {
  id: string
  question: string
  answer: string | ReactNode
}

const qaItems: Array<QAItem> = [
  {
    id: 'why-join',
    question: 'Why should I join?',
    answer:
      'The body of Christ appears to lack depth, maturity, expected spiritual growth, and genuine, life-transforming encounters with God. If you seek to truly experience what Christianity is meant to be, DINA will help you.',
  },
  {
    id: 'enrollment',
    question: 'How do I enroll in to the Discipleship Training School?',
    answer:
      'Enrollment opens each spring for the June intake. Prospective students submit an application form and participate in a brief interview to ensure alignment with the program’s vision and level of commitment.',
  },
  {
    id: 'prerequisites',
    question: 'Are there any prerequisites or requirements to join?',
    answer:
      'No formal theological education is required. We welcome all believers who have a genuine hunger for Jesus, growth, willingness to be formed, and commitment to the 9-month journey. A heart posture of humility and teachability matters more than prior knowledge.',
  },
  {
    id: 'time-commitment',
    question: 'What is the weekly time commitment?',
    answer:
      'Students attend three 2-hour classes per month, plus biweekly personal discipleship sessions (1–2 hours each). Additional time is needed for reading, assignments, and discipling at least one person throughout the program. Most students dedicate 4–7 hours per week.',
  },
  {
    id: 'location',
    question: 'Is the program in-person or online?',
    answer:
      'The Discipleship Training School is conducted online. Lessons are held in dedicated Zoom meetings, and personal discipleship sessions are arranged individually with mentors.',
  },
  {
    id: 'outcomes',
    question: 'What can I expect after completing the program?',
    answer:
      'Graduates are equipped with spiritual blessings from heavenly places, biblical foundations, character formation, and practical discipleship skills. Having experienced multiple revelations from heaven, their lives will never be the same.',
  },
  {
    id: 'affiliated-ministry',
    question: 'What ministry is DINA affiliated with?',
    answer: (
      <>
        Flame the Freeze:{' '}
        <a
          href="https://flamethefreeze.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#C5A059] hover:underline"
        >
          flamethefreeze.com
        </a>
        <br />
        Prayer Church Finland:{' '}
        <a
          href="https://rukouksenseurakunta.fi/en/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#C5A059] hover:underline"
        >
          rukouksenseurakunta.fi/en/
        </a>
      </>
    ),
  },
  {
    id: 'online-meetings',
    question: 'Do you have an online weekly church meeting I can join?',
    answer: (
      <>
        Yes, an alternate bi-weekly Saturday bible study or prayer meetings via
        Zoom at 4pm (16:00) UK time. Bible study lasts 4 to 5 hours, while
        prayer meetings last 5 to 12 hours.
        <br />
        Prayer meeting:{' '}
        <a
          href="https://flamethefreeze.zoom.us/j/82297139976?pwd=706512"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#C5A059] hover:underline"
        >
          Join Zoom
        </a>
        <br />
        Bible study:{' '}
        <a
          href="https://flamethefreeze.zoom.us/j/89840579351?pwd=983643"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#C5A059] hover:underline"
        >
          Join Zoom
        </a>
      </>
    ),
  },
  {
    id: 'reading-materials',
    question: 'Do you have reading materials to increase my faith in God?',
    answer: (
      <>
        Yes, here is a free copy of Flame the Freeze ebook of recorded miracles,
        healing and deliverances:{' '}
        <a
          href="https://drive.google.com/file/d/1D5npgHt176KLtaEir-OE61LcndzssEjp/view"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#C5A059] hover:underline"
        >
          Download ebook
        </a>
        <br />
        Other book that can be purchased online is Operation Fraso Leon, which
        is focused on being victorious in life's battles:{' '}
        <a
          href="https://www.amazon.com/Operation-Fraso-Leon-Andrew-Agbaje/dp/1916801315"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#C5A059] hover:underline"
        >
          Amazon
        </a>
      </>
    ),
  },
  {
    id: 'sermons',
    question: 'Are there sermons I can listen to?',
    answer: (
      <>
        Yes, kindly visit Flame the Freeze YouTube page for heavenly-baked
        revelations and encounters:{' '}
        <a
          href="https://www.youtube.com/@flamethefreeze2613/playlists"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#C5A059] hover:underline"
        >
          YouTube playlists
        </a>
      </>
    ),
  },
]

export function LandingQASection() {
  return (
    <LandingImageSection
      backgroundImageUrl={marbleTexture}
      gradientFrom="rgba(247,244,238,0.96)"
      gradientTo="rgba(247,244,238,0.98)"
      className="border-b border-[#C5A059]/14"
    >
      <LandingSectionOverlay
        gradientFrom="rgba(197,160,89,0.08)"
        gradientStop="40%"
      />

      <LandingSectionContainer className="py-18 sm:py-22 lg:py-24">
        <div className="mx-auto max-w-6xl space-y-14">
          <LandingScriptureSectionHeader
            eyebrowLabel="Questions & Answers"
            eyebrowAlign="center"
            headline="Frequently Asked Questions"
            headlineMaxW="max-w-3xl"
            headlineColor="#1A1A1A"
            textColor="#4E463D"
            introText="What you should know about the Discipleship Training School program, enrollment, and what to expect."
            className="flex flex-col items-center text-center"
          />

          <div className="space-y-8">
            {qaItems.map((item, index) => (
              <div
                key={item.id}
                className="grid items-start gap-6 border-b border-[#C5A059]/20 pb-8 last:border-b-0 last:pb-0 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1.2fr)] lg:gap-8"
              >
                <div className="space-y-3">
                  <div className="text-[0.68rem] font-medium tracking-[0.3em] text-[#9B7A41] uppercase">
                    Question {index + 1}
                  </div>
                  <h3 className="font-serif text-[clamp(1.3rem,2.5vw,1.6rem)] leading-[1.3] tracking-[-0.02em] text-[#1A1A1A]">
                    {item.question}
                  </h3>
                </div>

                <div className="hidden items-center justify-center lg:flex">
                  <ArrowRight className="h-5 w-5 text-[#C5A059]" />
                </div>

                <div className="space-y-3">
                  <div className="text-[0.68rem] font-medium tracking-[0.3em] text-[#9B7A41] uppercase">
                    Answer
                  </div>
                  <p className="text-base leading-8 text-[#4E463D]">
                    {item.answer}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-[#C5A059]/20 pt-8 text-center"></div>
        </div>
      </LandingSectionContainer>
    </LandingImageSection>
  )
}
