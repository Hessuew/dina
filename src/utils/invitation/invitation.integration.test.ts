import { randomUUID } from 'node:crypto'
import { beforeEach, describe, expect, it, vi } from 'vitest'
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
import { seedInvitation, seedProfile } from '@/../test/integration/seed'

// Invitation services touch two external boundaries PGlite can't run: Resend
// email + its React render. We mock ONLY those; the DB stays real via the
// `@/db` alias, so repository SQL + domain/service orchestration run for real.
// See docs/TESTING_GUIDE.md / ADR 0009.
const mocks = vi.hoisted(() => ({
  sendEmail: vi.fn(),
}))

vi.mock('@react-email/render', () => ({
  render: vi.fn().mockResolvedValue('<html/>'),
}))

vi.mock('resend', () => ({
  Resend: vi.fn(() => ({ emails: { send: mocks.sendEmail } })),
}))

beforeEach(() => {
  mocks.sendEmail.mockReset().mockResolvedValue({ error: null })
})

describe('createInvitationService (integration)', () => {
  it('admin creates → pending row inserted with 7-day expiry, email sent', async () => {
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
    const adminId = await seedProfile({ role: 'admin' })
    mocks.sendEmail.mockResolvedValue({ error: { message: 'smtp down' } })

    await expect(
      createInvitationService(
        { email: 'rollback@test.dev', role: 'student' },
        adminId,
      ),
    ).rejects.toMatchObject({ code: 'EMAIL_SEND_FAILED', status: 500 })

    expect(await findInvitationByEmail('rollback@test.dev')).toBeUndefined()
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
  it('returns email + role for an active token', async () => {
    const { token, email } = await seedInvitation({ role: 'student' })

    const result = await getInvitationByTokenService({ token })

    expect(result.invitation).toEqual({ email, role: 'student' })
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
  it('admin lists all invitations with inviter details', async () => {
    const adminId = await seedProfile({ role: 'admin' })
    await seedInvitation({ email: 'a@test.dev' })
    await seedInvitation({ email: 'b@test.dev' })

    const { invitations } = await getInvitationsService(adminId)

    expect(invitations.length).toBe(2)
    expect(invitations[0]).toHaveProperty('inviter')
    expect(invitations[0].inviter).toHaveProperty('email')
  })

  it('rejects a non-admin caller', async () => {
    const studentId = await seedProfile({ role: 'student' })

    await expect(getInvitationsService(studentId)).rejects.toMatchObject({
      code: 'ROLE_REQUIRED',
      status: 403,
    })
  })
})

describe('revokeInvitationService (integration)', () => {
  it('admin revokes → status becomes revoked', async () => {
    const adminId = await seedProfile({ role: 'admin' })
    const { id } = await seedInvitation({ status: 'pending' })

    await revokeInvitationService({ id }, adminId)

    const row = await findInvitationById(id)
    expect(row?.status).toBe('revoked')
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
    const adminId = await seedProfile({ role: 'admin' })
    const { id } = await seedInvitation()

    await deleteInvitationService({ id }, adminId)

    expect(await findInvitationById(id)).toBeUndefined()
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
    const adminId = await seedProfile({ role: 'admin' })
    const { id, token: oldToken } = await seedInvitation({ status: 'pending' })

    await resendInvitationService({ id }, adminId)

    const row = await findInvitationById(id)
    expect(row?.token).not.toBe(oldToken)
    expect(mocks.sendEmail).toHaveBeenCalledOnce()
  })

  it('reverts to the old token when the email fails to send', async () => {
    const adminId = await seedProfile({ role: 'admin' })
    const { id, token: oldToken } = await seedInvitation({ status: 'pending' })
    mocks.sendEmail.mockResolvedValue({ error: { message: 'smtp down' } })

    await expect(
      resendInvitationService({ id }, adminId),
    ).rejects.toMatchObject({ code: 'EMAIL_SEND_FAILED', status: 500 })

    const row = await findInvitationById(id)
    expect(row?.token).toBe(oldToken)
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
