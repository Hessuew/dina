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
import { FieldDescription, FieldGroup } from '@/components/ui/field'
import { SelectItem } from '@/components/ui/select'
import { useAppForm } from '@/hooks/form'
import { createEnrollment } from '@/utils/enrolment/enrollments'

function optionalText(value: string): string | undefined {
  const trimmed = value.trim()
  return trimmed ? trimmed : undefined
}

function required({ value }: { value: string | number }) {
  return String(value).trim() ? undefined : 'This field is required'
}

function validEmail({ value }: { value: string }) {
  if (!value.trim()) return 'Email is required'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    return 'Enter a valid email address'
  }
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

function validYear({ value }: { value: string | number }) {
  const trimmed = String(value).trim()
  if (!trimmed || trimmed === '0') return 'Year of birth is required'
  const year = Number(trimmed)
  if (!Number.isInteger(year)) return 'Year of birth must be a whole number'
  const current = new Date().getFullYear()
  if (year < 1900) return 'Year of birth must be reasonable'
  if (year > current) return 'Year of birth cannot be in the future'
  return undefined
}

function requiredTextWithMaxWords(max: number) {
  return (props: { value: string }) => required(props) || maxWords(max)(props)
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
          return Boolean(required({ value: v }))
        case 'aboutYourself':
        case 'expectationsAlignment':
          return Boolean(requiredTextWithMaxWords(200)({ value: v }))
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
          <form.AppField
            name="fullLegalName"
            validators={{ onBlur: required, onSubmit: required }}
          >
            {(field) => (
              <field.TextField
                id="enrol-full-legal-name"
                label="Full legal name"
                required
                placeholder="John Doe"
              />
            )}
          </form.AppField>
        )
      case 'preferredName':
        return (
          <form.AppField name="preferredName">
            {(field) => (
              <field.TextField
                id="enrol-preferred-name"
                label="Preferred name"
                placeholder="John"
              />
            )}
          </form.AppField>
        )
      case 'email':
        return (
          <form.AppField
            name="email"
            validators={{ onBlur: validEmail, onSubmit: validEmail }}
          >
            {(field) => (
              <field.TextField
                id="enrol-email"
                label="Email"
                required
                type="email"
                placeholder="your@email.com"
              />
            )}
          </form.AppField>
        )
      case 'phoneWhatsApp':
        return (
          <form.AppField
            name="phoneWhatsApp"
            validators={{ onBlur: required, onSubmit: required }}
          >
            {(field) => (
              <field.TextField
                id="enrol-phone"
                label="Phone number (WhatsApp)"
                required
                type="tel"
                placeholder="+358 40 123 4567"
              />
            )}
          </form.AppField>
        )
      case 'yearOfBirth':
        return (
          <form.AppField
            name="yearOfBirth"
            validators={{ onBlur: validYear, onSubmit: validYear }}
          >
            {(field) => (
              <field.NumberField
                id="enrol-yob"
                label="Year of birth"
                required
                placeholder="1996"
              />
            )}
          </form.AppField>
        )
      case 'gender':
        return (
          <form.AppField
            name="gender"
            validators={{ onBlur: required, onSubmit: required }}
          >
            {(field) => (
              <field.SelectField id="enrol-gender" label="Gender" required>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
              </field.SelectField>
            )}
          </form.AppField>
        )
      case 'nationalityCitizenship':
        return (
          <form.AppField name="nationalityCitizenship">
            {(field) => (
              <field.TextField
                id="enrol-nationality"
                label="Nationality / citizenship"
                placeholder="Finnish"
              />
            )}
          </form.AppField>
        )
      case 'currentCity':
        return (
          <form.AppField name="currentCity">
            {(field) => (
              <field.TextField
                id="enrol-city"
                label="Current city"
                placeholder="Helsinki"
              />
            )}
          </form.AppField>
        )
      case 'currentCountry':
        return (
          <form.AppField name="currentCountry">
            {(field) => (
              <field.TextField
                id="enrol-country"
                label="Current country"
                placeholder="Finland"
              />
            )}
          </form.AppField>
        )
      case 'churchAffiliations':
        return (
          <form.AppField name="churchAffiliations">
            {(field) => (
              <field.TextField
                id="enrol-church"
                label="Church affiliations"
                placeholder="Church name, network, etc."
              />
            )}
          </form.AppField>
        )
      case 'aboutYourself':
        return (
          <form.AppField
            name="aboutYourself"
            validators={{
              onBlur: requiredTextWithMaxWords(200),
              onSubmit: requiredTextWithMaxWords(200),
            }}
          >
            {(field) => (
              <field.TextAreaFieldWithWordCount
                id="enrol-about"
                label="Tell us about yourself and why you are interested in this program"
                required
                placeholder="Write up to 200 words..."
                rows={6}
                maxWords={200}
              />
            )}
          </form.AppField>
        )
      case 'expectationsAlignment':
        return (
          <form.AppField
            name="expectationsAlignment"
            validators={{
              onBlur: requiredTextWithMaxWords(200),
              onSubmit: requiredTextWithMaxWords(200),
            }}
          >
            {(field) => (
              <field.TextAreaFieldWithWordCount
                id="enrol-expectations"
                label="Tell us what you expect to achieve at the end of this program, and how it would align with your personal pursuit of Jesus Christ"
                required
                placeholder="Write up to 200 words..."
                rows={6}
                maxWords={200}
              />
            )}
          </form.AppField>
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
