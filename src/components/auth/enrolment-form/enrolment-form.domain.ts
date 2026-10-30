import type { CreateEnrollmentInput } from '@/schemas/enrollment.schema'

export interface EnrolmentFormValues {
  fullLegalName: string
  preferredName: string
  email: string
  yearOfBirth: string
  gender: string
  nationalityCitizenship: string
  phoneWhatsApp: string
  currentCity: string
  currentCountry: string
  churchAffiliations: string
  aboutYourself: string
  expectationsAlignment: string
}

function optionalText(value: string): string | undefined {
  const trimmed = value.trim()
  return trimmed ? trimmed : undefined
}

export function buildEnrolmentSubmissionData(
  value: EnrolmentFormValues,
): CreateEnrollmentInput {
  return {
    fullLegalName: value.fullLegalName,
    preferredName: optionalText(value.preferredName),
    email: value.email,
    yearOfBirth: Number(value.yearOfBirth),
    gender: value.gender as CreateEnrollmentInput['gender'],
    nationalityCitizenship: optionalText(value.nationalityCitizenship),
    phoneWhatsApp: value.phoneWhatsApp,
    currentCity: optionalText(value.currentCity),
    currentCountry: optionalText(value.currentCountry),
    churchAffiliations: optionalText(value.churchAffiliations),
    aboutYourself: value.aboutYourself,
    expectationsAlignment: value.expectationsAlignment,
  }
}

export type EnrolmentKeyNavigation =
  'next' | 'next-prevent-default' | 'back' | 'none'

export function resolveEnrolmentKeyNavigation(
  key: string,
  shiftKey: boolean,
  isTextareaTarget: boolean,
  currentStep: number,
): EnrolmentKeyNavigation {
  if (isTextareaTarget) return 'none'
  if (key === 'Enter' && !shiftKey) return 'next-prevent-default'
  if (key === 'ArrowRight') return 'next'
  if (key === 'ArrowLeft' && currentStep > 0) return 'back'
  return 'none'
}

type Tracker = (...args: Array<unknown>) => void

export type EnrolmentTrackingScript = {
  src?: string
  async?: boolean
  children?: string
}

export function buildEnrolmentTrackingScripts(input: {
  googleAdsId: string | undefined
  metaPixelId: string | undefined
}): Array<EnrolmentTrackingScript> {
  const scripts: Array<EnrolmentTrackingScript> = []
  if (input.googleAdsId) {
    scripts.push(
      {
        src: `https://www.googletagmanager.com/gtag/js?id=${input.googleAdsId}`,
        async: true,
      },
      {
        children: `
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${input.googleAdsId}');
        `,
      },
    )
  }
  if (input.metaPixelId) {
    scripts.push({
      children: `
        !function(f,b,e,v,n,t,s)
        {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};
        if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
        n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t,s)}(window, document,'script',
        'https://connect.facebook.net/en_US/fbevents.js');
        fbq('init', '${input.metaPixelId}');
        fbq('track', 'PageView');
      `,
    })
  }
  return scripts
}

export interface EnrolmentSuccessEffectsInput {
  success: boolean | undefined
  windowRef: { gtag?: Tracker; fbq?: Tracker } | undefined
  googleAdsId: string | undefined
  onSubmitted: () => void
  navigate: () => void
}

export function runEnrolmentSuccessEffects(
  input: EnrolmentSuccessEffectsInput,
): void {
  if (!input.success) return
  input.onSubmitted()
  if (input.windowRef?.gtag && input.googleAdsId) {
    input.windowRef.gtag('event', 'conversion', {
      send_to: `${input.googleAdsId}/-2LiCJCpp7AcEJ6zn81D`,
      value: 1.0,
      currency: 'EUR',
    })
  }
  if (input.windowRef?.fbq) {
    input.windowRef.fbq('track', 'Lead')
  }
  input.navigate()
}

export function validateEnrolmentYear(
  value: string | number,
  currentYear = new Date().getFullYear(),
): string | undefined {
  const trimmed = String(value).trim()
  if (!trimmed || trimmed === '0') return 'Year of birth is required'
  const year = Number(trimmed)
  if (!Number.isInteger(year)) return 'Year of birth must be a whole number'
  if (year < 1900) return 'Year of birth must be reasonable'
  if (year > currentYear) return 'Year of birth cannot be in the future'
  return undefined
}
