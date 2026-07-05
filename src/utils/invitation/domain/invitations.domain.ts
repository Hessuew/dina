import crypto from 'node:crypto'
import { ConflictError, ValidationError } from '@/utils/errors'

type InvitationLike = { status: string; expiresAt: Date }

export const INVITATION_EXPIRY_DAYS = 7

export function generateSecureToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

export function calculateInvitationExpiry(now: Date): Date {
  const expiresAt = new Date(now)
  expiresAt.setDate(expiresAt.getDate() + INVITATION_EXPIRY_DAYS)
  return expiresAt
}

export function validateInvitationActive(
  invitation: InvitationLike,
  now: Date,
): void {
  if (invitation.status !== 'pending') {
    throw new ConflictError(
      'This invitation has already been used or revoked',
      {
        code: 'INVITATION_EXISTS',
        details: { status: invitation.status },
      },
    )
  }
  if (now > invitation.expiresAt) {
    throw new ValidationError('This invitation has expired', {
      code: 'INVITATION_EXPIRED',
      details: { expiresAt: invitation.expiresAt },
    })
  }
}
