import crypto from 'node:crypto'

const OTP_EXPIRY_MS = 10 * 60 * 1000
const RESEND_COOLDOWN_MS = 60 * 1000

export function generateOTP(): string {
  return ((crypto.randomBytes(3).readUIntBE(0, 3) % 900000) + 100000).toString()
}

export function hashValue(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex')
}

export function calculateOtpExpiry(now: Date): Date {
  return new Date(now.getTime() + OTP_EXPIRY_MS)
}

export function checkOtpResendCooldown(otpExpiresAt: Date | null, now: Date): number | null {
  if (!otpExpiresAt) return null
  const lastSentAt = new Date(otpExpiresAt.getTime() - OTP_EXPIRY_MS)
  const timeSinceMs = now.getTime() - lastSentAt.getTime()
  if (timeSinceMs >= RESEND_COOLDOWN_MS) return null
  return Math.ceil((RESEND_COOLDOWN_MS - timeSinceMs) / 1000)
}

export function validateOtpRecord(
  record: { otpHash: string | null; otpExpiresAt: Date | null; attempts: number },
  now: Date,
): { valid: boolean; message: string } {
  if (!record.otpHash || !record.otpExpiresAt) {
    return { valid: false, message: 'No verification code found. Please request a new one.' }
  }
  if (now > record.otpExpiresAt) {
    return { valid: false, message: 'Verification code has expired. Please request a new one.' }
  }
  if (record.attempts >= 5) {
    return { valid: false, message: 'Too many failed attempts. Please request a new code.' }
  }
  return { valid: true, message: '' }
}

export function validateSignupInvitation(
  invitation: { status: string; expiresAt: Date; email: string },
  email: string,
  now: Date,
): { valid: boolean; message: string } {
  if (invitation.status !== 'pending') {
    return { valid: false, message: 'This invitation has already been used or revoked' }
  }
  if (now > invitation.expiresAt) {
    return { valid: false, message: 'This invitation has expired' }
  }
  if (invitation.email !== email) {
    return { valid: false, message: 'Email does not match invitation' }
  }
  return { valid: true, message: '' }
}
