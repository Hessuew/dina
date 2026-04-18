import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import footerBackground from '@/assets/images/bg/bg_footer.webp'

export function LandingFooter() {
  return (
    <section
      className="relative isolate overflow-hidden text-[#F7F4EE]"
      style={{
        backgroundImage: `linear-gradient(180deg, rgba(8,6,5,0.65), rgba(10,8,7,0.75)), url(${footerBackground})`,
        backgroundPosition: 'center',
        backgroundSize: 'cover',
      }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(197,160,89,0.08),transparent_50%)]" />

      <div className="relative mx-auto max-w-[calc(100%-2rem)] px-5 py-20 sm:max-w-[calc(100%-4rem)] sm:px-8 sm:py-24 lg:max-w-[calc(100%-8rem)] lg:px-12 lg:py-12">
        <div className="flex min-h-[70vh] flex-col justify-between text-center lg:min-h-[80vh]">
          <div className="flex flex-1 items-center justify-center">
            <div className="space-y-8">
              <div className="mx-auto h-px w-24 bg-[#C5A059]/50" />

              <h2 className="mx-auto max-w-5xl font-serif text-[clamp(3.5rem,8vw,8rem)] leading-[0.88] tracking-[-0.06em] text-white">
                Disciplers of Nations Academy
              </h2>

              <div className="mx-auto h-px w-24 bg-[#C5A059]/50" />

              <div className="space-y-4 pt-6">
                <div className="text-[0.7rem] font-medium tracking-[0.3em] text-[#D4B373] uppercase">
                  Enrollment Open for 2027
                </div>
                <Link
                  to="/enrolment"
                  className="group inline-flex h-14 items-center justify-center gap-3 border border-[#C5A059]/55 bg-linear-to-b from-[#2A2A2A] to-[#111111] px-8 font-serif text-base tracking-[0.12em] text-[#E9D9B4] shadow-[0_28px_60px_-28px_rgba(0,0,0,0.7)] transition-all hover:-translate-y-0.5 hover:border-[#D6B16E] hover:text-white"
                >
                  Apply Now
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </div>
            </div>
          </div>

          <div className="flex w-full items-center justify-between border-t border-white/10 pt-8 text-sm">
            <div className="text-[#9B8A73]">
              © {new Date().getFullYear()} DINA. All rights reserved.
            </div>

            <a
              href="https://cherubim-it.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#D4B373] transition-colors hover:text-white"
            >
              Designed and developed by Cherubim IT
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
