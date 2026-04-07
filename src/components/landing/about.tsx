import aboutBackground from '@/assets/images/bg3_v1.png'

type TimelineEvent = {
  month: string
  label: string
  description: string
}

const timeline: Array<TimelineEvent> = [
  {
    month: 'June',
    label: 'School Begins',
    description: 'Formation journey starts with foundational teaching',
  },
  {
    month: 'September',
    label: 'First Semester Exam',
    description: 'Assessment of biblical foundations and early formation',
  },
  {
    month: 'December',
    label: 'Second Semester Exam',
    description: 'Evaluation of growth, discipleship practice, and maturity',
  },
  {
    month: 'February',
    label: 'Graduation',
    description: 'Oral examination, defense, and award ceremony',
  },
]

export function LandingAboutSection() {
  return (
    <section
      id="about"
      className="relative isolate overflow-hidden border-b border-[#C5A059]/14 text-[#F7F4EE]"
      style={{
        backgroundImage: `linear-gradient(180deg, rgba(10,14,20,0.9), rgba(12,16,22,0.95)), url(${aboutBackground})`,
        backgroundPosition: 'center',
        backgroundSize: 'cover',
      }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(197,160,89,0.14),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.06),transparent_22%)]" />

      <div className="relative mx-auto max-w-[calc(100%-2rem)] px-5 py-18 sm:max-w-[calc(100%-4rem)] sm:px-8 sm:py-22 lg:max-w-[calc(100%-8rem)] lg:px-12 lg:py-24">
        <div className="grid items-start gap-14 lg:grid-cols-[minmax(0,0.88fr)_minmax(24rem,1.12fr)] lg:gap-20">
          <div className="space-y-7">
            <div className="space-y-4">
              <div className="inline-flex flex-col gap-2 text-[0.72rem] font-medium tracking-[0.3em] text-[#9B7A41] uppercase">
                <div className="h-px w-20 bg-[#C5A059]/50 lg:w-28" />
                <div className="flex flex-row items-center gap-3">
                  <span className="h-px w-10 bg-[#C5A059]/55" />
                  Program Overview
                </div>
              </div>

              <h2 className="max-w-[14ch] font-serif text-[clamp(3rem,5vw,5.1rem)] leading-[0.92] tracking-[-0.055em] text-[#F8F4EC]">
                Overview
              </h2>

              <p className="max-w-xl text-base leading-8 font-light tracking-[0.04em] text-[#D3CAC0] sm:text-lg">
                Building new believers from infancy to adulthood — Foundation to
                Rooftop
                <br />
                <br />
                <span className="tracking-[0.02em]">
                  "For when for the time ye ought to be teachers, ye have need
                  that one teach you again which be the first principles of the
                  oracles of God; and are become such as have need of milk, and
                  not of strong meat." Hebrews 5:12
                </span>
              </p>
            </div>

            <div className="space-y-6 border-y border-white/10 py-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <div className="text-[0.68rem] font-medium tracking-[0.3em] text-[#9B8A73] uppercase">
                    Duration
                  </div>
                  <div className="mt-2 font-serif text-2xl text-[#F8F4EC]">
                    9 Months
                  </div>
                </div>
                <div>
                  <div className="text-[0.68rem] font-medium tracking-[0.3em] text-[#9B8A73] uppercase">
                    Total Lessons
                  </div>
                  <div className="mt-2 font-serif text-2xl text-[#F8F4EC]">
                    18 Lessons
                  </div>
                </div>
                <div>
                  <div className="text-[0.68rem] font-medium tracking-[0.3em] text-[#9B8A73] uppercase">
                    Cadence
                  </div>
                  <div className="mt-2 font-serif text-2xl text-[#F8F4EC]">
                    3 / Month
                  </div>
                </div>
                <div>
                  <div className="text-[0.68rem] font-medium tracking-[0.3em] text-[#9B8A73] uppercase">
                    Class Length
                  </div>
                  <div className="mt-2 font-serif text-2xl text-[#F8F4EC]">
                    2 Hours
                  </div>
                </div>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <div className="text-[0.68rem] font-medium tracking-[0.3em] text-[#9B8A73] uppercase">
                    Teaching Faculty
                  </div>
                  <div className="mt-2 font-serif text-2xl text-[#F8F4EC]">
                    6 Lecturer Pairs
                  </div>
                </div>

                <div>
                  <div className="text-[0.68rem] font-medium tracking-[0.3em] text-[#9B8A73] uppercase">
                    Personal Discipleship
                  </div>
                  <div className="mt-2 font-serif text-2xl text-[#F8F4EC]">
                    Biweekly Sessions
                  </div>
                </div>
              </div>

              <div>
                <div className="text-[0.68rem] font-medium tracking-[0.3em] text-[#D4B373] uppercase">
                  Tuition
                </div>
                <div className="mt-2 font-serif text-2xl text-[#E9D9B4]">
                  Free
                </div>
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

            <div className="mt-6 border border-[#C5A059]/30 bg-[#1A1716]/60 px-5 py-4">
              <div className="text-[0.68rem] font-medium tracking-[0.3em] text-[#D4B373] uppercase">
                Excellence Award
              </div>
              <p className="mt-2 font-serif text-xl text-[#E9D9B4]">
                Best students receive €500 at graduation
              </p>
            </div>
          </div>

          <div className="relative border border-white/10 bg-[#171717]/72 p-4 shadow-[0_42px_100px_-52px_rgba(0,0,0,0.82)] backdrop-blur-sm sm:p-6">
            <div
              className="relative overflow-hidden border border-white/10"
              style={{
                backgroundImage: `linear-gradient(180deg, rgba(7,7,8,0.26), rgba(7,7,8,0.72)), url(${aboutBackground})`,
                backgroundPosition: 'center',
                backgroundSize: 'cover',
              }}
            >
              <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.12),transparent_38%,rgba(197,160,89,0.14)_100%)]" />
              <div className="relative flex min-h-72 flex-col justify-between p-6 sm:p-8 lg:min-h-84">
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
                    June - February
                  </div>
                </div>
              </div>
            </div>

            <div className="border-x border-b border-white/10 bg-[#151515]/88 px-6 py-7 sm:px-8 sm:py-6">
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
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// export function LandingAboutSection() {
//   return (
//     <section
//       id="about"
//       className="relative isolate overflow-hidden border-b border-[#C5A059]/14 text-[#F7F4EE]"
//       style={{
//         backgroundImage: `linear-gradient(180deg, rgba(10,14,20,0.9), rgba(12,16,22,0.95)), url(${aboutBackground})`,
//         backgroundPosition: 'center',
//         backgroundSize: 'cover',
//       }}
//     >
//       <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(197,160,89,0.14),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.06),transparent_22%)]" />

//       <div className="relative mx-auto max-w-[calc(100%-2rem)] px-5 py-14 sm:max-w-[calc(100%-4rem)] sm:px-8 sm:py-16 lg:max-w-[calc(100%-8rem)] lg:px-12 lg:py-18">
//         <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,0.88fr)_minmax(24rem,1.12fr)] lg:gap-16">
//           <div className="space-y-7">
//             <div className="space-y-6">
//               <div className="inline-flex flex-col gap-2 text-[0.72rem] font-medium tracking-[0.3em] text-[#9B7A41] uppercase">
//                 <div className="h-px w-20 bg-[#C5A059]/50 lg:w-28" />
//                 <div className="flex flex-row items-center gap-3">
//                   <span className="h-px w-10 bg-[#C5A059]/55" />
//                   Program Overview
//                 </div>
//               </div>

//               <h2 className="max-w-[14ch] font-serif text-[clamp(2.8rem,5vw,4.8rem)] leading-[0.92] tracking-[-0.055em] text-[#F8F4EC]">
//                 Overview
//               </h2>

//               <p className="max-w-xl text-base leading-7 font-light tracking-[0.04em] text-[#D3CAC0]">
//                 Building new believers from infancy to adulthood — Foundation to
//                 Rooftop
//                 <br />
//                 <br />
//                 <span className="tracking-[0.02em]">
//                   "For when for the time ye ought to be teachers, ye have need
//                   that one teach you again which be the first principles of the
//                   oracles of God; and are become such as have need of milk, and
//                   not of strong meat." Hebrews 5:12
//                 </span>
//               </p>
//             </div>

//             <div className="space-y-5 border-y border-white/10 py-6">
//               <div className="grid gap-6 sm:grid-cols-2">
//                 <div>
//                   <div className="text-[0.68rem] font-medium tracking-[0.3em] text-[#9B8A73] uppercase">
//                     Duration
//                   </div>
//                   <div className="mt-2 font-serif text-2xl text-[#F8F4EC]">
//                     9 Months
//                   </div>
//                 </div>
//                 <div>
//                   <div className="text-[0.68rem] font-medium tracking-[0.3em] text-[#9B8A73] uppercase">
//                     Total Lessons
//                   </div>
//                   <div className="mt-2 font-serif text-2xl text-[#F8F4EC]">
//                     18 Lessons
//                   </div>
//                 </div>
//                 <div>
//                   <div className="text-[0.68rem] font-medium tracking-[0.3em] text-[#9B8A73] uppercase">
//                     Cadence
//                   </div>
//                   <div className="mt-2 font-serif text-2xl text-[#F8F4EC]">
//                     3 / Month
//                   </div>
//                 </div>
//                 <div>
//                   <div className="text-[0.68rem] font-medium tracking-[0.3em] text-[#9B8A73] uppercase">
//                     Class Length
//                   </div>
//                   <div className="mt-2 font-serif text-2xl text-[#F8F4EC]">
//                     2 Hours
//                   </div>
//                 </div>
//               </div>

//               <div className="grid gap-5 sm:grid-cols-2">
//                 <div>
//                   <div className="text-[0.68rem] font-medium tracking-[0.3em] text-[#9B8A73] uppercase">
//                     Teaching Faculty
//                   </div>
//                   <div className="mt-2 font-serif text-2xl text-[#F8F4EC]">
//                     6 Lecturer Pairs
//                   </div>
//                 </div>
//                 <div>
//                   <div className="text-[0.68rem] font-medium tracking-[0.3em] text-[#9B8A73] uppercase">
//                     Discipleship
//                   </div>
//                   <div className="mt-2 font-serif text-2xl text-[#F8F4EC]">
//                     Biweekly Sessions
//                   </div>
//                 </div>
//               </div>

//               <div className="border-t border-white/8 pt-5">
//                 <div className="text-[0.68rem] font-medium tracking-[0.3em] text-[#D4B373] uppercase">
//                   Tuition
//                 </div>
//                 <div className="mt-2 font-serif text-2xl text-[#E9D9B4]">
//                   Free
//                 </div>
//               </div>
//             </div>

//             <div className="space-y-4">
//               <div>
//                 <div className="text-[0.68rem] font-medium tracking-[0.3em] text-[#D4B373] uppercase">
//                   Additional Curriculum
//                 </div>
//                 <p className="mt-3 text-base leading-7 text-[#D3CAC0]">
//                   How to disciple others, explain beliefs clearly, and think,
//                   respond & ask questions like Jesus did
//                 </p>
//               </div>

//               <div className="border-l-2 border-[#C5A059]/40 pl-5">
//                 <p className="text-base leading-7 text-[#D8D0C7]">
//                   Each student needs to disciple at least one person during the
//                   9 month period
//                 </p>
//               </div>

//               {/* <div className="border-l-2 border-[#C5A059]/40 pl-5">
//                 <p className="text-base leading-8 text-[#D8D0C7]">
//                   Every lesson has assignment/s
//                 </p>
//               </div> */}
//             </div>

//             <div className="border border-[#C5A059]/30 bg-[#1A1716]/60 px-5 py-4">
//               <div className="text-[0.68rem] font-medium tracking-[0.3em] text-[#D4B373] uppercase">
//                 Excellence Award
//               </div>
//               <p className="mt-2 font-serif text-lg text-[#E9D9B4]">
//                 Best students receive €500 at graduation
//               </p>
//             </div>
//           </div>

//           <div className="relative border border-white/10 bg-[#171717]/72 p-4 shadow-[0_42px_100px_-52px_rgba(0,0,0,0.82)] backdrop-blur-sm sm:p-6">
//             <div
//               className="relative overflow-hidden border border-white/10"
//               style={{
//                 backgroundImage: `linear-gradient(180deg, rgba(7,7,8,0.26), rgba(7,7,8,0.72)), url(${aboutBackground})`,
//                 backgroundPosition: 'center',
//                 backgroundSize: 'cover',
//               }}
//             >
//               <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.12),transparent_38%,rgba(197,160,89,0.14)_100%)]" />
//               <div className="relative flex min-h-72 flex-col justify-between p-6 sm:p-8 lg:min-h-84">
//                 <div>
//                   <div className="text-[0.68rem] font-medium tracking-[0.3em] text-[#D4B373] uppercase">
//                     9-Month Journey
//                   </div>
//                   <h3 className="mt-3 font-serif text-[clamp(2.2rem,4vw,3.6rem)] leading-[0.94] tracking-[-0.045em] text-white">
//                     Formation Timeline
//                   </h3>
//                 </div>

//                 <div className="max-w-60 border border-white/12 bg-black/24 px-4 py-4 shadow-[0_24px_40px_-30px_rgba(0,0,0,0.55)] backdrop-blur-sm">
//                   <div className="text-[0.62rem] font-medium tracking-[0.28em] text-[#AFA28F] uppercase">
//                     Duration
//                   </div>
//                   <div className="mt-2 font-serif text-lg leading-tight text-[#F8F4EC]">
//                     June - February
//                   </div>
//                 </div>
//               </div>
//             </div>

//             <div className="border-x border-b border-white/10 bg-[#151515]/88 px-6 py-6 sm:px-8 sm:py-7">
//               <div className="text-[0.68rem] font-medium tracking-[0.3em] text-[#8E816D] uppercase">
//                 Academic Calendar
//               </div>
//               <div className="mt-5 space-y-4">
//                 {timeline.map((event, index) => (
//                   <div
//                     key={event.month}
//                     className="flex items-start gap-4 border-b border-white/8 pb-4 last:border-b-0 last:pb-0"
//                   >
//                     <div className="flex h-9 w-9 shrink-0 items-center justify-center border border-[#C5A059]/50 bg-[#1A1716] font-serif text-sm text-[#E9D9B4]">
//                       {index + 1}
//                     </div>
//                     <div className="flex-1">
//                       <div className="text-[0.68rem] font-medium tracking-[0.26em] text-[#D4B373] uppercase">
//                         {event.month}
//                       </div>
//                       <div className="mt-1 font-serif text-base text-[#F8F4EC]">
//                         {event.label}
//                       </div>
//                       <p className="mt-2 text-sm leading-6 text-[#C9C0B6]">
//                         {event.description}
//                       </p>
//                     </div>
//                   </div>
//                 ))}
//               </div>
//             </div>
//           </div>
//         </div>
//       </div>
//     </section>
//   )
// }
