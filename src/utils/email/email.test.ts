import { describe, expect, it, vi } from 'vitest'
import { sendInvitationEmail, setEmailSender } from './index'
import type { EmailSender, InvitationEmailMessage } from './types'

vi.mock('@/env', () => ({
  env: {
    APP_URL: 'https://example.test',
    RESEND_API_KEY: 'test',
    RESEND_FROM_EMAIL: 'noreply@test.dev',
  },
}))

describe('sendInvitationEmail', () => {
  it('builds the invitation link and returns the provider message id', async () => {
    let sent: InvitationEmailMessage | null = null
    const sender: EmailSender = {
      sendInvitation: async (message) => {
        await Promise.resolve()
        sent = message
        return { providerMessageId: 'email-1' }
      },
    }
    setEmailSender(sender)

    await expect(
      sendInvitationEmail({
        to: 'applicant@test.dev',
        invitedByName: 'Admin User',
        role: 'student',
        token: 'token-123',
        lecturerTitle: 'Dean',
        appUrl: 'https://example.test',
      }),
    ).resolves.toBe('email-1')
    expect(sent).toEqual({
      to: 'applicant@test.dev',
      invitedByName: 'Admin User',
      role: 'student',
      inviteLink: 'https://example.test/signup?token=token-123',
      lecturerTitle: 'Dean',
    })
  })
})
