import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useForm } from '@tanstack/react-form'
import { CheckCircle } from 'lucide-react'
import footerBackground from '@/assets/images/bg/bg_footer.webp'
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'

function required({ value }: { value: string }) {
  return !value.trim() ? 'This field is required' : undefined
}

function validEmail({ value }: { value: string }) {
  if (!value.trim()) return 'Email is required'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
    return 'Enter a valid email address'
  return undefined
}

function minLength(min: number) {
  return ({ value }: { value: string }) =>
    value.trim().length < min ? `Minimum ${min} characters required` : undefined
}

export function EnrolmentForm() {
  const [submitted, setSubmitted] = useState(false)

  const form = useForm({
    defaultValues: {
      name: '',
      email: '',
      bio: '',
    },
    onSubmit: ({ value }) => {
      console.log('Enrolment submission:', value)
      setSubmitted(true)
    },
  })

  const pageShell = (rightPanel: React.ReactNode) => (
    <section
      className="relative isolate min-h-svh overflow-hidden border-b border-[#C5A059]/14 bg-[#121212] text-[#F8F4EC]"
      style={{
        backgroundImage: `linear-gradient(180deg, rgba(8,6,5,0.78), rgba(10,8,7,0.85)), url(${footerBackground})`,
        backgroundPosition: 'center',
        backgroundSize: 'cover',
      }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(197,160,89,0.14),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.06),transparent_22%)]" />

      <div className="relative mx-auto max-w-[calc(100%-2rem)] px-5 py-18 sm:max-w-[calc(100%-4rem)] sm:px-8 sm:py-22 lg:max-w-[calc(100%-8rem)] lg:px-12 lg:py-24">
        <div className="grid items-start gap-14 lg:grid-cols-[minmax(0,0.85fr)_minmax(24rem,1.15fr)] lg:gap-20">
          <div className="flex h-full flex-1 flex-col justify-between space-y-10">
            <div className="space-y-6">
              <div className="inline-flex flex-col gap-2 text-[0.72rem] font-medium tracking-[0.3em] text-[#9B7A41] uppercase">
                <div className="h-px w-20 bg-[#C5A059]/50 lg:w-28" />
                <div className="flex flex-row items-center gap-3">
                  <span className="h-px w-10 bg-[#C5A059]/55" />
                  Enrolment 2027
                </div>
              </div>

              <h1 className="max-w-[12ch] font-serif text-[clamp(3rem,5vw,5.2rem)] leading-[0.92] tracking-[-0.055em] text-[#F8F4EC]">
                Apply for enrolment
              </h1>

              <p className="max-w-xl text-base leading-8 font-light tracking-[0.04em] text-[#CFC6B7] sm:text-lg">
                "Through desire a man, having separated himself, seeketh and
                intermeddleth with all wisdom."
                <br />
                <span className="text-[0.72rem] font-medium tracking-[0.2em] text-[#9B7A41] uppercase">
                  Proverbs 18:1
                </span>
              </p>
            </div>

            <div className="border-t border-white/10 pt-8 text-[0.65rem] font-medium tracking-[0.18em] text-[#8E816D] uppercase">
              <div>© {new Date().getFullYear()} DINA</div>
              <a
                href="https://cherubim-it.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 block transition-colors hover:text-[#C5A059]"
              >
                Cherubim IT
              </a>
            </div>
          </div>

          <div className="relative border border-white/10 bg-[#171717]/72 p-4 shadow-[0_42px_100px_-52px_rgba(0,0,0,0.82)] backdrop-blur-sm sm:p-6">
            <div
              className="relative overflow-hidden border border-white/10"
              style={{
                backgroundImage: `linear-gradient(180deg, rgba(7,7,8,0.26), rgba(7,7,8,0.72)), url(${footerBackground})`,
                backgroundPosition: 'center',
                backgroundSize: 'cover',
              }}
            >
              <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.12),transparent_38%,rgba(197,160,89,0.14)_100%)]" />
              <div className="relative flex min-h-48 flex-col justify-between p-6 sm:p-8">
                <div className="flex items-start justify-between gap-6">
                  <div>
                    <div className="text-[0.68rem] font-medium tracking-[0.3em] text-[#D4B373] uppercase">
                      Disciplers of Nations Academy
                    </div>
                    <div className="mt-3 font-serif text-[clamp(2rem,3.5vw,3rem)] leading-[0.94] tracking-[-0.045em] text-white">
                      DINA
                    </div>
                  </div>
                  <div className="border border-white/12 bg-black/18 px-4 py-3 text-[0.9rem] font-medium tracking-[0.26em] text-[#E9D9B4] uppercase">
                    {new Date().getFullYear()}
                  </div>
                </div>
              </div>
            </div>

            <div className="border-x border-b border-white/10 bg-[#151515]/88 px-6 py-7 sm:px-8 sm:py-8">
              <div className="border border-white/10 bg-white/3 p-5 shadow-[0_22px_36px_-30px_rgba(0,0,0,0.4)]">
                {rightPanel}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )

  if (submitted) {
    return pageShell(
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <CheckCircle className="h-5 w-5 shrink-0 text-[#6FCF97]" />
          <div className="text-[0.68rem] font-medium tracking-[0.3em] text-[#6FCF97] uppercase">
            Application submitted
          </div>
        </div>
        <p className="text-sm leading-7 text-[#D6CCBE]">
          Thank you for applying. We will review your application and be in
          touch.
        </p>
        <div className="h-px w-full bg-white/10" />
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-[0.68rem] font-medium tracking-[0.14em] text-[#9B8A73] uppercase transition-colors hover:text-[#C5A059]"
        >
          ← Back to home
        </Link>
      </div>,
    )
  }

  return pageShell(
    <form
      onSubmit={(e) => {
        e.preventDefault()
        e.stopPropagation()
        form.handleSubmit()
      }}
    >
      <FieldGroup>
        <form.Field name="name" validators={{ onChange: required }}>
          {(field) => (
            <Field>
              <FieldLabel htmlFor="enrol-name" theme="dark">
                Full Name
              </FieldLabel>
              <Input
                id="enrol-name"
                name="name"
                type="text"
                placeholder="John Doe"
                theme="dark"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                required
              />
              {field.state.meta.errors.length > 0 &&
                field.state.meta.isTouched && (
                  <FieldDescription className="text-destructive">
                    {field.state.meta.errors[0]}
                  </FieldDescription>
                )}
            </Field>
          )}
        </form.Field>

        <form.Field name="email" validators={{ onChange: validEmail }}>
          {(field) => (
            <Field>
              <FieldLabel htmlFor="enrol-email" theme="dark">
                Email
              </FieldLabel>
              <Input
                id="enrol-email"
                name="email"
                type="email"
                placeholder="your@email.com"
                theme="dark"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                required
              />
              {field.state.meta.errors.length > 0 &&
                field.state.meta.isTouched && (
                  <FieldDescription className="text-destructive">
                    {field.state.meta.errors[0]}
                  </FieldDescription>
                )}
            </Field>
          )}
        </form.Field>

        <form.Field name="bio" validators={{ onChange: minLength(300) }}>
          {(field) => (
            <Field>
              <FieldLabel htmlFor="enrol-bio" theme="dark">
                Application
              </FieldLabel>
              <textarea
                id="enrol-bio"
                name="bio"
                placeholder="Tell us about yourself, your faith journey, and why you want to join DINA…"
                rows={6}
                required
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                className="w-full resize-none border border-white/12 bg-[#1A1A1A] px-3 py-2.5 text-sm leading-7 text-[#F8F4EC] placeholder:text-[#5A5248] focus:border-[#C5A059]/50 focus:ring-1 focus:ring-[#C5A059]/30 focus:outline-none"
              />
              <div className="flex items-start justify-between gap-4">
                {field.state.meta.errors.length > 0 &&
                field.state.meta.isTouched ? (
                  <FieldDescription theme="dark" className="text-destructive">
                    {field.state.meta.errors[0]}
                  </FieldDescription>
                ) : (
                  <FieldDescription theme="dark">
                    Minimum 300 characters.
                  </FieldDescription>
                )}
                <span className="shrink-0 text-[0.62rem] text-[#5A5248]">
                  {field.state.value.length} chars
                </span>
              </div>
            </Field>
          )}
        </form.Field>

        <Field className="pt-2">
          <form.Subscribe
            selector={(state) => [state.canSubmit, state.isSubmitting]}
          >
            {([canSubmit, isSubmitting]) => (
              <button
                type="submit"
                disabled={!canSubmit || isSubmitting}
                className="h-11 w-full border border-[#C5A059]/55 bg-linear-to-b from-[#2A2A2A] to-[#111111] font-serif tracking-[0.12em] text-[#E9D9B4] transition-opacity hover:opacity-80 disabled:opacity-40"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Application'}
              </button>
            )}
          </form.Subscribe>

          <FieldDescription theme="dark" className="pt-1 text-center">
            Already have an account?{' '}
            <Link
              to="/login"
              className="text-[#C5A059] underline-offset-4 transition-colors hover:underline"
            >
              Sign in
            </Link>
          </FieldDescription>
        </Field>
      </FieldGroup>
    </form>,
  )
}
