import { beforeEach, describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { getDb } from 'test/integration/db'
import type { EmailSender, InvitationEmailMessage } from '@/utils/email/types'
import {
  seedEnrollment,
  seedInvitation,
  seedProfile,
} from '@/../test/integration/seed'
import { emailCampaignLocks, emailMessages, enrollments } from '@/db/schema'
import { setEmailSender } from '@/utils/email'
import {
  previewEmailCampaignService,
  sendEmailCampaignService,
} from '@/utils/email/service/email-campaign.service'
import {
  getLockedEmailCampaigns,
  releaseEmailCampaignLock,
} from '@/utils/email/repository/email-campaign.repository'
import { findInvitationByEmail } from '@/utils/invitation/repository/invitations.repository'
import { AuthorizationError } from '@/utils/errors'

function installFakeSender(failFor: Array<string> = []) {
  const calls: Array<InvitationEmailMessage> = []
  const sender: EmailSender = {
    sendInvitation: async (message) => {
      await Promise.resolve()
      calls.push(message)
      if (failFor.includes(message.to)) {
        throw new Error('provider rejected email')
      }
      return { providerMessageId: `email.${calls.length}` }
    },
  }
  setEmailSender(sender)
  return calls
}

async function previewThenSend(userId: string) {
  await previewEmailCampaignService({ campaign: 'invitation' }, userId)
  return sendEmailCampaignService({ campaign: 'invitation' }, userId)
}

async function findLogRows(enrollmentId: string) {
  const db = await getDb()
  return db
    .select()
    .from(emailMessages)
    .where(eq(emailMessages.enrollmentId, enrollmentId))
}

async function findLockRows() {
  const db = await getDb()
  return db
    .select()
    .from(emailCampaignLocks)
    .where(eq(emailCampaignLocks.campaign, 'invitation'))
}

describe('previewEmailCampaignService (integration)', () => {
  beforeEach(() => {
    installFakeSender()
  })

  it('requires admin role', async () => {
    const teacherId = await seedProfile({ role: 'teacher' })
    await expect(
      previewEmailCampaignService({ campaign: 'invitation' }, teacherId),
    ).rejects.toThrow(AuthorizationError)
  })

  it('reports approved applicants without sending or logging', async () => {
    const adminId = await seedProfile({ role: 'admin' })
    const calls = installFakeSender()
    const enrollmentId = await seedEnrollment({ status: 'approved' })
    await seedEnrollment({ status: 'pending' })

    const preview = await previewEmailCampaignService(
      { campaign: 'invitation' },
      adminId,
    )

    expect(preview).toEqual({
      toSend: 1,
      skipped: { linkStillValid: 0, revoked: 0, overCap: 0 },
    })
    expect(calls).toEqual([])
    expect(await findLogRows(enrollmentId)).toHaveLength(0)
  })
})

describe('sendEmailCampaignService (integration)', () => {
  beforeEach(() => {
    installFakeSender()
  })

  it('requires admin role', async () => {
    const teacherId = await seedProfile({ role: 'teacher' })
    await expect(
      sendEmailCampaignService({ campaign: 'invitation' }, teacherId),
    ).rejects.toThrow(AuthorizationError)
  })

  it('creates invitations for never-invited approved applicants and logs sent rows', async () => {
    const adminId = await seedProfile({ role: 'admin', fullName: 'Admin User' })
    const calls = installFakeSender()
    const enrollmentId = await seedEnrollment({
      status: 'approved',
      email: 'new@test.dev',
    })

    const summary = await previewThenSend(adminId)

    expect(summary).toEqual({
      sent: 1,
      failed: 0,
      skipped: { linkStillValid: 0, revoked: 0, overCap: 0 },
    })
    expect(calls[0]).toMatchObject({
      to: 'new@test.dev',
      invitedByName: 'Admin User',
      role: 'student',
    })
    expect(calls[0].inviteLink).toContain('/signup?token=')
    const invitation = await findInvitationByEmail('new@test.dev')
    expect(invitation?.status).toBe('pending')
    const db = await getDb()
    const [enrollment] = await db
      .select()
      .from(enrollments)
      .where(eq(enrollments.id, enrollmentId))
    expect(enrollment.invitationSent).toBe(true)
    expect(enrollment.invitationId).toBe(invitation?.id)
    expect((await findLogRows(enrollmentId))[0]).toMatchObject({
      recipientEmail: 'new@test.dev',
      emailType: 'invitation',
      status: 'sent',
      providerMessageId: 'email.1',
      sentByUserId: adminId,
    })
  })

  it('skips valid pending invitations as link_still_valid', async () => {
    const adminId = await seedProfile({ role: 'admin' })
    const invitation = await seedInvitation({
      email: 'pending@test.dev',
      status: 'pending',
      expiresAt: new Date(Date.now() + 60_000),
    })
    await seedEnrollment({
      status: 'approved',
      email: invitation.email,
      invitationSent: true,
      invitationId: invitation.id,
    })

    const summary = await previewThenSend(adminId)

    expect(summary).toEqual({
      sent: 0,
      failed: 0,
      skipped: { linkStillValid: 1, revoked: 0, overCap: 0 },
    })
  })

  it('resends a valid pending invitation without rotating its token or expiry', async () => {
    const adminId = await seedProfile({ role: 'admin' })
    const calls = installFakeSender()
    const expiresAt = new Date(Date.now() + 60_000)
    const invitation = await seedInvitation({
      email: 'resend-valid@test.dev',
      status: 'pending',
      token: 'existing-token',
      expiresAt,
    })
    const enrollmentId = await seedEnrollment({
      status: 'approved',
      email: invitation.email,
      invitationSent: true,
      invitationId: invitation.id,
    })

    const input = { campaign: 'invitation' as const, includeValidLinks: true }
    const preview = await previewEmailCampaignService(input, adminId)
    const summary = await sendEmailCampaignService(input, adminId)

    expect(preview.toSend).toBe(1)
    expect(summary).toMatchObject({ sent: 1, failed: 0 })
    expect(calls[0].inviteLink).toContain('token=existing-token')
    const row = await findInvitationByEmail(invitation.email)
    expect(row?.token).toBe('existing-token')
    expect(row?.expiresAt).toEqual(expiresAt)
    expect((await findLogRows(enrollmentId))[0].status).toBe('sent')
  })

  it('rotates expired pending invitations and sends', async () => {
    const adminId = await seedProfile({ role: 'admin' })
    const invitation = await seedInvitation({
      email: 'expired@test.dev',
      status: 'pending',
      token: 'old-token',
      expiresAt: new Date(Date.now() - 60_000),
    })
    const enrollmentId = await seedEnrollment({
      status: 'approved',
      email: invitation.email,
      invitationSent: true,
      invitationId: invitation.id,
    })

    const summary = await previewThenSend(adminId)

    expect(summary.sent).toBe(1)
    const row = await findInvitationByEmail(invitation.email)
    expect(row?.id).toBe(invitation.id)
    expect(row?.token).not.toBe('old-token')
    expect((await findLogRows(enrollmentId))[0].status).toBe('sent')
  })

  it('skips revoked invitations without undoing cancellation', async () => {
    const adminId = await seedProfile({ role: 'admin' })
    const invitation = await seedInvitation({
      email: 'revoked@test.dev',
      status: 'revoked',
    })
    await seedEnrollment({
      status: 'approved',
      email: invitation.email,
      invitationSent: true,
      invitationId: invitation.id,
    })

    const summary = await previewThenSend(adminId)

    expect(summary).toEqual({
      sent: 0,
      failed: 0,
      skipped: { linkStillValid: 0, revoked: 1, overCap: 0 },
    })
    expect((await findInvitationByEmail(invitation.email))?.status).toBe(
      'revoked',
    )
  })

  it('rolls back fresh invitation failure, logs failed, and continues', async () => {
    const adminId = await seedProfile({ role: 'admin' })
    installFakeSender(['fail@test.dev'])
    const failingId = await seedEnrollment({
      status: 'approved',
      email: 'fail@test.dev',
    })
    const okId = await seedEnrollment({
      status: 'approved',
      email: 'ok@test.dev',
    })

    const summary = await previewThenSend(adminId)

    expect(summary).toMatchObject({ sent: 1, failed: 1 })
    expect(await findInvitationByEmail('fail@test.dev')).toBeUndefined()
    expect((await findInvitationByEmail('ok@test.dev'))?.status).toBe('pending')
    expect((await findLogRows(failingId))[0]).toMatchObject({
      status: 'failed',
      providerMessageId: null,
      errorMessage: 'provider rejected email',
    })
    expect((await findLogRows(okId))[0].status).toBe('sent')
  })

  it('restores a rotated invitation when the provider fails', async () => {
    const adminId = await seedProfile({ role: 'admin' })
    installFakeSender(['expired-fail@test.dev'])
    const oldExpiresAt = new Date(Date.now() - 60_000)
    const invitation = await seedInvitation({
      email: 'expired-fail@test.dev',
      status: 'pending',
      token: 'old-token',
      expiresAt: oldExpiresAt,
    })
    await seedEnrollment({
      status: 'approved',
      email: invitation.email,
      invitationSent: true,
      invitationId: invitation.id,
    })

    const summary = await previewThenSend(adminId)

    expect(summary).toMatchObject({ sent: 0, failed: 1 })
    const row = await findInvitationByEmail(invitation.email)
    expect(row?.token).toBe('old-token')
    expect(row?.expiresAt.getTime()).toBe(oldExpiresAt.getTime())
  })
})

describe('email campaign lock (integration)', () => {
  beforeEach(() => {
    installFakeSender()
  })

  it('preview acquires the campaign lock for the caller', async () => {
    const adminId = await seedProfile({ role: 'admin' })

    await previewEmailCampaignService({ campaign: 'invitation' }, adminId)

    const locks = await findLockRows()
    expect(locks).toHaveLength(1)
    expect(locks[0].lockedByUserId).toBe(adminId)
  })

  it('preview is blocked while another admin holds the lock', async () => {
    const adminA = await seedProfile({ role: 'admin' })
    const adminB = await seedProfile({ role: 'admin' })
    await previewEmailCampaignService({ campaign: 'invitation' }, adminA)

    await expect(
      previewEmailCampaignService({ campaign: 'invitation' }, adminB),
    ).rejects.toMatchObject({ code: 'CAMPAIGN_LOCKED' })
  })

  it('send releases the lock and send without lock rejects', async () => {
    const adminId = await seedProfile({ role: 'admin' })
    await seedEnrollment({ status: 'approved' })

    await previewThenSend(adminId)

    expect(await findLockRows()).toHaveLength(0)
    await expect(
      sendEmailCampaignService({ campaign: 'invitation' }, adminId),
    ).rejects.toMatchObject({ code: 'CAMPAIGN_LOCKED' })
  })

  it('lock list and explicit release support close or switch cleanup', async () => {
    const adminId = await seedProfile({ role: 'admin' })
    await previewEmailCampaignService({ campaign: 'invitation' }, adminId)

    expect(await getLockedEmailCampaigns()).toEqual(['invitation'])
    await releaseEmailCampaignLock('invitation', adminId)
    expect(await getLockedEmailCampaigns()).toEqual([])
  })
})
