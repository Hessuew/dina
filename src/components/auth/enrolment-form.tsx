import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useForm } from '@tanstack/react-form'
import { CheckCircle } from 'lucide-react'
import { toast } from 'sonner'
import { useServerFn } from '@tanstack/react-start'
import footerBackground from '@/assets/images/bg/bg_footer.webp'
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createEnrollment } from '@/utils/enrollments'

function required({ value }: { value: string }) {
  return !value.trim() ? 'This field is required' : undefined
}

function validEmail({ value }: { value: string }) {
  if (!value.trim()) return 'Email is required'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
    return 'Enter a valid email address'
  return undefined
}

function countWords(value: string): number {
  const trimmed = value.trim()
  if (!trimmed) return 0
  return trimmed.split(/\s+/).filter(Boolean).length
}

function maxWords(max: number) {
  return ({ value }: { value: string }) =>
    countWords(value) > max ? `Must be ${max} words or fewer` : undefined
}

function validYear({ value }: { value: string }) {
  const trimmed = value.trim()
  if (!trimmed) return 'Year of birth is required'
  const year = Number(trimmed)
  if (!Number.isInteger(year)) return 'Year of birth must be a whole number'
  const current = new Date().getFullYear()
  if (year < 1900) return 'Year of birth must be reasonable'
  if (year > current) return 'Year of birth cannot be in the future'
  return undefined
}

function requiredSelect({ value }: { value: string }) {
  return !value ? 'This field is required' : undefined
}

function optionalText(value: string): string | undefined {
  const trimmed = value.trim()
  return trimmed ? trimmed : undefined
}

export function EnrolmentForm() {
  const [submitted, setSubmitted] = useState(false)

  const createEnrollmentFn = useServerFn(createEnrollment)

  const form = useForm({
    defaultValues: {
      fullLegalName: '',
      preferredName: '',
      email: '',
      yearOfBirth: '',
      gender: '',
      nationalityCitizenship: '',
      phoneWhatsApp: '',
      currentCity: '',
      currentCountry: '',
      churchAffiliations: '',
      aboutYourself: '',
      expectationsAlignment: '',
    },
    onSubmit: async ({ value }) => {
      try {
        await createEnrollmentFn({
          data: {
            fullLegalName: value.fullLegalName,
            preferredName: optionalText(value.preferredName),
            email: value.email,
            yearOfBirth: value.yearOfBirth,
            gender: value.gender as 'male' | 'female',
            nationalityCitizenship: optionalText(value.nationalityCitizenship),
            phoneWhatsApp: value.phoneWhatsApp,
            currentCity: optionalText(value.currentCity),
            currentCountry: optionalText(value.currentCountry),
            churchAffiliations: optionalText(value.churchAffiliations),
            aboutYourself: value.aboutYourself,
            expectationsAlignment: value.expectationsAlignment,
          },
        })

        setSubmitted(true)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Submission failed'
        toast.error(message)
      }
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
        <form.Field name="fullLegalName" validators={{ onChange: required }}>
          {(field) => (
            <Field>
              <FieldLabel htmlFor="enrol-full-legal-name" theme="dark">
                Full legal name
              </FieldLabel>
              <Input
                id="enrol-full-legal-name"
                name="fullLegalName"
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

        <form.Field name="preferredName">
          {(field) => (
            <Field>
              <FieldLabel htmlFor="enrol-preferred-name" theme="dark">
                Preferred name
              </FieldLabel>
              <Input
                id="enrol-preferred-name"
                name="preferredName"
                type="text"
                placeholder="John"
                theme="dark"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
              />
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

        <form.Field name="phoneWhatsApp" validators={{ onChange: required }}>
          {(field) => (
            <Field>
              <FieldLabel htmlFor="enrol-phone" theme="dark">
                Phone number (WhatsApp)
              </FieldLabel>
              <Input
                id="enrol-phone"
                name="phoneWhatsApp"
                type="tel"
                placeholder="+358 40 123 4567"
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

        <div className="grid gap-4 sm:grid-cols-2">
          <form.Field name="yearOfBirth" validators={{ onChange: validYear }}>
            {(field) => (
              <Field>
                <FieldLabel htmlFor="enrol-yob" theme="dark">
                  Year of birth
                </FieldLabel>
                <Input
                  id="enrol-yob"
                  name="yearOfBirth"
                  type="number"
                  placeholder="1996"
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

          <form.Field name="gender" validators={{ onChange: requiredSelect }}>
            {(field) => (
              <Field>
                <FieldLabel htmlFor="enrol-gender" theme="dark">
                  Gender
                </FieldLabel>
                <Select
                  value={field.state.value || undefined}
                  onValueChange={(value) => field.handleChange(value ?? '')}
                >
                  <SelectTrigger
                    id="enrol-gender"
                    className="h-11 w-full rounded-none border-white/14 bg-black/20 text-[#F8F4EC]"
                  >
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent className="rounded-none border-white/10 bg-[#1A1716] text-[#F8F4EC]">
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                  </SelectContent>
                </Select>
                {field.state.meta.errors.length > 0 &&
                  field.state.meta.isTouched && (
                    <FieldDescription className="text-destructive">
                      {field.state.meta.errors[0]}
                    </FieldDescription>
                  )}
              </Field>
            )}
          </form.Field>
        </div>

        <form.Field name="nationalityCitizenship">
          {(field) => (
            <Field>
              <FieldLabel htmlFor="enrol-nationality" theme="dark">
                Nationality / citizenship
              </FieldLabel>
              <Input
                id="enrol-nationality"
                name="nationalityCitizenship"
                type="text"
                placeholder="Finnish"
                theme="dark"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
              />
            </Field>
          )}
        </form.Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <form.Field name="currentCity">
            {(field) => (
              <Field>
                <FieldLabel htmlFor="enrol-city" theme="dark">
                  Current city
                </FieldLabel>
                <Input
                  id="enrol-city"
                  name="currentCity"
                  type="text"
                  placeholder="Helsinki"
                  theme="dark"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                />
              </Field>
            )}
          </form.Field>

          <form.Field name="currentCountry">
            {(field) => (
              <Field>
                <FieldLabel htmlFor="enrol-country" theme="dark">
                  Current country
                </FieldLabel>
                <Input
                  id="enrol-country"
                  name="currentCountry"
                  type="text"
                  placeholder="Finland"
                  theme="dark"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                />
              </Field>
            )}
          </form.Field>
        </div>

        <form.Field name="churchAffiliations">
          {(field) => (
            <Field>
              <FieldLabel htmlFor="enrol-church" theme="dark">
                Church affiliations
              </FieldLabel>
              <Input
                id="enrol-church"
                name="churchAffiliations"
                type="text"
                placeholder="Church name, network, etc."
                theme="dark"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
              />
            </Field>
          )}
        </form.Field>

        <form.Field
          name="aboutYourself"
          validators={{ onChange: (v) => required(v) || maxWords(200)(v) }}
        >
          {(field) => (
            <Field>
              <FieldLabel htmlFor="enrol-about" theme="dark">
                Tell us about yourself and why you are interested in this
                program
              </FieldLabel>
              <textarea
                id="enrol-about"
                name="aboutYourself"
                placeholder="Write up to 200 words…"
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
                    Maximum 200 words.
                  </FieldDescription>
                )}
                <span className="shrink-0 text-[0.62rem] text-[#5A5248]">
                  {countWords(field.state.value)} words
                </span>
              </div>
            </Field>
          )}
        </form.Field>

        <form.Field
          name="expectationsAlignment"
          validators={{ onChange: (v) => required(v) || maxWords(200)(v) }}
        >
          {(field) => (
            <Field>
              <FieldLabel htmlFor="enrol-expectations" theme="dark">
                Tell us what you expect to achieve at the end of this program,
                and how it would align with your personal pursuit of Jesus
                Christ.
              </FieldLabel>
              <textarea
                id="enrol-expectations"
                name="expectationsAlignment"
                placeholder="Write up to 200 words…"
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
                    Maximum 200 words.
                  </FieldDescription>
                )}
                <span className="shrink-0 text-[0.62rem] text-[#5A5248]">
                  {countWords(field.state.value)} words
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
                className="h-11 w-full cursor-pointer border border-[#C5A059]/55 bg-linear-to-b from-[#2A2A2A] to-[#111111] font-serif tracking-[0.12em] text-[#E9D9B4] transition-opacity hover:opacity-80 disabled:opacity-40"
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
