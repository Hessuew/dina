import { beforeEach, describe, expect, it, vi } from 'vitest'
import { eq } from 'drizzle-orm'
import type {
  EmailSender,
  PasswordResetEmailMessage,
} from '@/utils/email/types'
import { setEmailSender } from '@/utils/email'
import {
  requestPasswordResetService,
  resetPasswordService,
} from '@/utils/password-reset/service/password-reset.service'
import { seedProfile } from '@/../test/integration/seed'
import { getDb } from '@/../test/integration/db'
import { accountSecurity } from '@/db/schema'

const mocks = vi.hoisted(() => ({
  sendEmail: vi.fn(),
  updateUserById: vi.fn(),
}))

vi.mock('@/utils/supabase', () => ({
  getSupabaseAdminClient: () => ({
    auth: { admin: { updateUserById: mocks.updateUserById } },
  }),
}))

async function findSecurity(profileId: string) {
  const db = await getDb()
  return db.query.accountSecurity.findFirst({
    where: eq(accountSecurity.profileId, profileId),
  })
}

beforeEach(() => {
  mocks.sendEmail
    .mockReset()
    .mockResolvedValue({ providerMessageId: 'email.test' })
  mocks.updateUserById.mockReset().mockResolvedValue({ error: null })
  const sender: EmailSender = { send: mocks.sendEmail }
  setEmailSender(sender)
})

describe('requestPasswordResetService (integration)', () => {
  it('does not send email or reveal that an account is missing', async () => {
    const result = await requestPasswordResetService('missing@test.dev')

    expect(result.success).toBe(true)
    expect(mocks.sendEmail).not.toHaveBeenCalled()
  })

  it('stores reset state and sends a semantic password-reset email', async () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
    const email = 'reset@test.dev'
    const profileId = await seedProfile({ email })

    const result = await requestPasswordResetService(email)

    expect(result.success).toBe(true)
    expect(mocks.sendEmail).toHaveBeenCalledOnce()
    const message = mocks.sendEmail.mock
      .calls[0][0] as PasswordResetEmailMessage
    expect(message).toMatchObject({
      type: 'passwordReset',
      to: email,
      expiryMinutes: 10,
      resetLink: expect.stringContaining('/reset-password?token='),
    })
    const security = await findSecurity(profileId)
    expect(security?.resetTokenHash).toBeTruthy()
    expect(security?.resetTokenExpiresAt).toBeInstanceOf(Date)
    const event = infoSpy.mock.calls
      .map(([line]) => JSON.parse(String(line)) as Record<string, unknown>)
      .find((entry) => entry.event === 'password_reset_email_sent')
    expect(event).toMatchObject({
      level: 'info',
      event: 'password_reset_email_sent',
      path: 'serverFn:request_password_reset',
      status: 'success',
      userId: profileId,
    })
    expect(String(infoSpy.mock.calls[0]?.[0])).not.toContain(email)
    infoSpy.mockRestore()
  })

  it('clears reset state when delivery fails', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const email = 'failure@test.dev'
    const profileId = await seedProfile({ email })
    mocks.sendEmail.mockRejectedValue(new Error('provider unavailable'))

    const result = await requestPasswordResetService(email)

    expect(result.success).toBe(false)
    const security = await findSecurity(profileId)
    expect(security?.resetTokenHash).toBeNull()
    expect(security?.resetTokenExpiresAt).toBeNull()
    expect(security?.lastResetRequestAt).toBeNull()
    const event = errorSpy.mock.calls
      .map(([line]) => JSON.parse(String(line)) as Record<string, unknown>)
      .find((entry) => entry.event === 'password_reset_email_failed')
    expect(event).toMatchObject({
      level: 'error',
      event: 'password_reset_email_failed',
      path: 'serverFn:request_password_reset',
      status: 'failure',
      errorCategory: 'password_reset_email_delivery',
      userId: profileId,
    })
    expect(String(errorSpy.mock.calls[0]?.[0])).not.toContain(
      'provider unavailable',
    )
    errorSpy.mockRestore()
  })

  it('updates the password, clears reset state, and logs completion', async () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
    const email = 'complete-reset@test.dev'
    const profileId = await seedProfile({ email })
    await requestPasswordResetService(email)
    const message = mocks.sendEmail.mock
      .calls[0][0] as PasswordResetEmailMessage
    const token = new URL(message.resetLink).searchParams.get('token')

    const result = await resetPasswordService(
      token ?? undefined,
      'new-password',
    )

    expect(result).toEqual({
      success: true,
      message: 'Password reset successfully',
    })
    expect(mocks.updateUserById).toHaveBeenCalledWith(profileId, {
      password: 'new-password',
    })
    const security = await findSecurity(profileId)
    expect(security?.resetTokenHash).toBeNull()
    expect(security?.resetTokenExpiresAt).toBeNull()
    expect(security?.resetTokenAttempts).toBe(0)
    const event = infoSpy.mock.calls
      .map(([line]) => JSON.parse(String(line)) as Record<string, unknown>)
      .find((entry) => entry.event === 'password_reset_completed')
    expect(event).toMatchObject({
      level: 'info',
      event: 'password_reset_completed',
      path: 'serverFn:reset_password',
      status: 'success',
      userId: profileId,
    })
    expect(String(infoSpy.mock.calls.at(-1)?.[0])).not.toContain('new-password')
    infoSpy.mockRestore()
  })

  it('records a redacted event and increments attempts when the password update fails', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const email = 'failed-reset@test.dev'
    const profileId = await seedProfile({ email })
    await requestPasswordResetService(email)
    const message = mocks.sendEmail.mock
      .calls[0][0] as PasswordResetEmailMessage
    const token = new URL(message.resetLink).searchParams.get('token')
    mocks.updateUserById.mockResolvedValue({
      error: {
        code: 'weak_password',
        message: 'password rejected by provider',
      },
    })

    const result = await resetPasswordService(token ?? undefined, 'bad-pass')

    expect(result.success).toBe(false)
    expect((await findSecurity(profileId))?.resetTokenAttempts).toBe(1)
    const event = errorSpy.mock.calls
      .map(([line]) => JSON.parse(String(line)) as Record<string, unknown>)
      .find((entry) => entry.event === 'password_reset_update_failed')
    expect(event).toMatchObject({
      level: 'error',
      event: 'password_reset_update_failed',
      path: 'serverFn:reset_password',
      status: 'failure',
      errorCategory: 'password_reset_update',
      providerCode: 'weak_password',
      userId: profileId,
    })
    expect(String(errorSpy.mock.calls.at(-1)?.[0])).not.toContain(
      'password rejected by provider',
    )
    expect(String(errorSpy.mock.calls.at(-1)?.[0])).not.toContain('bad-pass')
    errorSpy.mockRestore()
  })
})
