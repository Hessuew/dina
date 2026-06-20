import { describe, expect, it } from 'vitest'
import {
  buildEnrollmentDetailsView,
  formatEnrollmentAddress,
} from './enrollment-details.domain'
import type { MaybeRedactedEnrollment } from '@/utils/enrolment/domain/enrolment.domain'

function makeEnrollment(
  overrides: Partial<MaybeRedactedEnrollment> = {},
): MaybeRedactedEnrollment {
  return {
    id: 'enr_1',
    status: 'pending',
    createdAt: new Date('2026-01-15T00:00:00Z'),
    preferredName: 'Sam',
    email: 'sam@example.com',
    phoneWhatsApp: '+1 555 0100',
    yearOfBirth: 1990,
    gender: 'male',
    nationalityCitizenship: 'Canadian',
    currentCity: 'Toronto',
    currentCountry: 'Canada',
    churchAffiliations: 'Grace Church',
    aboutYourself: 'about',
    expectationsAlignment: 'expectations',
    ...overrides,
  } as MaybeRedactedEnrollment
}

describe('formatEnrollmentAddress', () => {
  it('joins city and country with a comma', () => {
    expect(
      formatEnrollmentAddress({
        currentCity: 'Toronto',
        currentCountry: 'Canada',
      }),
    ).toBe('Toronto, Canada')
  })

  it('omits empty parts', () => {
    expect(
      formatEnrollmentAddress({ currentCity: 'Toronto', currentCountry: null }),
    ).toBe('Toronto')
    expect(
      formatEnrollmentAddress({ currentCity: null, currentCountry: 'Canada' }),
    ).toBe('Canada')
  })

  it('returns an empty string when both parts are missing', () => {
    expect(
      formatEnrollmentAddress({ currentCity: null, currentCountry: null }),
    ).toBe('')
  })
})

describe('buildEnrollmentDetailsView', () => {
  it('formats the submitted date and passes through plain fields', () => {
    const view = buildEnrollmentDetailsView({
      enrollment: makeEnrollment(),
      isAdmin: true,
    })
    expect(view.submitted).toBe('Jan 15, 2026')
    expect(view.preferredName).toBe('Sam')
    expect(view.yearOfBirth).toBe(1990)
    expect(view.address).toBe('Toronto, Canada')
    expect(view.nationality).toBe('Canadian')
    expect(view.churchAffiliations).toBe('Grace Church')
  })

  it('maps gender to a display label', () => {
    expect(
      buildEnrollmentDetailsView({
        enrollment: makeEnrollment({ gender: 'male' }),
        isAdmin: false,
      }).gender,
    ).toBe('Male')
    expect(
      buildEnrollmentDetailsView({
        enrollment: makeEnrollment({ gender: 'female' }),
        isAdmin: false,
      }).gender,
    ).toBe('Female')
  })

  it('shows contact fields only for admins', () => {
    const admin = buildEnrollmentDetailsView({
      enrollment: makeEnrollment(),
      isAdmin: true,
    })
    expect(admin.showContact).toBe(true)
    expect(admin.email).toBe('sam@example.com')
    expect(admin.whatsApp).toBe('+1 555 0100')

    const nonAdmin = buildEnrollmentDetailsView({
      enrollment: makeEnrollment(),
      isAdmin: false,
    })
    expect(nonAdmin.showContact).toBe(false)
  })

  it('falls back to an em dash for empty optional fields', () => {
    const view = buildEnrollmentDetailsView({
      enrollment: makeEnrollment({
        preferredName: null,
        nationalityCitizenship: null,
        currentCity: null,
        currentCountry: null,
        churchAffiliations: null,
      }),
      isAdmin: true,
    })
    expect(view.preferredName).toBe('—')
    expect(view.nationality).toBe('—')
    expect(view.address).toBe('—')
    expect(view.churchAffiliations).toBe('—')
  })

  it('defaults missing redacted contact values to empty strings', () => {
    const view = buildEnrollmentDetailsView({
      enrollment: makeEnrollment({
        email: undefined,
        phoneWhatsApp: undefined,
      }),
      isAdmin: true,
    })
    expect(view.email).toBe('')
    expect(view.whatsApp).toBe('')
  })
})
