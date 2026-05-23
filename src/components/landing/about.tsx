import aboutBackground from '@/assets/images/bg/bg_about.webp'
import {
  LandingFeaturePanel,
  LandingFeaturePanelBody,
  LandingFeaturePanelHeader,
  LandingImageSection,
  LandingScriptureSectionHeader,
  LandingSectionContainer,
  LandingSectionOverlay,
} from '@/components/landing/primitives'

type TimelineEvent = {
  month: string
  label: string
  description: string
}

type ProgramStatProps = {
  label: string
  value: string
  labelColor?: string
  valueColor?: string
}

function ProgramStat({
  label,
  value,
  labelColor = '#9B8A73',
  valueColor = '#F8F4EC',
}: ProgramStatProps) {
  return (
    <div>
      <div
        className="text-[0.68rem] font-medium tracking-[0.3em] uppercase"
        style={{ color: labelColor }}
      >
        {label}
      </div>
      <div className="mt-2 font-serif text-2xl" style={{ color: valueColor }}>
        {value}
      </div>
    </div>
  )
}

type AwardRowProps = {
  rank: number
  label: string
  prize: string
}

function AwardRow({ rank, label, prize }: AwardRowProps) {
  const borderOpacity = rank === 1 ? '50' : rank === 2 ? '40' : '30'
  const textColor = rank === 1 ? '#E9D9B4' : rank === 2 ? '#D3CAC0' : '#C9C0B6'
  const paddingBottom = rank === 3 ? '1' : '3'
  const borderBottom = rank === 3 ? 'border-b-0' : 'border-b'

  return (
    <div
      className={`flex items-center justify-between ${borderBottom} border-[#C5A059]/20 pb-${paddingBottom}`}
    >
      <div className="flex items-center gap-3">
        <div
          className="flex h-8 w-8 items-center justify-center border bg-[#0A0908] font-serif text-sm"
          style={{
            borderColor: `rgba(197, 160, 89, 0.${borderOpacity})`,
            color: textColor,
          }}
        >
          {rank}
        </div>
        <span className="text-base text-[#D8D0C7]">{label}</span>
      </div>
      <span className="font-serif text-xl text-[#E9D9B4]">{prize}</span>
    </div>
  )
}

const timeline: Array<TimelineEvent> = [
  {
    month: 'July',
    label: 'School Begins',
    description: 'Formation journey starts with foundational teaching',
  },
  {
    month: 'October',
    label: 'First Semester Exam',
    description: 'Assessment of biblical foundations and early formation',
  },
  {
    month: 'January',
    label: 'Second Semester Exam',
    description: 'Evaluation of growth, discipleship practice, and maturity',
  },
  {
    month: 'March',
    label: 'Graduation',
    description: 'Oral examination, defense, and award ceremony',
  },
]

export function LandingAboutSection() {
  return (
    <LandingImageSection
      id="about"
      backgroundImageUrl={aboutBackground}
      gradientFrom="rgba(10,14,20,0.9)"
      gradientTo="rgba(12,16,22,0.95)"
      className="border-b border-[#C5A059]/14 text-[#F7F4EE]"
    >
      <LandingSectionOverlay
        gradientPosition="top_left"
        gradientStop="28%"
        secondaryGradientFrom="rgba(255,255,255,0.06)"
        secondaryGradientPosition="bottom_right"
      />

      <LandingSectionContainer className="px-0 py-18 sm:py-22 lg:py-24">
        <div className="grid items-start gap-14 lg:grid-cols-[minmax(0,0.88fr)_minmax(24rem,1.12fr)] lg:gap-20">
          <div className="space-y-7 px-5 sm:px-0">
            <LandingScriptureSectionHeader
              eyebrowLabel="Program Overview"
              headline="Overview"
              headlineMaxW="max-w-[14ch]"
              headlineColor="#F8F4EC"
              textColor="#D3CAC0"
              introText="Building new believers from infancy to adulthood — Foundation to Rooftop"
              scriptures={[
                {
                  quote:
                    'For when for the time ye ought to be teachers, ye have need that one teach you again which be the first principles of the oracles of God; and are become such as have need of milk, and not of strong meat.',
                  reference: 'Hebrews 5:12',
                },
              ]}
            />

            <div className="space-y-6 border-y border-white/10 py-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <ProgramStat label="Duration" value="9 Months" />
                <ProgramStat label="Total Lessons" value="18 Lessons" />
                <ProgramStat label="Cadence" value="3 / Month" />
                <ProgramStat label="Time" value="Sat 9AM GMT +2" />
                <ProgramStat label="Class Length" value="2 Hours" />
                <ProgramStat
                  label="Teaching Faculty"
                  value="6 Lecturer Pairs"
                />
                <ProgramStat
                  label="Personal Discipleship"
                  value="Biweekly Sessions"
                />

                <ProgramStat
                  label="Tuition"
                  value="Free"
                  labelColor="#D4B373"
                  valueColor="#E9D9B4"
                />
              </div>
            </div>

            <div className="space-y-5">
              <div>
                <div className="text-[0.68rem] font-medium tracking-[0.3em] text-[#D4B373] uppercase">
                  Additional Curriculum
                </div>
                <p className="mt-3 text-base leading-8 text-[#D3CAC0]">
                  How to disciple others, explain beliefs clearly, and think,
                  respond & ask questions like Jesus did
                </p>
              </div>

              <div className="border-l-2 border-[#C5A059]/40 pl-5">
                <p className="text-base leading-6 text-[#D8D0C7]">
                  Each student needs to disciple at least one person during the
                  9 month period
                </p>
              </div>
            </div>

            <div className="mt-6 border border-[#C5A059]/30 bg-[#1A1716]/60 px-5 py-5">
              <div className="text-[0.68rem] font-medium tracking-[0.3em] text-[#D4B373] uppercase">
                Excellence Awards
              </div>
              <div className="mt-4 space-y-3">
                <AwardRow rank={1} label="Best Student" prize="€500" />
                <AwardRow rank={2} label="Second Best" prize="€300" />
                <AwardRow rank={3} label="Third Best" prize="€200" />
              </div>
            </div>
          </div>

          <LandingFeaturePanel>
            <LandingFeaturePanelHeader backgroundImageUrl={aboutBackground}>
              <div className="relative flex min-h-72 flex-col justify-between p-4 sm:p-8 lg:min-h-84">
                <div>
                  <div className="text-[0.68rem] font-medium tracking-[0.3em] text-[#D4B373] uppercase">
                    9-Month Journey
                  </div>
                  <h3 className="mt-3 font-serif text-[clamp(2.4rem,4vw,4rem)] leading-[0.94] tracking-[-0.045em] text-white">
                    Formation Timeline
                  </h3>
                </div>

                <div className="max-w-60 border border-white/12 bg-black/24 px-4 py-4 shadow-[0_24px_40px_-30px_rgba(0,0,0,0.55)] backdrop-blur-sm">
                  <div className="text-[0.62rem] font-medium tracking-[0.28em] text-[#AFA28F] uppercase">
                    Duration
                  </div>
                  <div className="mt-2 font-serif text-xl leading-tight text-[#F8F4EC]">
                    July - March
                  </div>
                </div>
              </div>
            </LandingFeaturePanelHeader>

            <LandingFeaturePanelBody className="px-4 py-5 sm:px-8 sm:py-6">
              <div className="text-[0.68rem] font-medium tracking-[0.3em] text-[#8E816D] uppercase">
                Academic Calendar
              </div>
              <div className="mt-5 space-y-4">
                {timeline.map((event, index) => (
                  <div
                    key={event.month}
                    className="flex items-start gap-5 border-b border-white/8 pb-5 last:border-b-0 last:pb-0"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-[#C5A059]/50 bg-[#1A1716] font-serif text-sm text-[#E9D9B4]">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="text-[0.68rem] font-medium tracking-[0.26em] text-[#D4B373] uppercase">
                        {event.month}
                      </div>
                      <div className="mt-1 font-serif text-lg text-[#F8F4EC]">
                        {event.label}
                      </div>
                      <p className="mt-2 text-sm leading-7 text-[#C9C0B6]">
                        {event.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </LandingFeaturePanelBody>
          </LandingFeaturePanel>
        </div>
      </LandingSectionContainer>
    </LandingImageSection>
  )
}
