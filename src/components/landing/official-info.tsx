import { FileText, Landmark, Mail, MapPin, Phone } from 'lucide-react'
import facultyBackground from '@/assets/images/bg/bg_lecturers.webp'

export function LandingOfficialInfo() {
  return (
    <section
      className="relative isolate overflow-hidden text-[#1C1815]"
      style={{
        backgroundImage: `linear-gradient(to bottom, rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0.9)), url(${facultyBackground})`,
        backgroundPosition: 'center',
        backgroundSize: 'cover',
      }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(197,160,89,0.08),transparent_50%)]" />

      <div className="relative mx-auto max-w-[calc(100%-2rem)] px-5 py-16 sm:max-w-[calc(100%-4rem)] sm:px-8 sm:py-20 lg:max-w-[calc(100%-8rem)] lg:px-12 lg:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 text-center">
            <div className="mx-auto mb-6 h-px w-16 bg-[#9B8A73]/50" />
            <h2 className="font-serif text-[clamp(2rem,4vw,3rem)] leading-tight tracking-[-0.04em] text-[#1C1815]">
              Official Information
            </h2>
            <div className="mx-auto mt-6 h-px w-16 bg-[#9B8A73]/50" />
          </div>

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
                  href="mailto:info@dina.academy"
                  className="text-sm text-[#2C2218] transition-colors hover:text-[#9B7A41]"
                >
                  info@dina.academy
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
                  +358 40 123 4567
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
                  Disciplers of Nations Academy
                  <br />
                  Example Street 123
                  <br />
                  00100 Helsinki, Finland
                </address>
              </div>
            </div>

            <div className="group space-y-4 border border-[#C5A059]/20 bg-white/70 p-6 backdrop-blur-sm transition-all hover:border-[#C5A059]/50 hover:bg-white/90">
              <div className="flex h-12 w-12 items-center justify-center rounded-sm border border-[#C5A059]/30 bg-[#C5A059]/10">
                <FileText className="h-5 w-5 text-[#9B7A41]" />
              </div>
              <div>
                <div className="mb-2 text-[0.65rem] font-medium tracking-[0.25em] text-[#8A7355] uppercase">
                  Registration
                </div>
                <div className="space-y-1 text-sm text-[#2C2218]">
                  <div>Business ID: 1234567-8</div>
                  <div className="text-xs text-[#8A7355]">
                    Registered in England
                  </div>
                </div>
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
      </div>
    </section>
  )
}
