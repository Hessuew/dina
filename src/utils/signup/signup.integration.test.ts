import { randomUUID } from 'node:crypto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { EmailSender } from '@/utils/email/types'
import { setEmailSender } from '@/utils/email'
import {
  resendOtpService,
  signupService,
  verifyOtpService,
} from '@/utils/signup/service/signup.service'
import {
  findInvitationByToken,
  findProfileByEmail,
} from '@/utils/signup/repository'
import * as signupRepository from '@/utils/signup/repository'
import { hashValue } from '@/utils/signup/domain/signup.domain'
import { seedInvitation, seedProfile } from '@/../test/integration/seed'
import { withObservabilityRequest } from '@/utils/observability/request-context'

// Signup is the first integration-tested service with external IO (Supabase Auth,
// Resend email) that PGlite can't run. We mock ONLY those two boundaries here; the
// DB stays real (PGlite via the `@/db` alias), so the repository SQL + domain/
// service orchestration are exercised for real. See docs/TESTING_GUIDE.md / ADR 0009.
const mocks = vi.hoisted(() => ({
  createUser: vi.fn(),
  deleteUser: vi.fn(),
  updateUserById: vi.fn(),
  signInWithPassword: vi.fn(),
  sendEmail: vi.fn(),
}))

vi.mock('@/utils/supabase', () => ({
  getSupabaseAdminClient: () => ({
    auth: {
      admin: {
        createUser: mocks.createUser,
        deleteUser: mocks.deleteUser,
        updateUserById: mocks.updateUserById,
      },
    },
  }),
  getSupabaseServerClient: () => ({
    auth: { signInWithPassword: mocks.signInWithPassword },
  }),
}))

beforeEach(() => {
  mocks.createUser.mockReset()
  mocks.deleteUser.mockReset().mockResolvedValue(undefined)
  mocks.updateUserById
    .mockReset()
    .mockResolvedValue({ data: null, error: null })
  mocks.signInWithPassword.mockReset().mockResolvedValue({ error: null })
  mocks.sendEmail.mockReset().mockResolvedValue({ error: null })
  const sender: EmailSender = {
    send: async (message) => {
      const result = await mocks.sendEmail(message)
      if (result?.error) throw new Error(result.error.message)
      return { providerMessageId: result?.data?.id ?? null }
    },
  }
  setEmailSender(sender)
})

afterEach(() => {
  vi.restoreAllMocks()
})

function findEvent(
  calls: Array<Array<unknown>>,
  eventName: string,
): Record<string, unknown> | undefined {
  return calls
    .map(([line]) => JSON.parse(String(line)) as Record<string, unknown>)
    .find((entry) => entry.event === eventName)
}

describe('signupService (integration)', () => {
  it('invalid token → error, no account touched', async () => {
    const result = await signupService({
      email: 'x@test.dev',
      password: 'password123',
      token: 'does-not-exist',
    })

    expect(result).toEqual({ error: true, message: 'Invalid invitation token' })
    expect(mocks.createUser).not.toHaveBeenCalled()
  })

  it('already-used (revoked) invitation → error, no account touched', async () => {
    const { token, email } = await seedInvitation({ status: 'revoked' })

    const result = await signupService({
      email,
      password: 'password123',
      token,
    })

    expect(result.error).toBe(true)
    expect(result.message).toBe(
      'This invitation has already been used or revoked',
    )
    expect(mocks.createUser).not.toHaveBeenCalled()
  })

  it('expired invitation → error, no account touched', async () => {
    const { token, email } = await seedInvitation({
      expiresAt: new Date(Date.now() - 1000),
    })

    const result = await signupService({
      email,
      password: 'password123',
      token,
    })

    expect(result.error).toBe(true)
    expect(result.message).toBe('This invitation has expired')
    expect(mocks.createUser).not.toHaveBeenCalled()
  })

  it('email does not match invitation → error, no account touched', async () => {
    const { token } = await seedInvitation({ email: 'real@test.dev' })

    const result = await signupService({
      email: 'other@test.dev',
      password: 'password123',
      token,
    })

    expect(result.error).toBe(true)
    expect(result.message).toBe('Email does not match invitation')
    expect(mocks.createUser).not.toHaveBeenCalled()
  })

  it('happy path → issues OTP but creates NO account and leaves invitation pending', async () => {
    const { token, email } = await seedInvitation({ role: 'teacher' })

    const result = await signupService({
      email,
      password: 'password123',
      fullName: 'New User',
      token,
    })

    expect(result.error).toBe(false)
    expect(result.requiresOtp).toBe(true)
    // No account is created before OTP is proven.
    expect(mocks.createUser).not.toHaveBeenCalled()
    expect(await findProfileByEmail(email)).toBeUndefined()

    const invitation = await findInvitationByToken(token)
    expect(invitation?.status).toBe('pending')
    expect(invitation?.acceptedAt).toBeNull()
    expect(invitation?.otpHash).not.toBeNull()
  })

  it('re-entry after abandoning OTP still works (invitation stays pending)', async () => {
    const { token, email } = await seedInvitation()

    const first = await signupService({ email, password: 'password123', token })
    expect(first.requiresOtp).toBe(true)

    // User closes the tab, comes back via the same link, resubmits the form.
    const second = await signupService({
      email,
      password: 'password123',
      token,
    })
    expect(second.error).toBe(false)
    expect(second.requiresOtp).toBe(true)

    const invitation = await findInvitationByToken(token)
    expect(invitation?.status).toBe('pending')
  })

  it('email send fails → error, no account created, invitation stays pending', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { token, email } = await seedInvitation()
    mocks.sendEmail.mockResolvedValue({ error: { message: 'smtp down' } })

    const result = await signupService({
      email,
      password: 'password123',
      token,
    })

    expect(result.error).toBe(true)
    expect(mocks.createUser).not.toHaveBeenCalled()
    expect(mocks.deleteUser).not.toHaveBeenCalled()
    expect(await findProfileByEmail(email)).toBeUndefined()

    const invitation = await findInvitationByToken(token)
    expect(invitation?.status).toBe('pending')
    expect(invitation?.otpHash).toBeNull()
    expect(errorSpy).toHaveBeenCalled()

    errorSpy.mockRestore()
  })

  it('categorizes invitation lookup failures and preserves the original error', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const repositoryError = new Error('signup invitation database detail')
    vi.spyOn(signupRepository, 'findInvitationByToken').mockRejectedValueOnce(
      repositoryError,
    )

    try {
      await expect(
        withObservabilityRequest(
          new Request('https://christ-dina.org', {
            headers: { 'x-request-id': 'signup-lookup-request' },
          }),
          () =>
            signupService({
              email: 'x@test.dev',
              password: 'password123',
              token: 'invitation-token',
            }),
        ),
      ).rejects.toBe(repositoryError)

      expect(String(errorSpy.mock.calls[0]?.[0])).not.toContain(
        'signup invitation database detail',
      )
      expect(
        findEvent(errorSpy.mock.calls, 'signup_invitation_lookup_failed'),
      ).toMatchObject({
        requestId: 'signup-lookup-request',
        errorCategory: 'signup_invitation_read_persistence',
        status: 'failure',
      })
    } finally {
      errorSpy.mockRestore()
    }
  })

  it('categorizes OTP persistence failures and preserves the original error', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { token, email } = await seedInvitation()
    const repositoryError = new Error('signup OTP database detail')
    vi.spyOn(signupRepository, 'updateInvitationOtp').mockRejectedValueOnce(
      repositoryError,
    )

    try {
      await expect(
        signupService({ email, password: 'password123', token }),
      ).rejects.toBe(repositoryError)

      expect(
        findEvent(errorSpy.mock.calls, 'signup_otp_update_failed'),
      ).toMatchObject({
        invitationId: expect.any(String),
        errorCategory: 'signup_otp_persistence',
        status: 'failure',
      })
      expect(String(errorSpy.mock.calls[0]?.[0])).not.toContain(
        'signup OTP database detail',
      )
    } finally {
      errorSpy.mockRestore()
    }
  })
})

describe('verifyOtpService (integration)', () => {
  it('invalid invitation → failure', async () => {
    const result = await verifyOtpService({
      email: 'x@test.dev',
      password: 'p',
      otp: '123456',
      invitationToken: 'does-not-exist',
    })

    expect(result).toEqual({ success: false, message: 'Invalid invitation' })
  })

  it('no OTP issued → failure, no account created', async () => {
    const { token, email } = await seedInvitation()

    const result = await verifyOtpService({
      email,
      password: 'p',
      otp: '123456',
      invitationToken: token,
    })

    expect(result.success).toBe(false)
    expect(result.message).toBe(
      'No verification code found. Please request a new one.',
    )
    expect(mocks.createUser).not.toHaveBeenCalled()
  })

  it('wrong OTP → increments attempts in DB, no account created', async () => {
    const { token, email } = await seedInvitation({
      otpHash: hashValue('123456'),
      otpExpiresAt: new Date(Date.now() + 5 * 60 * 1000),
    })

    const result = await verifyOtpService({
      email,
      password: 'p',
      otp: '000000',
      invitationToken: token,
    })

    expect(result.success).toBe(false)
    expect(result.message).toBe('Invalid code. 4 attempts remaining.')
    expect(mocks.createUser).not.toHaveBeenCalled()

    const invitation = await findInvitationByToken(token)
    expect(invitation?.otpAttempts).toBe(1)
  })

  it('categorizes OTP-attempt persistence failures and preserves the original error', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { token, email } = await seedInvitation({
      otpHash: hashValue('123456'),
      otpExpiresAt: new Date(Date.now() + 5 * 60 * 1000),
    })
    const repositoryError = new Error('signup OTP attempt database detail')
    vi.spyOn(signupRepository, 'incrementOtpAttempts').mockRejectedValueOnce(
      repositoryError,
    )

    try {
      await expect(
        verifyOtpService({
          email,
          password: 'p',
          otp: '000000',
          invitationToken: token,
        }),
      ).rejects.toBe(repositoryError)

      expect(
        findEvent(errorSpy.mock.calls, 'signup_otp_attempt_update_failed'),
      ).toMatchObject({
        invitationId: expect.any(String),
        errorCategory: 'signup_otp_attempt_persistence',
        status: 'failure',
      })
      expect(String(errorSpy.mock.calls[0]?.[0])).not.toContain(
        'signup OTP attempt database detail',
      )
    } finally {
      errorSpy.mockRestore()
    }
  })

  it('correct OTP → creates account, accepts invitation, clears OTP, logs in', async () => {
    const userId = randomUUID()
    const { token, email } = await seedInvitation({
      role: 'teacher',
      otpHash: hashValue('123456'),
      otpExpiresAt: new Date(Date.now() + 5 * 60 * 1000),
    })
    mocks.createUser.mockResolvedValue({
      data: { user: { id: userId, email } },
      error: null,
    })

    const result = await verifyOtpService({
      email,
      password: 'password123',
      fullName: 'New User',
      otp: '123456',
      invitationToken: token,
    })

    expect(result.success).toBe(true)
    expect(mocks.createUser).toHaveBeenCalledWith(
      expect.objectContaining({ email, email_confirm: true }),
    )
    expect(mocks.signInWithPassword).toHaveBeenCalled()

    const profile = await findProfileByEmail(email)
    expect(profile?.id).toBe(userId)
    expect(profile?.role).toBe('teacher')
    expect(profile?.fullName).toBe('New User')

    const invitation = await findInvitationByToken(token)
    expect(invitation?.status).toBe('accepted')
    expect(invitation?.acceptedAt).not.toBeNull()
    expect(invitation?.otpHash).toBeNull()
  })

  it('categorizes invitation acceptance persistence failures and preserves the original error', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const userId = randomUUID()
    const { token, email } = await seedInvitation({
      otpHash: hashValue('123456'),
      otpExpiresAt: new Date(Date.now() + 5 * 60 * 1000),
    })
    const repositoryError = new Error('signup acceptance database detail')
    mocks.createUser.mockResolvedValue({
      data: { user: { id: userId, email } },
      error: null,
    })
    vi.spyOn(signupRepository, 'markInvitationAccepted').mockRejectedValueOnce(
      repositoryError,
    )

    try {
      await expect(
        verifyOtpService({
          email,
          password: 'password123',
          otp: '123456',
          invitationToken: token,
        }),
      ).rejects.toBe(repositoryError)

      expect(
        findEvent(errorSpy.mock.calls, 'signup_invitation_acceptance_failed'),
      ).toMatchObject({
        invitationId: expect.any(String),
        errorCategory: 'signup_invitation_acceptance_persistence',
        status: 'failure',
      })
      expect(String(errorSpy.mock.calls[0]?.[0])).not.toContain(
        'signup acceptance database detail',
      )
    } finally {
      errorSpy.mockRestore()
    }
  })

  it('categorizes verified OTP cleanup failures and preserves the original error', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const userId = randomUUID()
    const { token, email } = await seedInvitation({
      otpHash: hashValue('123456'),
      otpExpiresAt: new Date(Date.now() + 5 * 60 * 1000),
    })
    const repositoryError = new Error('signup cleanup database detail')
    mocks.createUser.mockResolvedValue({
      data: { user: { id: userId, email } },
      error: null,
    })
    vi.spyOn(signupRepository, 'clearInvitationOtp').mockRejectedValueOnce(
      repositoryError,
    )

    try {
      await expect(
        verifyOtpService({
          email,
          password: 'password123',
          otp: '123456',
          invitationToken: token,
        }),
      ).rejects.toBe(repositoryError)

      expect(
        findEvent(errorSpy.mock.calls, 'signup_otp_cleanup_failed'),
      ).toMatchObject({
        invitationId: expect.any(String),
        errorCategory: 'signup_otp_cleanup_persistence',
        status: 'failure',
      })
      expect(String(errorSpy.mock.calls[0]?.[0])).not.toContain(
        'signup cleanup database detail',
      )
    } finally {
      errorSpy.mockRestore()
    }
  })

  it('categorizes duplicate-profile lookup failures and preserves the original error', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { token, email } = await seedInvitation({
      otpHash: hashValue('123456'),
      otpExpiresAt: new Date(Date.now() + 5 * 60 * 1000),
    })
    const repositoryError = new Error('signup profile database detail')
    mocks.createUser.mockResolvedValue({
      data: null,
      error: { code: 'email_exists', message: 'already exists' },
    })
    vi.spyOn(signupRepository, 'findProfileByEmail').mockRejectedValueOnce(
      repositoryError,
    )

    try {
      await expect(
        verifyOtpService({
          email,
          password: 'password123',
          otp: '123456',
          invitationToken: token,
        }),
      ).rejects.toBe(repositoryError)

      expect(
        findEvent(errorSpy.mock.calls, 'signup_profile_lookup_failed'),
      ).toMatchObject({
        errorCategory: 'signup_profile_read_persistence',
        status: 'failure',
      })
      expect(String(errorSpy.mock.calls[0]?.[0])).not.toContain(
        'signup profile database detail',
      )
    } finally {
      errorSpy.mockRestore()
    }
  })

  it('correct OTP but user already exists → confirms existing user, succeeds', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { token, email } = await seedInvitation({
      otpHash: hashValue('123456'),
      otpExpiresAt: new Date(Date.now() + 5 * 60 * 1000),
    })
    const existingId = await seedProfile({ email })
    mocks.createUser.mockResolvedValue({
      data: null,
      error: {
        message: 'A user with this email address has already been registered',
        code: 'email_exists',
      },
    })

    const result = await verifyOtpService({
      email,
      password: 'password123',
      otp: '123456',
      invitationToken: token,
    })

    expect(result.success).toBe(true)
    expect(mocks.updateUserById).toHaveBeenCalledWith(existingId, {
      email_confirm: true,
    })

    const invitation = await findInvitationByToken(token)
    expect(invitation?.status).toBe('accepted')

    errorSpy.mockRestore()
  })

  it('createUser transient error → failure, no profile created, no existing user confirmed', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { token, email } = await seedInvitation({
      otpHash: hashValue('123456'),
      otpExpiresAt: new Date(Date.now() + 5 * 60 * 1000),
    })
    mocks.createUser.mockResolvedValue({
      data: null,
      error: { message: 'Service unavailable', code: 'unexpected_failure' },
    })

    const result = await verifyOtpService({
      email,
      password: 'password123',
      otp: '123456',
      invitationToken: token,
    })

    expect(result.success).toBe(false)
    expect(mocks.updateUserById).not.toHaveBeenCalled()
    expect(await findProfileByEmail(email)).toBeUndefined()
    expect(errorSpy).toHaveBeenCalled()

    errorSpy.mockRestore()
  })
})

describe('resendOtpService (integration)', () => {
  it('invalid invitation → failure', async () => {
    const result = await resendOtpService({
      email: 'x@test.dev',
      invitationToken: 'does-not-exist',
    })

    expect(result).toEqual({ success: false, message: 'Invalid invitation' })
  })

  it('cooldown active → wait message, no email, OTP unchanged', async () => {
    const { token, email } = await seedInvitation({
      otpHash: hashValue('111111'),
      otpExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
    })

    const result = await resendOtpService({ email, invitationToken: token })

    expect(result.success).toBe(false)
    expect(result.message).toMatch(/Please wait \d+ seconds/)
    expect(mocks.sendEmail).not.toHaveBeenCalled()

    const invitation = await findInvitationByToken(token)
    expect(invitation?.otpHash).toBe(hashValue('111111'))
  })

  it('no cooldown → issues a fresh OTP and sends email', async () => {
    const { token, email } = await seedInvitation({ otpExpiresAt: null })

    const result = await resendOtpService({ email, invitationToken: token })

    expect(result.success).toBe(true)
    expect(mocks.sendEmail).toHaveBeenCalled()

    const invitation = await findInvitationByToken(token)
    expect(invitation?.otpHash).not.toBeNull()
  })
})
