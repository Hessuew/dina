import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ResendEmailSender } from './sender/resend-email-sender'
import { EmailDeliveryError } from './types'
import { sendInvitationEmail, setEmailSender } from './index'
import type { EmailSender, TransactionalEmailMessage } from './types'

const mocks = vi.hoisted(() => ({
  render: vi.fn(),
  send: vi.fn(),
}))

vi.mock('@react-email/render', () => ({ render: mocks.render }))
vi.mock('resend', () => ({
  Resend: vi.fn(() => ({ emails: { send: mocks.send } })),
}))

vi.mock('@/emails/InvitationEmail', () => ({
  InvitationEmail: (props: unknown) => ({ template: 'invitation', props }),
}))
vi.mock('@/emails/OTPVerificationEmail', () => ({
  OTPVerificationEmail: (props: unknown) => ({ template: 'signupOtp', props }),
}))
vi.mock('@/emails/PasswordResetEmail', () => ({
  PasswordResetEmail: (props: unknown) => ({
    template: 'passwordReset',
    props,
  }),
}))
vi.mock('@/emails/EmailChangeVerificationEmail', () => ({
  EmailChangeVerificationEmail: (props: unknown) => ({
    template: 'emailChangeVerification',
    props,
  }),
}))

vi.mock('@/env', () => ({
  env: {
    APP_URL: 'https://example.test',
    RESEND_API_KEY: 'test',
    RESEND_FROM: 'DINA <noreply@test.dev>',
  },
}))

beforeEach(() => {
  mocks.render.mockReset().mockImplementation((email) => JSON.stringify(email))
  mocks.send.mockReset().mockResolvedValue({
    data: { id: 'provider-1' },
    error: null,
  })
})

describe('sendInvitationEmail', () => {
  it('builds the invitation link and returns the provider message id', async () => {
    let sent: TransactionalEmailMessage | null = null
    const sender: EmailSender = {
      send: async (message) => {
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
      type: 'invitation',
      to: 'applicant@test.dev',
      invitedByName: 'Admin User',
      role: 'student',
      inviteLink: 'https://example.test/signup?token=token-123',
      lecturerTitle: 'Dean',
    })
  })
})

describe('ResendEmailSender', () => {
  const cases: Array<{
    message: TransactionalEmailMessage
    subject: string
  }> = [
    {
      message: {
        type: 'invitation',
        to: 'invite@test.dev',
        invitedByName: 'Admin',
        inviteLink: 'https://example.test/signup?token=abc',
        role: 'student',
      },
      subject: "You've been invited to join our Learning Platform",
    },
    {
      message: {
        type: 'signupOtp',
        to: 'otp@test.dev',
        otp: '123456',
        expiryMinutes: 10,
      },
      subject: 'Your verification code',
    },
    {
      message: {
        type: 'passwordReset',
        to: 'reset@test.dev',
        resetLink: 'https://example.test/reset?token=abc',
        expiryMinutes: 10,
      },
      subject: 'Reset your password',
    },
    {
      message: {
        type: 'emailChangeVerification',
        to: 'change@test.dev',
        verifyLink: 'https://example.test/verify?token=abc',
      },
      subject: 'Verify your new email address',
    },
  ]

  it.each(cases)('renders and sends $message.type email', async (testCase) => {
    const sender = new ResendEmailSender()

    await expect(sender.send(testCase.message)).resolves.toEqual({
      providerMessageId: 'provider-1',
    })
    expect(mocks.render).toHaveBeenCalledOnce()
    expect(mocks.send).toHaveBeenCalledWith({
      from: 'DINA <noreply@test.dev>',
      to: testCase.message.to,
      subject: testCase.subject,
      html: expect.stringContaining(testCase.message.type),
    })
  })

  it('normalizes provider failures', async () => {
    mocks.send.mockResolvedValue({
      data: null,
      error: { message: 'provider rejected email' },
    })
    const sender = new ResendEmailSender()

    await expect(sender.send(cases[0].message)).rejects.toBeInstanceOf(
      EmailDeliveryError,
    )
  })
})
