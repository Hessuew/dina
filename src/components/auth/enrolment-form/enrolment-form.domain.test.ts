import { describe, expect, it, vi } from 'vitest'
import {
  buildEnrolmentSubmissionData,
  resolveEnrolmentKeyNavigation,
  runEnrolmentSuccessEffects,
  validateEnrolmentYear,
} from './enrolment-form.domain'
import type { EnrolmentFormValues } from './enrolment-form.domain'

const FULL_VALUES: EnrolmentFormValues = {
  fullLegalName: 'John Doe',
  preferredName: 'John',
  email: 'john@example.com',
  yearOfBirth: '1996',
  gender: 'male',
  nationalityCitizenship: 'Finnish',
  phoneWhatsApp: '+358 40 123 4567',
  currentCity: 'Helsinki',
  currentCountry: 'Finland',
  churchAffiliations: 'Some church',
  aboutYourself: 'About me',
  expectationsAlignment: 'My expectations',
}

describe('buildEnrolmentSubmissionData', () => {
  it('maps all provided values, coercing year and keeping optional text', () => {
    expect(buildEnrolmentSubmissionData(FULL_VALUES)).toEqual({
      fullLegalName: 'John Doe',
      preferredName: 'John',
      email: 'john@example.com',
      yearOfBirth: 1996,
      gender: 'male',
      nationalityCitizenship: 'Finnish',
      phoneWhatsApp: '+358 40 123 4567',
      currentCity: 'Helsinki',
      currentCountry: 'Finland',
      churchAffiliations: 'Some church',
      aboutYourself: 'About me',
      expectationsAlignment: 'My expectations',
    })
  })

  it('converts blank/whitespace optional fields to undefined', () => {
    const result = buildEnrolmentSubmissionData({
      ...FULL_VALUES,
      preferredName: '   ',
      nationalityCitizenship: '',
      currentCity: '',
      currentCountry: '  ',
      churchAffiliations: '',
    })

    expect(result.preferredName).toBeUndefined()
    expect(result.nationalityCitizenship).toBeUndefined()
    expect(result.currentCity).toBeUndefined()
    expect(result.currentCountry).toBeUndefined()
    expect(result.churchAffiliations).toBeUndefined()
  })
})

describe('resolveEnrolmentKeyNavigation', () => {
  it('returns none when target is a textarea', () => {
    expect(resolveEnrolmentKeyNavigation('Enter', false, true, 1)).toBe('none')
  })

  it('returns next-prevent-default for Enter without shift', () => {
    expect(resolveEnrolmentKeyNavigation('Enter', false, false, 0)).toBe(
      'next-prevent-default',
    )
  })

  it('returns none for Enter with shift key', () => {
    expect(resolveEnrolmentKeyNavigation('Enter', true, false, 0)).toBe('none')
  })

  it('returns next for ArrowRight', () => {
    expect(resolveEnrolmentKeyNavigation('ArrowRight', false, false, 0)).toBe(
      'next',
    )
  })

  it('returns back for ArrowLeft when not on first step', () => {
    expect(resolveEnrolmentKeyNavigation('ArrowLeft', false, false, 1)).toBe(
      'back',
    )
  })

  it('returns none for ArrowLeft on the first step', () => {
    expect(resolveEnrolmentKeyNavigation('ArrowLeft', false, false, 0)).toBe(
      'none',
    )
  })

  it('returns none for unrelated keys', () => {
    expect(resolveEnrolmentKeyNavigation('Escape', false, false, 2)).toBe(
      'none',
    )
  })
})

describe('validateEnrolmentYear', () => {
  it('returns error for empty string', () => {
    expect(validateEnrolmentYear('')).toBe('Year of birth is required')
  })

  it('returns error for zero', () => {
    expect(validateEnrolmentYear('0')).toBe('Year of birth is required')
  })

  it('returns error for decimal year', () => {
    expect(validateEnrolmentYear('1990.5', 2025)).toBe(
      'Year of birth must be a whole number',
    )
  })

  it('returns error for year before 1900', () => {
    expect(validateEnrolmentYear('1899', 2025)).toBe(
      'Year of birth must be reasonable',
    )
  })

  it('returns error for year in the future', () => {
    expect(validateEnrolmentYear('2026', 2025)).toBe(
      'Year of birth cannot be in the future',
    )
  })

  it('returns undefined for a valid year', () => {
    expect(validateEnrolmentYear('1990', 2025)).toBeUndefined()
  })

  it('accepts numeric input', () => {
    expect(validateEnrolmentYear(1990, 2025)).toBeUndefined()
  })
})

describe('runEnrolmentSuccessEffects', () => {
  it('does nothing when success is falsy', () => {
    const onSubmitted = vi.fn()
    const navigate = vi.fn()
    const gtag = vi.fn()
    const fbq = vi.fn()

    runEnrolmentSuccessEffects({
      success: undefined,
      windowRef: { gtag, fbq },
      googleAdsId: 'AW-123',
      onSubmitted,
      navigate,
    })

    expect(onSubmitted).not.toHaveBeenCalled()
    expect(navigate).not.toHaveBeenCalled()
    expect(gtag).not.toHaveBeenCalled()
    expect(fbq).not.toHaveBeenCalled()
  })

  it('marks submitted and navigates when no window trackers exist', () => {
    const onSubmitted = vi.fn()
    const navigate = vi.fn()

    runEnrolmentSuccessEffects({
      success: true,
      windowRef: undefined,
      googleAdsId: 'AW-123',
      onSubmitted,
      navigate,
    })

    expect(onSubmitted).toHaveBeenCalledOnce()
    expect(navigate).toHaveBeenCalledOnce()
  })

  it('does not fire trackers when window exists but trackers are absent', () => {
    const onSubmitted = vi.fn()
    const navigate = vi.fn()

    runEnrolmentSuccessEffects({
      success: true,
      windowRef: {},
      googleAdsId: 'AW-123',
      onSubmitted,
      navigate,
    })

    expect(onSubmitted).toHaveBeenCalledOnce()
    expect(navigate).toHaveBeenCalledOnce()
  })

  it('fires the gtag conversion event with the configured send_to', () => {
    const gtag = vi.fn()

    runEnrolmentSuccessEffects({
      success: true,
      windowRef: { gtag },
      googleAdsId: 'AW-123',
      onSubmitted: vi.fn(),
      navigate: vi.fn(),
    })

    expect(gtag).toHaveBeenCalledWith('event', 'conversion', {
      send_to: 'AW-123/-2LiCJCpp7AcEJ6zn81D',
      value: 1.0,
      currency: 'EUR',
    })
  })

  it('fires the fbq Lead event', () => {
    const fbq = vi.fn()

    runEnrolmentSuccessEffects({
      success: true,
      windowRef: { fbq },
      googleAdsId: 'AW-123',
      onSubmitted: vi.fn(),
      navigate: vi.fn(),
    })

    expect(fbq).toHaveBeenCalledWith('track', 'Lead')
  })

  it('fires both trackers then navigates when both exist', () => {
    const gtag = vi.fn()
    const fbq = vi.fn()
    const navigate = vi.fn()

    runEnrolmentSuccessEffects({
      success: true,
      windowRef: { gtag, fbq },
      googleAdsId: 'AW-123',
      onSubmitted: vi.fn(),
      navigate,
    })

    expect(gtag).toHaveBeenCalledOnce()
    expect(fbq).toHaveBeenCalledOnce()
    expect(navigate).toHaveBeenCalledOnce()
  })
})
