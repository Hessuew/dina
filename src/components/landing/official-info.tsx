import { Landmark, Mail, MapPin, Phone } from 'lucide-react'
import facultyBackground from '@/assets/images/bg/bg_lecturers.webp'
import {
  LandingImageSection,
  LandingScriptureSectionHeader,
  LandingSectionContainer,
} from '@/components/landing/primitives'

export function LandingOfficialInfo() {
  return (
    <LandingImageSection
      backgroundImageUrl={facultyBackground}
      gradientFrom="rgba(255, 255, 255, 0.9)"
      gradientTo="rgba(255, 255, 255, 0.9)"
      className="text-[#1C1815]"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(197,160,89,0.08),transparent_50%)]" />

      <LandingSectionContainer className="py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-6xl space-y-14">
          <LandingScriptureSectionHeader
            eyebrowLabel="Registry & Documentation"
            eyebrowAlign="center"
            headline="Official Information"
            headlineMaxW="max-w-3xl"
            headlineColor="#1A1A1A"
            textColor="#4E463D"
            introText="Official information about the Discipleship Training School"
            className="flex flex-col items-center text-center"
          />

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <div className="group space-y-4 border border-[#C5A059]/20 bg-white/70 p-6 backdrop-blur-sm transition-all hover:border-[#C5A059]/50 hover:bg-white/90">
              <div className="flex h-12 w-12 items-center justify-center rounded-sm border border-[#C5A059]/30 bg-[#C5A059]/10">
                <Mail className="h-5 w-5 text-[#9B7A41]" />
              </div>
              <div>
                <div className="mb-2 text-[0.65rem] font-medium tracking-[0.25em] text-[#8A7355] uppercase">
                  Email
                </div>
                <a
                  href="mailto:info@christ-dina.org"
                  className="text-sm text-[#2C2218] transition-colors hover:text-[#9B7A41]"
                >
                  info@christ-dina.org
                </a>
              </div>
            </div>

            <div className="group space-y-4 border border-[#C5A059]/20 bg-white/70 p-6 backdrop-blur-sm transition-all hover:border-[#C5A059]/50 hover:bg-white/90">
              <div className="flex h-12 w-12 items-center justify-center rounded-sm border border-[#C5A059]/30 bg-[#C5A059]/10">
                <Phone className="h-5 w-5 text-[#9B7A41]" />
              </div>
              <div>
                <div className="mb-2 text-[0.65rem] font-medium tracking-[0.25em] text-[#8A7355] uppercase">
                  Phone
                </div>
                <a
                  href="tel:+358401234567"
                  className="text-sm text-[#2C2218] transition-colors hover:text-[#9B7A41]"
                >
                  +44 753 464 5144
                </a>
              </div>
            </div>

            <div className="group space-y-4 border border-[#C5A059]/20 bg-white/70 p-6 backdrop-blur-sm transition-all hover:border-[#C5A059]/50 hover:bg-white/90">
              <div className="flex h-12 w-12 items-center justify-center rounded-sm border border-[#C5A059]/30 bg-[#C5A059]/10">
                <MapPin className="h-5 w-5 text-[#9B7A41]" />
              </div>
              <div>
                <div className="mb-2 text-[0.65rem] font-medium tracking-[0.25em] text-[#8A7355] uppercase">
                  Postal Address
                </div>
                <address className="text-sm leading-relaxed text-[#2C2218] not-italic">
                  Custom House, 258 Prince Regent Lane
                  <br />
                  London E16 3JJ, United Kingdom
                </address>
              </div>
            </div>

            <div className="group space-y-4 border border-[#C5A059]/20 bg-white/70 p-6 backdrop-blur-sm transition-all hover:border-[#C5A059]/50 hover:bg-white/90 sm:col-span-2 lg:col-span-1">
              <div className="flex h-12 w-12 items-center justify-center rounded-sm border border-[#C5A059]/30 bg-[#C5A059]/10">
                <Landmark className="h-5 w-5 text-[#9B7A41]" />
              </div>
              <div>
                <div className="mb-2 text-[0.65rem] font-medium tracking-[0.25em] text-[#8A7355] uppercase">
                  Bank Account
                </div>
                <div className="space-y-1 text-sm text-[#2C2218]">
                  <div className="font-mono tracking-wide">
                    FI00 0000 0000 0000 00
                  </div>
                  <div className="text-xs text-[#8A7355]">BIC: XXXXXXXX</div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-12 flex w-full justify-center lg:mt-24">
            <p className="max-w-xl text-center text-base leading-8 font-light tracking-[0.04em] text-[#5C4F3A] sm:text-lg">
              "For we write none other things unto you, that what ye read or
              acknowledge; and I trust ye shall acknowledge even to the end"
              <br />
              <span className="text-[0.72rem] font-medium tracking-[0.2em] text-[#9B7A41] uppercase">
                &nbsp;2 Corinthians 1:13
              </span>
            </p>
          </div>
        </div>
      </LandingSectionContainer>
    </LandingImageSection>
  )
}
