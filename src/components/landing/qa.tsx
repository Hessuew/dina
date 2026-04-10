import { ArrowRight } from 'lucide-react'
import marbleTexture from '@/assets/images/bg.jpg'

type QAItem = {
  id: string
  question: string
  answer: string
}

const qaItems: Array<QAItem> = [
  {
    id: '',
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
      'Students attend three 2-hour classes per month, plus biweekly personal discipleship sessions (1–2 hours each). Additional time is needed for reading, assignments, and discipling at least one person throughout the program. Most students dedicate 6–10 hours per week.',
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
]

export function LandingQASection() {
  return (
    <section
      className="relative isolate overflow-hidden border-b border-[#C5A059]/14"
      style={{
        backgroundImage: `linear-gradient(180deg, rgba(247,244,238,0.96), rgba(247,244,238,0.98)), url(${marbleTexture})`,
        backgroundPosition: 'center',
        backgroundSize: 'cover',
      }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(197,160,89,0.08),transparent_40%)]" />

      <div className="relative mx-auto max-w-[calc(100%-2rem)] px-5 py-18 sm:max-w-[calc(100%-4rem)] sm:px-8 sm:py-22 lg:max-w-[calc(100%-8rem)] lg:px-12 lg:py-24">
        <div className="mx-auto max-w-6xl space-y-14">
          <div className="flex flex-col items-center space-y-6 text-center">
            <div className="inline-flex flex-col items-center gap-2 text-[0.72rem] font-medium tracking-[0.3em] text-[#9B7A41] uppercase">
              <div className="h-px w-20 bg-[#C5A059]/50 lg:w-28" />
              <div className="flex flex-row items-center gap-3">
                <span className="h-px w-10 bg-[#C5A059]/55" />
                Questions & Answers
              </div>
            </div>

            <h2 className="max-w-3xl font-serif text-[clamp(3rem,5vw,5.1rem)] leading-[0.92] tracking-[-0.055em] text-[#1A1A1A]">
              Common Questions
            </h2>

            <p className="max-w-2xl text-base leading-8 font-light tracking-[0.04em] text-[#4E463D] sm:text-lg">
              What you should know about the Discipleship Training School
              program, enrollment, and what to expect.
            </p>
          </div>

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

          <div className="border-t border-[#C5A059]/20 pt-8 text-center">
            {/* <p className="text-sm leading-7 text-[#6B5F4D]">
              Have more questions? Contact us at{' '}
              <span className="font-medium text-[#C5A059]">
                info@dina.academy
              </span>
            </p> */}
          </div>
        </div>
      </div>
    </section>
  )
}
