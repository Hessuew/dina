import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import footerBackground from '@/assets/images/bg/bg_footer.webp'
import {
  LandingImageSection,
  LandingSectionContainer,
  LandingSectionOverlay,
} from '@/components/landing/primitives'

export function LandingFooter() {
  return (
    <LandingImageSection
      backgroundImageUrl={footerBackground}
      gradientFrom="rgba(8,6,5,0.65)"
      gradientTo="rgba(10,8,7,0.75)"
      className="min-h-screen text-[#F7F4EE]"
    >
      <LandingSectionOverlay
        gradientFrom="rgba(197,160,89,0.08)"
        gradientPosition="center"
        gradientStop="50%"
      />

      <LandingSectionContainer className="py-20 sm:py-24 lg:py-12">
        <div className="flex min-h-[70vh] flex-col justify-between text-center lg:min-h-[80vh]">
          <div className="flex flex-1 items-center justify-center">
            <div className="space-y-8">
              <div className="mx-auto h-px w-24 bg-[#C5A059]/50" />

              <h2 className="mx-auto max-w-5xl font-serif text-[clamp(3.5rem,8vw,8rem)] leading-[0.88] tracking-[-0.06em] text-[white]">
                Disciplers of Nations Academy
              </h2>

              <div className="mx-auto h-px w-24 bg-[#C5A059]/50" />

              <div className="space-y-4 pt-6">
                <div className="text-[0.7rem] font-medium tracking-[0.3em] text-[#C5A059] uppercase">
                  Enrollment Open for 2026
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
            <div className="text-[#C5A059]">
              © {new Date().getFullYear()} DINA. All rights reserved.
            </div>

            <a
              href="https://cherubim-it.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#C5A059] transition-colors hover:text-white"
            >
              Designed and developed by Cherubim IT
            </a>
          </div>
        </div>
      </LandingSectionContainer>
    </LandingImageSection>
  )
}
