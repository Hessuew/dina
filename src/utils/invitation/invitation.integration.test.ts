import { randomUUID } from 'node:crypto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { EmailSender } from '@/utils/email/types'
import {
  checkInvitationByEmailService,
  createInvitationService,
  deleteInvitationService,
  getInvitationByEmailService,
  getInvitationByTokenService,
  getInvitationsService,
  resendInvitationService,
  revokeInvitationService,
} from '@/utils/invitation/service/invitations.service'
import {
  findInvitationByEmail,
  findInvitationById,
} from '@/utils/invitation/repository/invitations.repository'
import * as invitationsRepository from '@/utils/invitation/repository/invitations.repository'
import { seedInvitation, seedProfile } from '@/../test/integration/seed'
import { setEmailSender } from '@/utils/email'
import { withObservabilityRequest } from '@/utils/observability/request-context'

const mocks = vi.hoisted(() => ({
  sendEmail: vi.fn(),
}))

beforeEach(() => {
  mocks.sendEmail.mockReset().mockResolvedValue({ error: null })
  const sender: EmailSender = {
    send: async (message) => {
      const result = await mocks.sendEmail(message)
      if (result?.error) throw new Error(result.error.message)
      return { providerMessageId: result?.id ?? 'email.test' }
    },
  }
  setEmailSender(sender)
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('createInvitationService (integration)', () => {
  it('admin creates → pending row inserted with 7-day expiry, email sent', async () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
    const adminId = await seedProfile({ role: 'admin' })

    const before = Date.now()
    const { invitation } = await createInvitationService(
      { email: 'new@test.dev', role: 'teacher' },
      adminId,
    )

    expect(invitation.email).toBe('new@test.dev')
    expect(invitation.role).toBe('teacher')
    expect(invitation.status).toBe('pending')
    expect(invitation.invitedBy).toBe(adminId)
    expect(mocks.sendEmail).toHaveBeenCalledOnce()

    const sevenDays = 7 * 24 * 60 * 60 * 1000
    const expiry = new Date(invitation.expiresAt).getTime()
    expect(expiry).toBeGreaterThan(before + sevenDays - 60_000)
    expect(expiry).toBeLessThan(Date.now() + sevenDays + 60_000)

    const row = await findInvitationByEmail('new@test.dev')
    expect(row?.id).toBe(invitation.id)

    const events = infoSpy.mock.calls.map(([line]) => JSON.parse(String(line)))
    expect(events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          event: 'invitation_created',
          path: 'serverFn:createInvitation',
          status: 'success',
          actorId: adminId,
          invitationId: invitation.id,
          role: 'teacher',
        }),
      ]),
    )
    expect(JSON.stringify(events)).not.toContain('new@test.dev')
    expect(JSON.stringify(events)).not.toContain(invitation.token)
  })

  it('rejects a non-admin caller without sending email', async () => {
    const studentId = await seedProfile({ role: 'student' })

    await expect(
      createInvitationService(
        { email: 'new@test.dev', role: 'student' },
        studentId,
      ),
    ).rejects.toMatchObject({ code: 'ROLE_REQUIRED', status: 403 })
    expect(mocks.sendEmail).not.toHaveBeenCalled()
  })

  it('rejects a duplicate pending invitation for the same email', async () => {
    const adminId = await seedProfile({ role: 'admin' })
    await seedInvitation({ email: 'dupe@test.dev', status: 'pending' })

    await expect(
      createInvitationService(
        { email: 'dupe@test.dev', role: 'student' },
        adminId,
      ),
    ).rejects.toMatchObject({ code: 'INVITATION_EXISTS', status: 409 })
    expect(mocks.sendEmail).not.toHaveBeenCalled()
  })

  it('rejects when a profile already uses the email', async () => {
    const adminId = await seedProfile({ role: 'admin' })
    await seedProfile({ email: 'taken@test.dev' })

    await expect(
      createInvitationService(
        { email: 'taken@test.dev', role: 'student' },
        adminId,
      ),
    ).rejects.toMatchObject({ code: 'INVITATION_EXISTS', status: 409 })
  })

  it('rolls back the inserted row when the email fails to send', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const adminId = await seedProfile({ role: 'admin' })
    mocks.sendEmail.mockResolvedValue({ error: { message: 'smtp down' } })

    await expect(
      createInvitationService(
        { email: 'rollback@test.dev', role: 'student' },
        adminId,
      ),
    ).rejects.toMatchObject({ code: 'EMAIL_SEND_FAILED', status: 500 })

    expect(await findInvitationByEmail('rollback@test.dev')).toBeUndefined()

    const events = errorSpy.mock.calls.map(([line]) => JSON.parse(String(line)))
    expect(events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          event: 'invitation_create_failed',
          path: 'serverFn:createInvitation',
          status: 'failure',
          actorId: adminId,
          errorCategory: 'invitation_email_delivery',
        }),
      ]),
    )
    expect(JSON.stringify(events)).not.toContain('smtp down')
    expect(JSON.stringify(events)).not.toContain('rollback@test.dev')
  })
})

describe('checkInvitationByEmailService (integration)', () => {
  it('returns email + role for an active invitation', async () => {
    const { email } = await seedInvitation({
      role: 'teacher',
      status: 'pending',
    })

    const result = await checkInvitationByEmailService({ email })

    expect(result.invitation).toEqual({ email, role: 'teacher' })
  })

  it('throws when no invitation exists for the email', async () => {
    await expect(
      checkInvitationByEmailService({ email: 'missing@test.dev' }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND', status: 404 })
  })

  it('throws conflict for a revoked invitation', async () => {
    const { email } = await seedInvitation({ status: 'revoked' })

    await expect(
      checkInvitationByEmailService({ email }),
    ).rejects.toMatchObject({ code: 'INVITATION_EXISTS', status: 409 })
  })

  it('throws validation error for an expired invitation', async () => {
    const { email } = await seedInvitation({
      status: 'pending',
      expiresAt: new Date(Date.now() - 1000),
    })

    await expect(
      checkInvitationByEmailService({ email }),
    ).rejects.toMatchObject({ code: 'INVITATION_EXPIRED', status: 400 })
  })
})

describe('getInvitationByTokenService (integration)', () => {
  it('returns email + role and logs safe validation metadata', async () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
    const { token, email } = await seedInvitation({ role: 'student' })

    const result = await withObservabilityRequest(
      new Request('https://christ-dina.org/signup', {
        headers: { 'x-request-id': 'invitation-token-read' },
      }),
      () => getInvitationByTokenService({ token }),
    )

    expect(result.invitation).toEqual({ email, role: 'student' })
    const line = String(infoSpy.mock.calls.at(-1)?.[0])
    expect(line).not.toContain(email)
    expect(line).not.toContain(token)
    expect(JSON.parse(line)).toMatchObject({
      event: 'invitation_token_validated',
      path: 'serverFn:getInvitationByToken',
      requestId: 'invitation-token-read',
      invitationId: expect.any(String),
      role: 'student',
      status: 'success',
      durationMs: expect.any(Number),
    })
  })

  it('throws when the token is empty', async () => {
    await expect(
      getInvitationByTokenService({ token: '' }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND', status: 404 })
  })

  it('throws when the token does not match any invitation', async () => {
    await expect(
      getInvitationByTokenService({ token: 'does-not-exist' }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND', status: 404 })
  })

  it('logs unexpected lookup failures without token or provider details', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const repositoryError = new Error(
      'connectionString=secret while reading invite-token-secret',
    )
    vi.spyOn(
      invitationsRepository,
      'findInvitationByToken',
    ).mockRejectedValueOnce(repositoryError)

    await expect(
      withObservabilityRequest(
        new Request('https://christ-dina.org/signup', {
          headers: { 'x-request-id': 'invitation-token-failure' },
        }),
        () => getInvitationByTokenService({ token: 'invite-token-secret' }),
      ),
    ).rejects.toBe(repositoryError)

    const line = String(errorSpy.mock.calls.at(-1)?.[0])
    expect(line).not.toContain('connectionString')
    expect(line).not.toContain('invite-token-secret')
    expect(JSON.parse(line)).toMatchObject({
      event: 'invitation_token_lookup_failed',
      errorCategory: 'invitation_token_read_persistence',
      path: 'serverFn:getInvitationByToken',
      requestId: 'invitation-token-failure',
      status: 'failure',
      durationMs: expect.any(Number),
    })
  })
})

describe('getInvitationByEmailService (integration)', () => {
  it('returns the full invitation row', async () => {
    const { id, email } = await seedInvitation()

    const result = await getInvitationByEmailService({ email })

    expect(result.invitation.id).toBe(id)
    expect(result.invitation.email).toBe(email)
  })

  it('throws when no invitation exists', async () => {
    await expect(
      getInvitationByEmailService({ email: 'missing@test.dev' }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND', status: 404 })
  })
})

describe('getInvitationsService (integration)', () => {
  it('admin lists all invitations with inviter details and safe telemetry', async () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
    const adminId = await seedProfile({ role: 'admin' })
    await seedInvitation({ email: 'a@test.dev' })
    await seedInvitation({ email: 'b@test.dev' })

    const { invitations } = await withObservabilityRequest(
      new Request('https://christ-dina.org/invitations', {
        headers: { 'x-request-id': 'invitation-list-read' },
      }),
      () => getInvitationsService(adminId),
    )

    expect(invitations.length).toBe(2)
    expect(invitations[0]).toHaveProperty('inviter')
    expect(invitations[0].inviter).toHaveProperty('email')

    const line = String(infoSpy.mock.calls.at(-1)?.[0])
    expect(line).not.toContain('a@test.dev')
    expect(line).not.toContain('b@test.dev')
    expect(JSON.parse(line)).toMatchObject({
      event: 'invitations_loaded',
      path: 'serverFn:getInvitations',
      requestId: 'invitation-list-read',
      actorId: adminId,
      invitationCount: 2,
      status: 'success',
      durationMs: expect.any(Number),
    })
  })

  it('rejects a non-admin caller', async () => {
    const studentId = await seedProfile({ role: 'student' })

    await expect(getInvitationsService(studentId)).rejects.toMatchObject({
      code: 'ROLE_REQUIRED',
      status: 403,
    })
  })

  it('logs stable persistence failures without invitation details', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const adminId = await seedProfile({ role: 'admin' })
    const repositoryError = new Error(
      'database connectionString secret for invitee@test.dev',
    )
    vi.spyOn(
      invitationsRepository,
      'findAllInvitationsWithInviter',
    ).mockRejectedValueOnce(repositoryError)

    await expect(
      withObservabilityRequest(
        new Request('https://christ-dina.org/invitations', {
          headers: { 'x-request-id': 'invitation-list-failure' },
        }),
        () => getInvitationsService(adminId),
      ),
    ).rejects.toBe(repositoryError)

    const line = String(errorSpy.mock.calls.at(-1)?.[0])
    expect(line).not.toContain('connectionString')
    expect(line).not.toContain('invitee@test.dev')
    expect(JSON.parse(line)).toMatchObject({
      event: 'invitations_load_failed',
      path: 'serverFn:getInvitations',
      requestId: 'invitation-list-failure',
      actorId: adminId,
      status: 'failure',
      errorCategory: 'invitation_read_persistence',
      durationMs: expect.any(Number),
    })
  })
})

describe('revokeInvitationService (integration)', () => {
  it('admin revokes → status becomes revoked', async () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
    const adminId = await seedProfile({ role: 'admin' })
    const { id } = await seedInvitation({ status: 'pending' })

    await revokeInvitationService({ id }, adminId)

    const row = await findInvitationById(id)
    expect(row?.status).toBe('revoked')

    const events = infoSpy.mock.calls.map(([line]) => JSON.parse(String(line)))
    expect(events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          event: 'invitation_revoked',
          path: 'serverFn:revokeInvitation',
          status: 'success',
          actorId: adminId,
          invitationId: id,
        }),
      ]),
    )
  })

  it('rejects a non-admin caller', async () => {
    const studentId = await seedProfile({ role: 'student' })
    const { id } = await seedInvitation()

    await expect(
      revokeInvitationService({ id }, studentId),
    ).rejects.toMatchObject({ code: 'ROLE_REQUIRED', status: 403 })
  })
})

describe('deleteInvitationService (integration)', () => {
  it('admin deletes → row removed', async () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
    const adminId = await seedProfile({ role: 'admin' })
    const { id } = await seedInvitation()

    await deleteInvitationService({ id }, adminId)

    expect(await findInvitationById(id)).toBeUndefined()

    const events = infoSpy.mock.calls.map(([line]) => JSON.parse(String(line)))
    expect(events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          event: 'invitation_deleted',
          path: 'serverFn:deleteInvitation',
          status: 'success',
          actorId: adminId,
          invitationId: id,
        }),
      ]),
    )
  })

  it('rejects a non-admin caller', async () => {
    const studentId = await seedProfile({ role: 'student' })
    const { id } = await seedInvitation()

    await expect(
      deleteInvitationService({ id }, studentId),
    ).rejects.toMatchObject({ code: 'ROLE_REQUIRED', status: 403 })
  })
})

describe('resendInvitationService (integration)', () => {
  it('admin resends → new token issued and email sent', async () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
    const adminId = await seedProfile({ role: 'admin' })
    const { id, token: oldToken } = await seedInvitation({ status: 'pending' })

    await resendInvitationService({ id }, adminId)

    const row = await findInvitationById(id)
    expect(row?.token).not.toBe(oldToken)
    expect(mocks.sendEmail).toHaveBeenCalledOnce()

    const events = infoSpy.mock.calls.map(([line]) => JSON.parse(String(line)))
    expect(events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          event: 'invitation_resent',
          path: 'serverFn:resendInvitation',
          status: 'success',
          actorId: adminId,
          invitationId: id,
          role: 'student',
        }),
      ]),
    )
  })

  it('admin resends an expired pending invitation → expiry renewed', async () => {
    const adminId = await seedProfile({ role: 'admin' })
    const { id, token: oldToken } = await seedInvitation({
      status: 'pending',
      expiresAt: new Date(Date.now() - 60_000),
    })

    await resendInvitationService({ id }, adminId)

    const row = await findInvitationById(id)
    expect(row?.token).not.toBe(oldToken)
    expect(row?.expiresAt.getTime()).toBeGreaterThan(Date.now())
    expect(mocks.sendEmail).toHaveBeenCalledOnce()
  })

  it('reverts to the old token when the email fails to send', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const adminId = await seedProfile({ role: 'admin' })
    const { id, token: oldToken } = await seedInvitation({ status: 'pending' })
    mocks.sendEmail.mockResolvedValue({ error: { message: 'smtp down' } })

    await expect(
      resendInvitationService({ id }, adminId),
    ).rejects.toMatchObject({ code: 'EMAIL_SEND_FAILED', status: 500 })

    const row = await findInvitationById(id)
    expect(row?.token).toBe(oldToken)

    const events = errorSpy.mock.calls.map(([line]) => JSON.parse(String(line)))
    expect(events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          event: 'invitation_resend_failed',
          path: 'serverFn:resendInvitation',
          status: 'failure',
          actorId: adminId,
          invitationId: id,
          errorCategory: 'invitation_email_delivery',
        }),
      ]),
    )
    expect(JSON.stringify(events)).not.toContain('smtp down')
  })

  it('throws when the invitation does not exist', async () => {
    const adminId = await seedProfile({ role: 'admin' })

    await expect(
      resendInvitationService({ id: randomUUID() }, adminId),
    ).rejects.toMatchObject({ code: 'NOT_FOUND', status: 404 })
  })

  it('rejects a non-admin caller', async () => {
    const studentId = await seedProfile({ role: 'student' })
    const { id } = await seedInvitation()

    await expect(
      resendInvitationService({ id }, studentId),
    ).rejects.toMatchObject({ code: 'ROLE_REQUIRED', status: 403 })
  })
})
