import { beforeEach, describe, expect, it, vi } from 'vitest'
import type {
  EmailSender,
  PasswordResetEmailMessage,
} from '@/utils/email/types'
import { setEmailSender } from '@/utils/email'
import {
  requestPasswordResetService,
  resetPasswordService,
  validateResetTokenService,
} from '@/utils/password-reset/service/password-reset.service'
import * as repository from '@/utils/repository'
import { seedProfile } from '@/../test/integration/seed'

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
  return repository.findAccountSecurityByProfileId(profileId)
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

  it('logs safe telemetry when a reset token validates', async () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
    const email = 'valid-token@test.dev'
    await seedProfile({ email })
    await requestPasswordResetService(email)
    const message = mocks.sendEmail.mock
      .calls[0][0] as PasswordResetEmailMessage
    const token = new URL(message.resetLink).searchParams.get('token')

    try {
      await expect(
        validateResetTokenService(token ?? undefined),
      ).resolves.toEqual({ valid: true, message: 'Token is valid' })

      const serialized = infoSpy.mock.calls.map(([line]) => String(line))
      const event = serialized
        .map((line) => JSON.parse(line) as Record<string, unknown>)
        .find((entry) => entry.event === 'password_reset_token_validated')
      expect(event).toMatchObject({
        level: 'info',
        event: 'password_reset_token_validated',
        path: 'serverFn:validate_reset_token',
        status: 'success',
      })
      expect(serialized.join('\n')).not.toContain(token ?? '')
    } finally {
      infoSpy.mockRestore()
    }
  })

  it('categorizes reset-token lookup failures without raw repository details', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const repositoryError = new Error('password reset token database detail')
    vi.spyOn(repository, 'findResetToken').mockRejectedValueOnce(
      repositoryError,
    )

    try {
      await expect(validateResetTokenService('token-value')).rejects.toBe(
        repositoryError,
      )

      const serialized = errorSpy.mock.calls.map(([line]) => String(line))
      const event = serialized
        .map((line) => JSON.parse(line) as Record<string, unknown>)
        .find((entry) => entry.event === 'password_reset_token_lookup_failed')
      expect(event).toMatchObject({
        level: 'error',
        event: 'password_reset_token_lookup_failed',
        path: 'serverFn:validate_reset_token',
        status: 'failure',
        errorCategory: 'password_reset_token_read_persistence',
      })
      expect(serialized.join('\n')).not.toContain(
        'password reset token database detail',
      )
    } finally {
      errorSpy.mockRestore()
    }
  })

  it('categorizes reset-request lookup failures and preserves the original error', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const repositoryError = new Error('password reset profile database detail')
    vi.spyOn(repository, 'findProfileByEmail').mockRejectedValueOnce(
      repositoryError,
    )

    try {
      await expect(
        requestPasswordResetService('lookup-failure@test.dev'),
      ).rejects.toBe(repositoryError)

      const serialized = errorSpy.mock.calls.map(([line]) => String(line))
      const event = serialized
        .map((line) => JSON.parse(line) as Record<string, unknown>)
        .find((entry) => entry.event === 'password_reset_request_failed')
      expect(event).toMatchObject({
        level: 'error',
        event: 'password_reset_request_failed',
        path: 'serverFn:request_password_reset',
        status: 'failure',
        errorCategory: 'password_reset_read_persistence',
      })
      expect(serialized.join('\n')).not.toContain(
        'password reset profile database detail',
      )
    } finally {
      errorSpy.mockRestore()
    }
  })

  it('categorizes reset-request persistence failures with the safe user id', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const email = 'persistence-failure@test.dev'
    const profileId = await seedProfile({ email })
    const repositoryError = new Error('password reset write database detail')
    vi.spyOn(repository, 'upsertResetToken').mockRejectedValueOnce(
      repositoryError,
    )

    try {
      await expect(requestPasswordResetService(email)).rejects.toBe(
        repositoryError,
      )

      const serialized = errorSpy.mock.calls.map(([line]) => String(line))
      const event = serialized
        .map((line) => JSON.parse(line) as Record<string, unknown>)
        .find((entry) => entry.event === 'password_reset_request_failed')
      expect(event).toMatchObject({
        level: 'error',
        event: 'password_reset_request_failed',
        path: 'serverFn:request_password_reset',
        status: 'failure',
        errorCategory: 'password_reset_write_persistence',
        userId: profileId,
      })
      expect(serialized.join('\n')).not.toContain(
        'password reset write database detail',
      )
    } finally {
      errorSpy.mockRestore()
    }
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

  it('categorizes completion token lookup failures without raw repository details', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const repositoryError = new Error('completion token database detail')
    vi.spyOn(repository, 'findResetToken').mockRejectedValueOnce(
      repositoryError,
    )

    try {
      await expect(
        resetPasswordService('token-value', 'new-password'),
      ).rejects.toBe(repositoryError)

      const serialized = errorSpy.mock.calls.map(([line]) => String(line))
      const event = serialized
        .map((line) => JSON.parse(line) as Record<string, unknown>)
        .find((entry) => entry.event === 'password_reset_token_lookup_failed')
      expect(event).toMatchObject({
        level: 'error',
        event: 'password_reset_token_lookup_failed',
        path: 'serverFn:reset_password',
        status: 'failure',
        errorCategory: 'password_reset_token_read_persistence',
      })
      expect(serialized.join('\n')).not.toContain(
        'completion token database detail',
      )
    } finally {
      errorSpy.mockRestore()
    }
  })

  it('logs reset-attempt persistence failures with the safe user id', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const email = 'attempt-failure@test.dev'
    const profileId = await seedProfile({ email })
    await requestPasswordResetService(email)
    const message = mocks.sendEmail.mock
      .calls[0][0] as PasswordResetEmailMessage
    const token = new URL(message.resetLink).searchParams.get('token')
    const repositoryError = new Error('reset attempt database detail')
    vi.spyOn(repository, 'incrementResetTokenAttempts').mockRejectedValueOnce(
      repositoryError,
    )
    mocks.updateUserById.mockResolvedValue({
      error: { code: 'weak_password', message: 'provider detail' },
    })

    try {
      await expect(
        resetPasswordService(token ?? undefined, 'bad-pass'),
      ).rejects.toBe(repositoryError)

      const serialized = errorSpy.mock.calls.map(([line]) => String(line))
      const event = serialized
        .map((line) => JSON.parse(line) as Record<string, unknown>)
        .find(
          (entry) => entry.event === 'password_reset_attempt_increment_failed',
        )
      expect(event).toMatchObject({
        level: 'error',
        event: 'password_reset_attempt_increment_failed',
        path: 'serverFn:reset_password',
        status: 'failure',
        errorCategory: 'password_reset_attempt_persistence',
        userId: profileId,
      })
      expect(serialized.join('\n')).not.toContain(
        'reset attempt database detail',
      )
    } finally {
      errorSpy.mockRestore()
    }
  })

  it('logs reset-state cleanup failures with the safe user id', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const email = 'cleanup-failure@test.dev'
    const profileId = await seedProfile({ email })
    await requestPasswordResetService(email)
    const message = mocks.sendEmail.mock
      .calls[0][0] as PasswordResetEmailMessage
    const token = new URL(message.resetLink).searchParams.get('token')
    const repositoryError = new Error('reset cleanup database detail')
    vi.spyOn(repository, 'clearResetToken').mockRejectedValueOnce(
      repositoryError,
    )

    try {
      await expect(
        resetPasswordService(token ?? undefined, 'new-password'),
      ).rejects.toBe(repositoryError)

      const serialized = errorSpy.mock.calls.map(([line]) => String(line))
      const event = serialized
        .map((line) => JSON.parse(line) as Record<string, unknown>)
        .find((entry) => entry.event === 'password_reset_cleanup_failed')
      expect(event).toMatchObject({
        level: 'error',
        event: 'password_reset_cleanup_failed',
        path: 'serverFn:reset_password',
        status: 'failure',
        errorCategory: 'password_reset_cleanup_persistence',
        userId: profileId,
      })
      expect(serialized.join('\n')).not.toContain(
        'reset cleanup database detail',
      )
    } finally {
      errorSpy.mockRestore()
    }
  })
})
