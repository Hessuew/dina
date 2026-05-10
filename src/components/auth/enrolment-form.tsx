import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { CheckCircle, ChevronLeft, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { useServerFn } from '@tanstack/react-start'
import houseFoundation from '@/assets/images/house/house_foundation.webp'
import houseGround from '@/assets/images/house/house_ground.webp'
import houseFraming from '@/assets/images/house/house_framing.webp'
import houseWalls from '@/assets/images/house/house_walls.webp'
import houseInterior from '@/assets/images/house/house_interior.webp'
import houseRoof from '@/assets/images/house/house_roof.webp'
import { Button } from '@/components/ui/button'
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
import { useAppForm } from '@/hooks/form'
import { createEnrollment } from '@/utils/enrolment/enrollments'

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

const ENROLMENT_DEFAULT_VALUES = {
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
}

const STEPS = [
  {
    id: 'identity',
    title: 'Your Identity',
    image: houseGround,
    fields: ['fullLegalName', 'preferredName', 'email'],
  },
  {
    id: 'contact',
    title: 'Contact Details',
    image: houseFoundation,
    fields: ['phoneWhatsApp', 'yearOfBirth', 'gender'],
  },
  {
    id: 'location',
    title: 'Location',
    image: houseWalls,
    fields: ['nationalityCitizenship', 'currentCity', 'currentCountry'],
  },
  {
    id: 'church',
    title: 'Church Context',
    image: houseFraming,
    fields: ['churchAffiliations'],
  },
  {
    id: 'story',
    title: 'Your Story',
    image: houseInterior,
    fields: ['aboutYourself'],
  },
  {
    id: 'roof',
    title: 'Your Roof',
    image: houseRoof,
    fields: ['expectationsAlignment'],
  },
] as const

type EnrolmentFieldName = (typeof STEPS)[number]['fields'][number]

export function EnrolmentForm() {
  const [submitted, setSubmitted] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)

  const createEnrollmentFn = useServerFn(createEnrollment)

  const form = useAppForm({
    defaultValues: ENROLMENT_DEFAULT_VALUES,
    onSubmit: async ({ value }) => {
      try {
        await createEnrollmentFn({
          data: {
            fullLegalName: value.fullLegalName,
            preferredName: optionalText(value.preferredName),
            email: value.email,
            yearOfBirth: Number(value.yearOfBirth),
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

  const currentStepConfig = STEPS[currentStep]

  const validateCurrentStep = (): boolean => {
    const values = form.state.values
    const hasErrors = currentStepConfig.fields.some((fieldName) => {
      const v = values[fieldName]
      switch (fieldName) {
        case 'fullLegalName':
        case 'phoneWhatsApp':
          return Boolean(required({ value: v }))
        case 'email':
          return Boolean(validEmail({ value: v }))
        case 'yearOfBirth':
          return Boolean(validYear({ value: v }))
        case 'gender':
          return Boolean(requiredSelect({ value: v }))
        case 'aboutYourself':
        case 'expectationsAlignment':
          return Boolean(required({ value: v }) || maxWords(200)({ value: v }))
        default:
          return false
      }
    })

    if (!hasErrors) return true
    toast.error('Please complete this step before continuing.')
    return false
  }

  const handleNext = () => {
    if (!validateCurrentStep()) return

    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      form.handleSubmit()
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLTextAreaElement) return

      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleNext()
      } else if (e.key === 'ArrowRight') {
        handleNext()
      } else if (e.key === 'ArrowLeft' && currentStep > 0) {
        handleBack()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentStep, handleNext, handleBack])

  const pageShell = (rightPanel: React.ReactNode) => (
    <section className="relative isolate min-h-svh overflow-hidden bg-[#111111] text-[#F8F4EC]">
      <div className="grid min-h-svh lg:grid-cols-2">
        <aside className="relative hidden min-h-svh overflow-hidden lg:block">
          <img
            key={currentStepConfig.id}
            src={currentStepConfig.image}
            alt={currentStepConfig.title}
            className="animate-in fade-in h-full w-full object-cover duration-1500"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.28),rgba(0,0,0,0.62)),linear-gradient(180deg,rgba(0,0,0,0.12),rgba(0,0,0,0.68))]" />
          <div className="absolute inset-x-0 bottom-0 p-10 xl:p-14">
            <div className="max-w-md border border-white/12 bg-black/28 p-6 backdrop-blur-sm">
              <div className="text-[0.68rem] font-medium tracking-[0.3em] text-[#D4B373] uppercase">
                Enrolment 2026
              </div>
              <h1 className="mt-4 font-serif text-[clamp(3rem,5vw,5.5rem)] leading-[0.9] tracking-[-0.055em] text-white">
                Apply for enrolment
              </h1>
              <p className="mt-5 text-sm leading-7 tracking-[0.04em] text-[#E6DDCF]">
                "Through desire a man, having separated himself, seeketh and
                intermeddleth with all wisdom."
              </p>
            </div>
          </div>
        </aside>

        <div className="relative flex min-h-svh flex-col items-center justify-center bg-[#151515] px-5 pt-24 pb-10 sm:px-8 lg:px-12 lg:pt-20">
          <div className="p-6 text-center lg:hidden">
            <h1 className="mt-4 font-serif text-[clamp(3rem,5vw,5.5rem)] leading-[0.9] tracking-[-0.055em] text-white">
              Apply for enrolment
            </h1>
          </div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(197,160,89,0.14),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.06),transparent_24%)]" />
          <div className="relative w-full max-w-xl">{rightPanel}</div>
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

  const renderField = (fieldName: EnrolmentFieldName) => {
    switch (fieldName) {
      case 'fullLegalName':
        return (
          <form.Field name="fullLegalName" validators={{ onBlur: required }}>
            {(field) => (
              <Field>
                <FieldLabel
                  className="normal-case"
                  htmlFor="enrol-full-legal-name"
                  theme="dark"
                >
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
                {field.state.meta.errors[0] && (
                  <FieldDescription theme="dark" className="text-destructive">
                    {String(field.state.meta.errors[0])}
                  </FieldDescription>
                )}
              </Field>
            )}
          </form.Field>
        )
      case 'preferredName':
        return (
          <form.Field name="preferredName">
            {(field) => (
              <Field>
                <FieldLabel
                  className="normal-case"
                  htmlFor="enrol-preferred-name"
                  theme="dark"
                >
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
        )
      case 'email':
        return (
          <form.Field name="email" validators={{ onBlur: validEmail }}>
            {(field) => (
              <Field>
                <FieldLabel
                  className="normal-case"
                  htmlFor="enrol-email"
                  theme="dark"
                >
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
                {field.state.meta.errors[0] && (
                  <FieldDescription theme="dark" className="text-destructive">
                    {String(field.state.meta.errors[0])}
                  </FieldDescription>
                )}
              </Field>
            )}
          </form.Field>
        )
      case 'phoneWhatsApp':
        return (
          <form.Field name="phoneWhatsApp" validators={{ onBlur: required }}>
            {(field) => (
              <Field>
                <FieldLabel
                  className="normal-case"
                  htmlFor="enrol-phone"
                  theme="dark"
                >
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
                {field.state.meta.errors[0] && (
                  <FieldDescription theme="dark" className="text-destructive">
                    {String(field.state.meta.errors[0])}
                  </FieldDescription>
                )}
              </Field>
            )}
          </form.Field>
        )
      case 'yearOfBirth':
        return (
          <form.Field name="yearOfBirth" validators={{ onBlur: validYear }}>
            {(field) => (
              <Field>
                <FieldLabel
                  className="normal-case"
                  htmlFor="enrol-yob"
                  theme="dark"
                >
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
                {field.state.meta.errors[0] && (
                  <FieldDescription theme="dark" className="text-destructive">
                    {String(field.state.meta.errors[0])}
                  </FieldDescription>
                )}
              </Field>
            )}
          </form.Field>
        )
      case 'gender':
        return (
          <form.Field name="gender" validators={{ onBlur: requiredSelect }}>
            {(field) => (
              <Field>
                <FieldLabel
                  className="normal-case"
                  htmlFor="enrol-gender"
                  theme="dark"
                >
                  Gender
                </FieldLabel>
                <Select
                  value={field.state.value || undefined}
                  onValueChange={(value) => {
                    field.handleChange(value ?? '')
                    void field.validate('blur')
                  }}
                >
                  <SelectTrigger
                    id="enrol-gender"
                    className="w-full rounded-none border-white/14 bg-black/20 text-[#F8F4EC] data-[size=default]:h-11"
                  >
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent className="rounded-none border-white/10 bg-[#1A1716] text-[#F8F4EC]">
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                  </SelectContent>
                </Select>
                {field.state.meta.errors[0] && (
                  <FieldDescription theme="dark" className="text-destructive">
                    {String(field.state.meta.errors[0])}
                  </FieldDescription>
                )}
              </Field>
            )}
          </form.Field>
        )
      case 'nationalityCitizenship':
        return (
          <form.Field name="nationalityCitizenship">
            {(field) => (
              <Field>
                <FieldLabel
                  className="normal-case"
                  htmlFor="enrol-nationality"
                  theme="dark"
                >
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
        )
      case 'currentCity':
        return (
          <form.Field name="currentCity">
            {(field) => (
              <Field>
                <FieldLabel
                  className="normal-case"
                  htmlFor="enrol-city"
                  theme="dark"
                >
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
        )
      case 'currentCountry':
        return (
          <form.Field name="currentCountry">
            {(field) => (
              <Field>
                <FieldLabel
                  className="normal-case"
                  htmlFor="enrol-country"
                  theme="dark"
                >
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
        )
      case 'churchAffiliations':
        return (
          <form.Field name="churchAffiliations">
            {(field) => (
              <Field>
                <FieldLabel
                  className="normal-case"
                  htmlFor="enrol-church"
                  theme="dark"
                >
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
        )
      case 'aboutYourself':
        return (
          <form.Field
            name="aboutYourself"
            validators={{ onBlur: (v) => required(v) || maxWords(200)(v) }}
          >
            {(field) => (
              <Field>
                <FieldLabel
                  className="normal-case"
                  htmlFor="enrol-about"
                  theme="dark"
                >
                  Tell us about yourself and why you are interested in this
                  program
                </FieldLabel>
                <textarea
                  id="enrol-about"
                  name="aboutYourself"
                  placeholder="Write up to 200 words..."
                  rows={6}
                  required
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  className="w-full resize-none border border-white/12 bg-[#1A1A1A] px-3 py-2.5 text-sm leading-7 text-[#F8F4EC] placeholder:text-[#5A5248] focus:border-[#C5A059]/50 focus:ring-1 focus:ring-[#C5A059]/30 focus:outline-none"
                />
                <div className="flex items-start justify-between gap-4">
                  {field.state.meta.errors[0] ? (
                    <FieldDescription theme="dark" className="text-destructive">
                      {String(field.state.meta.errors[0])}
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
        )
      case 'expectationsAlignment':
        return (
          <form.Field
            name="expectationsAlignment"
            validators={{ onBlur: (v) => required(v) || maxWords(200)(v) }}
          >
            {(field) => (
              <Field>
                <FieldLabel
                  className="normal-case"
                  htmlFor="enrol-expectations"
                  theme="dark"
                >
                  Tell us what you expect to achieve at the end of this program,
                  and how it would align with your personal pursuit of Jesus
                  Christ.
                </FieldLabel>
                <textarea
                  id="enrol-expectations"
                  name="expectationsAlignment"
                  placeholder="Write up to 200 words..."
                  rows={6}
                  required
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  className="w-full resize-none border border-white/12 bg-[#1A1A1A] px-3 py-2.5 text-sm leading-7 text-[#F8F4EC] placeholder:text-[#5A5248] focus:border-[#C5A059]/50 focus:ring-1 focus:ring-[#C5A059]/30 focus:outline-none"
                />
                <div className="flex items-start justify-between gap-4">
                  {field.state.meta.errors[0] ? (
                    <FieldDescription theme="dark" className="text-destructive">
                      {String(field.state.meta.errors[0])}
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
        )
      default:
        return null
    }
  }

  return pageShell(
    <form
      className="flex min-h-136 flex-col border border-white/10 bg-[#171717]/88 p-5 shadow-[0_42px_100px_-52px_rgba(0,0,0,0.82)] backdrop-blur-sm sm:min-h-144 sm:p-8"
      onSubmit={(e) => {
        e.preventDefault()
        e.stopPropagation()
        if (!validateCurrentStep()) return
        form.handleSubmit()
      }}
    >
      <div className="flex flex-1 flex-col">
        <div className="mb-8 flex items-start gap-4 lg:block">
          <div className="relative h-20 w-20 shrink-0 overflow-hidden border border-white/10 lg:hidden">
            <img
              key={currentStepConfig.id}
              src={currentStepConfig.image}
              alt=""
              className="animate-in fade-in h-full w-full object-cover duration-1500"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-linear-to-t from-black/44 to-transparent" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="mb-3 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <div className="text-[0.68rem] font-medium tracking-[0.3em] text-[#D4B373] uppercase">
                Step {currentStep + 1} of {STEPS.length}
              </div>
              <div className="grid w-full grid-cols-6 gap-1 sm:flex sm:w-auto">
                {STEPS.map((_, index) => (
                  <div
                    key={index}
                    className={`h-1 min-w-0 transition-colors duration-300 sm:w-8 ${
                      index <= currentStep ? 'bg-[#C5A059]' : 'bg-white/20'
                    }`}
                  />
                ))}
              </div>
            </div>
            <h2
              key={currentStep}
              className="animate-in fade-in slide-in-from-right-8 font-serif text-2xl leading-tight text-[#F8F4EC] duration-500"
            >
              {currentStepConfig.title}
            </h2>
          </div>
        </div>

        <FieldGroup className="flex-1">
          <div
            key={currentStep}
            className="animate-in fade-in slide-in-from-right-4 space-y-8 duration-500"
          >
            {currentStepConfig.fields.map(renderField)}
          </div>
        </FieldGroup>

        <div className="mt-auto pt-8">
          <FieldDescription theme="dark" className="mb-4 text-center">
            Already have an account?{' '}
            <Link
              to="/login"
              className="text-[#C5A059] underline-offset-4 transition-colors hover:underline"
            >
              Sign in
            </Link>
          </FieldDescription>

          <div className="flex items-center justify-between gap-4">
            {currentStep > 0 ? (
              <Button
                type="button"
                variant="ghost"
                theme="lightGhost"
                size="sm"
                onClick={handleBack}
                className="h-auto px-0 text-[0.68rem] tracking-[0.14em] text-[#9B8A73] uppercase shadow-none hover:bg-transparent hover:text-[#C5A059]"
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </Button>
            ) : (
              <div />
            )}
            <Button
              type="button"
              theme="dark"
              size="lg"
              onClick={handleNext}
              className="h-11 px-6"
            >
              {currentStep === STEPS.length - 1 ? 'Submit' : 'Next'}
              {currentStep < STEPS.length - 1 && (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </form>,
  )
}
