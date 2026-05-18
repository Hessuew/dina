import crypto from 'node:crypto'
import type { invitations } from '@/db/schema'

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
