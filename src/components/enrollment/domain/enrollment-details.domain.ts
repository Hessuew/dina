import { format } from 'date-fns'
import type { MaybeRedactedEnrollment } from '@/utils/enrolment/domain/enrolment.domain'

const EMPTY = '—'

const GENDER_LABELS = {
  male: 'Male',
  female: 'Female',
} as const

/** City and country joined with a comma, skipping empty parts. */
export function formatEnrollmentAddress(
  enrollment: Pick<MaybeRedactedEnrollment, 'currentCity' | 'currentCountry'>,
): string {
  return [enrollment.currentCity, enrollment.currentCountry]
    .filter(Boolean)
    .join(', ')
}

export type EnrollmentDetailsView = {
  submitted: string
  preferredName: string
  showContact: boolean
  email: string
  whatsApp: string
  yearOfBirth: MaybeRedactedEnrollment['yearOfBirth']
  gender: string
  nationality: string
  address: string
  churchAffiliations: string
}

/**
 * Derive the read-only display strings the enrollment field grid renders:
 * formatted submission date, gender label, joined address, contact-field
 * visibility, and the em-dash fallbacks for empty optional fields.
 */
export function buildEnrollmentDetailsView({
  enrollment,
  isAdmin,
}: {
  enrollment: MaybeRedactedEnrollment
  isAdmin: boolean
}): EnrollmentDetailsView {
  return {
    submitted: format(new Date(enrollment.createdAt), 'MMM d, yyyy'),
    preferredName: enrollment.preferredName || EMPTY,
    showContact: isAdmin,
    email: enrollment.email ?? '',
    whatsApp: enrollment.phoneWhatsApp ?? '',
    yearOfBirth: enrollment.yearOfBirth,
    gender: GENDER_LABELS[enrollment.gender],
    nationality: enrollment.nationalityCitizenship || EMPTY,
    address: formatEnrollmentAddress(enrollment) || EMPTY,
    churchAffiliations: enrollment.churchAffiliations || EMPTY,
  }
}
