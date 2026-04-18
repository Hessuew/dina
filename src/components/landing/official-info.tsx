import { FileText, Mail, MapPin, Phone } from 'lucide-react'
import footerBackground from '@/assets/images/bg/bg_footer.webp'

export function LandingOfficialInfo() {
  return (
    <section
      className="relative isolate min-h-screen overflow-hidden text-[#F7F4EE]"
      style={{
        backgroundImage: `linear-gradient(180deg, rgba(8,6,5,0.65), rgba(10,8,7,0.75)), url(${footerBackground})`,
        backgroundPosition: 'center',
        backgroundSize: 'cover',
      }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(197,160,89,0.08),transparent_50%)]" />

      <div className="relative mx-auto max-w-[calc(100%-2rem)] px-5 py-16 sm:max-w-[calc(100%-4rem)] sm:px-8 sm:py-20 lg:max-w-[calc(100%-8rem)] lg:px-12 lg:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 text-center">
            <div className="mx-auto mb-6 h-px w-16 bg-[#C5A059]/50" />
            <h2 className="font-serif text-[clamp(2rem,4vw,3rem)] leading-tight tracking-[-0.04em] text-white">
              Official Information
            </h2>
            <div className="mx-auto mt-6 h-px w-16 bg-[#C5A059]/50" />
          </div>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div className="group space-y-4 border border-white/10 bg-linear-to-b from-[#1A1816]/60 to-[#0F0D0C]/60 p-6 backdrop-blur-sm transition-all hover:border-[#C5A059]/30">
              <div className="flex h-12 w-12 items-center justify-center rounded-sm border border-[#C5A059]/30 bg-[#C5A059]/10">
                <Mail className="h-5 w-5 text-[#D4B373]" />
              </div>
              <div>
                <div className="mb-2 text-[0.65rem] font-medium tracking-[0.25em] text-[#9B8A73] uppercase">
                  Email
                </div>
                <a
                  href="mailto:info@dina.academy"
                  className="text-sm text-[#E9D9B4] transition-colors hover:text-white"
                >
                  info@dina.academy
                </a>
              </div>
            </div>

            <div className="group space-y-4 border border-white/10 bg-linear-to-b from-[#1A1816]/60 to-[#0F0D0C]/60 p-6 backdrop-blur-sm transition-all hover:border-[#C5A059]/30">
              <div className="flex h-12 w-12 items-center justify-center rounded-sm border border-[#C5A059]/30 bg-[#C5A059]/10">
                <Phone className="h-5 w-5 text-[#D4B373]" />
              </div>
              <div>
                <div className="mb-2 text-[0.65rem] font-medium tracking-[0.25em] text-[#9B8A73] uppercase">
                  Phone
                </div>
                <a
                  href="tel:+358401234567"
                  className="text-sm text-[#E9D9B4] transition-colors hover:text-white"
                >
                  +358 40 123 4567
                </a>
              </div>
            </div>

            <div className="group space-y-4 border border-white/10 bg-linear-to-b from-[#1A1816]/60 to-[#0F0D0C]/60 p-6 backdrop-blur-sm transition-all hover:border-[#C5A059]/30">
              <div className="flex h-12 w-12 items-center justify-center rounded-sm border border-[#C5A059]/30 bg-[#C5A059]/10">
                <MapPin className="h-5 w-5 text-[#D4B373]" />
              </div>
              <div>
                <div className="mb-2 text-[0.65rem] font-medium tracking-[0.25em] text-[#9B8A73] uppercase">
                  Postal Address
                </div>
                <address className="text-sm leading-relaxed text-[#E9D9B4] not-italic">
                  Disciplers of Nations Academy
                  <br />
                  Example Street 123
                  <br />
                  00100 Helsinki, Finland
                </address>
              </div>
            </div>

            <div className="group space-y-4 border border-white/10 bg-linear-to-b from-[#1A1816]/60 to-[#0F0D0C]/60 p-6 backdrop-blur-sm transition-all hover:border-[#C5A059]/30">
              <div className="flex h-12 w-12 items-center justify-center rounded-sm border border-[#C5A059]/30 bg-[#C5A059]/10">
                <FileText className="h-5 w-5 text-[#D4B373]" />
              </div>
              <div>
                <div className="mb-2 text-[0.65rem] font-medium tracking-[0.25em] text-[#9B8A73] uppercase">
                  Registration
                </div>
                <div className="space-y-1 text-sm text-[#E9D9B4]">
                  <div>Business ID: 1234567-8</div>
                  <div className="text-xs text-[#9B8A73]">
                    Registered in England
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-12 flex w-full justify-center lg:mt-24">
            <p className="max-w-xl text-center text-base leading-8 font-light tracking-[0.04em] text-[#CFC6B7] sm:text-lg">
              "For it seemed good to the Holy Ghost, and to us, to lay upon you
              no greater burden than these necessary things"
              <br />
              <span className="text-[0.72rem] font-medium tracking-[0.2em] text-[#9B7A41] uppercase">
                &nbsp;Acts 15:28
              </span>
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
