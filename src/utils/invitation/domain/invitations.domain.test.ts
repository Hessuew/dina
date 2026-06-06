import { describe, expect, it } from 'vitest'
import {
  calculateInvitationExpiry,
  generateSecureToken,
  validateInvitationActive,
} from './invitations.domain'
import { ConflictError, ValidationError } from '@/utils/errors'

describe('generateSecureToken', () => {
  it('returns a 64-character hex string', () => {
    const token = generateSecureToken()
    expect(token).toHaveLength(64)
    expect(token).toMatch(/^[0-9a-f]+$/)
  })

  it('returns a different value on each call', () => {
    expect(generateSecureToken()).not.toBe(generateSecureToken())
  })
})

describe('calculateInvitationExpiry', () => {
  it('returns a date exactly 7 days from the input', () => {
    const now = new Date('2025-01-01T12:00:00Z')
    const expiry = calculateInvitationExpiry(now)
    expect(expiry).toEqual(new Date('2025-01-08T12:00:00Z'))
  })

  it('preserves the time of day from the input date', () => {
    const now = new Date('2025-06-15T09:30:45.123Z')
    const expiry = calculateInvitationExpiry(now)
    expect(expiry.getUTCHours()).toBe(9)
    expect(expiry.getUTCMinutes()).toBe(30)
    expect(expiry.getUTCSeconds()).toBe(45)
  })
})

describe('validateInvitationActive', () => {
  it('does not throw when status is pending and not expired', () => {
    const invitation = { status: 'pending', expiresAt: new Date('2099-01-01') }
    expect(() =>
      validateInvitationActive(invitation, new Date('2025-01-01')),
    ).not.toThrow()
  })

  it('throws ConflictError when status is accepted', () => {
    const invitation = { status: 'accepted', expiresAt: new Date('2099-01-01') }
    expect(() =>
      validateInvitationActive(invitation, new Date('2025-01-01')),
    ).toThrow(ConflictError)
  })

  it('throws ConflictError when status is revoked', () => {
    const invitation = { status: 'revoked', expiresAt: new Date('2099-01-01') }
    expect(() =>
      validateInvitationActive(invitation, new Date('2025-01-01')),
    ).toThrow(ConflictError)
  })

  it('throws ValidationError when expired (now > expiresAt)', () => {
    const invitation = { status: 'pending', expiresAt: new Date('2020-01-01') }
    expect(() =>
      validateInvitationActive(invitation, new Date('2025-01-01')),
    ).toThrow(ValidationError)
  })

  it('does not throw when now equals expiresAt (boundary: not yet expired)', () => {
    const boundary = new Date('2025-06-01T00:00:00Z')
    const invitation = { status: 'pending', expiresAt: boundary }
    expect(() => validateInvitationActive(invitation, boundary)).not.toThrow()
  })
})
