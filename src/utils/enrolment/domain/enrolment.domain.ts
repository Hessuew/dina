import crypto from 'node:crypto'
import type { enrollments, invitations } from '@/db/schema'

type Invitation = typeof invitations.$inferSelect

export function generateSecureToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

export function generateInvitationExpiry(): Date {
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7)
  return expiresAt
}

export function isInvitationResendable(invitation: Invitation): boolean {
  return invitation.status === 'pending'
}

type EnrollmentSelect = typeof enrollments.$inferSelect

export type MaybeRedactedEnrollment = Omit<
  EnrollmentSelect,
  'email' | 'phoneWhatsApp' | 'invitationSent' | 'invitationId'
> & {
  email?: string
  phoneWhatsApp?: string
  invitationSent?: boolean
  invitationId?: string | null
}

export function redactEnrollmentForTeacher(
  enrollment: EnrollmentSelect,
): Omit<
  EnrollmentSelect,
  'email' | 'phoneWhatsApp' | 'invitationSent' | 'invitationId'
> {
  const {
    email: _e,
    phoneWhatsApp: _p,
    invitationSent: _is,
    invitationId: _ii,
    ...rest
  } = enrollment
  return rest
}
