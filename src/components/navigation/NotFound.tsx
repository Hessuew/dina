import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import testimonialBackground from '@/assets/images/bg/bg_testimonials.webp'

export function NotFound({ children }: { children?: React.ReactNode }) {
  return (
    <div
      className="relative isolate flex min-h-screen items-center justify-center overflow-hidden"
      style={{
        backgroundImage: `linear-gradient(180deg, rgba(14,13,17,0.922), rgba(10,10,12,0.97)), url(${testimonialBackground})`,
        backgroundPosition: 'center',
        backgroundSize: 'cover',
      }}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(197,160,89,0.10),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.22),transparent_22%)]" />
      <div className="relative mx-auto max-w-2xl px-6 py-12 text-center">
        <div className="space-y-8">
          <div className="inline-flex flex-col items-center gap-3 text-[0.68rem] font-medium tracking-[0.3em] text-[#D4B373] uppercase">
            <div className="h-px w-16 bg-[#C5A059]/50" />
            <span>Page not found</span>
          </div>
          <h1 className="font-serif text-[clamp(3.2rem,6vw,5.5rem)] leading-[0.9] tracking-[-0.055em] text-white">
            404
          </h1>
          <div className="text-[#F7F4EE]">
            {children || <p>The page you are looking for does not exist.</p>}
          </div>
          <div className="flex items-center justify-center gap-4">
            <Button
              onClick={() => window.history.back()}
              className="inline-flex h-11 items-center justify-center border border-white/12 bg-white/6 px-6 text-[0.72rem] font-medium tracking-[0.2em] text-[#F8F4EC] uppercase transition-all hover:border-[#C5A059]/50 hover:bg-white/10"
            >
              Go back
            </Button>
            <Button
              nativeButton={false}
              theme="dark"
              render={
                <Link
                  to="/"
                  className="inline-flex h-11 items-center justify-center border border-[#C5A059]/35 bg-[#1A1716] px-6 text-[0.72rem] font-medium tracking-[0.2em] text-[#E9D9B4] uppercase shadow-[0_26px_40px_-28px_rgba(0,0,0,0.4)] transition-all hover:border-[#D6B16E] hover:text-white"
                >
                  Home Page
                </Link>
              }
            />
          </div>
        </div>
      </div>
    </div>
  )
}
