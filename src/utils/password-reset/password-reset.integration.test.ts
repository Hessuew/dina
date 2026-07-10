import { beforeEach, describe, expect, it, vi } from 'vitest'
import { eq } from 'drizzle-orm'
import type {
  EmailSender,
  TransactionalEmailMessage,
} from '@/utils/email/types'
import { setEmailSender } from '@/utils/email'
import { requestPasswordResetService } from '@/utils/password-reset/service/password-reset.service'
import { seedProfile } from '@/../test/integration/seed'
import { getDb } from '@/../test/integration/db'
import { accountSecurity } from '@/db/schema'

const sendEmail = vi.fn()

async function findSecurity(profileId: string) {
  const db = await getDb()
  return db.query.accountSecurity.findFirst({
    where: eq(accountSecurity.profileId, profileId),
  })
}

beforeEach(() => {
  sendEmail.mockReset().mockResolvedValue({ providerMessageId: 'email.test' })
  const sender: EmailSender = { send: sendEmail }
  setEmailSender(sender)
})

describe('requestPasswordResetService (integration)', () => {
  it('does not send email or reveal that an account is missing', async () => {
    const result = await requestPasswordResetService('missing@test.dev')

    expect(result.success).toBe(true)
    expect(sendEmail).not.toHaveBeenCalled()
  })

  it('stores reset state and sends a semantic password-reset email', async () => {
    const email = 'reset@test.dev'
    const profileId = await seedProfile({ email })

    const result = await requestPasswordResetService(email)

    expect(result.success).toBe(true)
    expect(sendEmail).toHaveBeenCalledOnce()
    const message = sendEmail.mock.calls[0][0] as TransactionalEmailMessage
    expect(message).toMatchObject({
      type: 'passwordReset',
      to: email,
      expiryMinutes: 10,
      resetLink: expect.stringContaining('/reset-password?token='),
    })
    const security = await findSecurity(profileId)
    expect(security?.resetTokenHash).toBeTruthy()
    expect(security?.resetTokenExpiresAt).toBeInstanceOf(Date)
  })

  it('clears reset state when delivery fails', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const email = 'failure@test.dev'
    const profileId = await seedProfile({ email })
    sendEmail.mockRejectedValue(new Error('provider unavailable'))

    const result = await requestPasswordResetService(email)

    expect(result.success).toBe(false)
    const security = await findSecurity(profileId)
    expect(security?.resetTokenHash).toBeNull()
    expect(security?.resetTokenExpiresAt).toBeNull()
    expect(security?.lastResetRequestAt).toBeNull()
    errorSpy.mockRestore()
  })
})
