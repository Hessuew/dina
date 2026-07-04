import { beforeEach, describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { getDb } from 'test/integration/db'
import type {
  WhatsAppSender,
  WhatsAppTemplateMessage,
} from '@/utils/whatsapp/types'
import type { CampaignType } from '@/utils/whatsapp/domain/templates.domain'
import {
  seedEnrollment,
  seedInvitation,
  seedProfile,
  seedWhatsAppMessage,
} from '@/../test/integration/seed'
import { whatsappCampaignLocks, whatsappMessages } from '@/db/schema'
import { setWhatsAppSender } from '@/utils/whatsapp'
import {
  previewWhatsAppCampaignService,
  sendWhatsAppCampaignService,
} from '@/utils/whatsapp/service/whatsapp.service'
import { AuthorizationError } from '@/utils/errors'

/** Fake sender: records calls; throws for phones listed in `failFor`. */
function installFakeSender(failFor: Array<string> = []) {
  const calls: Array<WhatsAppTemplateMessage> = []
  const sender: WhatsAppSender = {
    async send(message) {
      calls.push(message)
      if (failFor.includes(message.toE164)) {
        throw new Error('provider rejected message')
      }
      return { providerMessageId: `wamid.${calls.length}` }
    },
  }
  setWhatsAppSender(sender)
  return calls
}

async function findLogRows(enrollmentId: string) {
  const db = await getDb()
  return db
    .select()
    .from(whatsappMessages)
    .where(eq(whatsappMessages.enrollmentId, enrollmentId))
}

/** Send requires the campaign lock — acquire it via preview, then send. */
async function previewThenSend(campaign: CampaignType, userId: string) {
  await previewWhatsAppCampaignService({ campaign }, userId)
  return sendWhatsAppCampaignService({ campaign }, userId)
}

async function findLockRows(campaign: string) {
  const db = await getDb()
  return db
    .select()
    .from(whatsappCampaignLocks)
    .where(eq(whatsappCampaignLocks.campaign, campaign))
}

describe('sendWhatsAppCampaignService (integration)', () => {
  beforeEach(() => {
    installFakeSender()
  })

  it('requires admin role', async () => {
    const teacherId = await seedProfile({ role: 'teacher' })
    await expect(
      sendWhatsAppCampaignService({ campaign: 'congratulations' }, teacherId),
    ).rejects.toThrow(AuthorizationError)
  })

  it('sends the congratulations template to the approved cohort and logs rows', async () => {
    const adminId = await seedProfile({ role: 'admin' })
    const calls = installFakeSender()
    const approvedId = await seedEnrollment({
      status: 'approved',
      phoneWhatsApp: '+358 40 1234567',
      preferredName: 'Mia',
    })
    await seedEnrollment({ status: 'pending' }) // not in cohort

    const summary = await previewThenSend('congratulations', adminId)

    expect(summary).toEqual({
      sent: 1,
      failed: 0,
      skipped: { alreadySent: 0, invalidPhone: 0, overCap: 0 },
    })
    expect(calls).toEqual([
      {
        toE164: '+358401234567',
        templateName: 'dina_congratulations',
        recipientName: 'Mia',
      },
    ])
    const rows = await findLogRows(approvedId)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      recipientPhone: '+358401234567',
      templateName: 'dina_congratulations',
      status: 'sent',
      providerMessageId: 'wamid.1',
      sentByUserId: adminId,
    })
  })

  it('skips un-normalizable phones and already-sent enrollments', async () => {
    const adminId = await seedProfile({ role: 'admin' })
    const calls = installFakeSender()
    const invalidPhoneId = await seedEnrollment({
      status: 'approved',
      phoneWhatsApp: '0401234567', // no country code
    })
    const alreadySentId = await seedEnrollment({
      status: 'approved',
      phoneWhatsApp: '+14155552671',
    })
    await seedWhatsAppMessage({
      enrollmentId: alreadySentId,
      templateName: 'dina_congratulations',
    })

    const summary = await previewThenSend('congratulations', adminId)

    expect(summary).toEqual({
      sent: 0,
      failed: 0,
      skipped: { alreadySent: 1, invalidPhone: 1, overCap: 0 },
    })
    expect(calls).toEqual([])
    expect(await findLogRows(invalidPhoneId)).toHaveLength(0)
  })

  it('records a provider failure as a failed row and continues the batch', async () => {
    const adminId = await seedProfile({ role: 'admin' })
    installFakeSender(['+14155552671'])
    const failingId = await seedEnrollment({
      status: 'approved',
      phoneWhatsApp: '+14155552671',
    })
    const okId = await seedEnrollment({
      status: 'approved',
      phoneWhatsApp: '+358401234567',
    })

    const summary = await previewThenSend('congratulations', adminId)

    expect(summary.sent).toBe(1)
    expect(summary.failed).toBe(1)
    const failedRows = await findLogRows(failingId)
    expect(failedRows[0]).toMatchObject({
      status: 'failed',
      providerMessageId: null,
      errorMessage: 'provider rejected message',
    })
    expect((await findLogRows(okId))[0].status).toBe('sent')
  })

  it('retries failed sends but dedupes sent ones on re-run', async () => {
    const adminId = await seedProfile({ role: 'admin' })
    installFakeSender(['+14155552671'])
    await seedEnrollment({
      status: 'approved',
      phoneWhatsApp: '+14155552671',
    })
    await seedEnrollment({
      status: 'approved',
      phoneWhatsApp: '+358401234567',
    })

    const first = await previewThenSend('congratulations', adminId)
    expect(first).toMatchObject({ sent: 1, failed: 1 })

    // Second run: sent one deduped, failed one retried (now succeeding).
    installFakeSender()
    const second = await previewThenSend('congratulations', adminId)
    expect(second).toEqual({
      sent: 1,
      failed: 0,
      skipped: { alreadySent: 1, invalidPhone: 0, overCap: 0 },
    })
  })

  it('sends the signup reminder only to invited-but-not-registered enrollments', async () => {
    const adminId = await seedProfile({ role: 'admin' })
    const calls = installFakeSender()
    const pendingInvitation = await seedInvitation({ status: 'pending' })
    const notRegisteredId = await seedEnrollment({
      status: 'approved',
      invitationSent: true,
      invitationId: pendingInvitation.id,
      phoneWhatsApp: '+358401234567',
      preferredName: 'Noa',
    })
    const acceptedInvitation = await seedInvitation({ status: 'accepted' })
    await seedEnrollment({
      status: 'approved',
      invitationSent: true,
      invitationId: acceptedInvitation.id,
      phoneWhatsApp: '+14155552671',
    })
    await seedEnrollment({ status: 'approved', invitationSent: false })

    const summary = await previewThenSend('signup_reminder', adminId)

    expect(summary.sent).toBe(1)
    expect(calls).toEqual([
      {
        toE164: '+358401234567',
        templateName: 'dina_signup_reminder',
        recipientName: 'Noa',
      },
    ])
    expect((await findLogRows(notRegisteredId))[0].templateName).toBe(
      'dina_signup_reminder',
    )
  })
})

describe('previewWhatsAppCampaignService (integration)', () => {
  it('requires admin role', async () => {
    const studentId = await seedProfile({ role: 'student' })
    await expect(
      previewWhatsAppCampaignService({ campaign: 'congratulations' }, studentId),
    ).rejects.toThrow(AuthorizationError)
  })

  it('reports the plan without sending or logging', async () => {
    const adminId = await seedProfile({ role: 'admin' })
    const calls = installFakeSender()
    const sendableId = await seedEnrollment({
      status: 'approved',
      phoneWhatsApp: '+358401234567',
    })
    await seedEnrollment({ status: 'approved', phoneWhatsApp: 'garbage' })

    const preview = await previewWhatsAppCampaignService(
      { campaign: 'congratulations' },
      adminId,
    )

    expect(preview).toEqual({
      toSend: 1,
      skipped: { alreadySent: 0, invalidPhone: 1, overCap: 0 },
    })
    expect(calls).toEqual([])
    expect(await findLogRows(sendableId)).toHaveLength(0)
  })
})

describe('campaign lock (integration)', () => {
  beforeEach(() => {
    installFakeSender()
  })

  it('preview acquires the campaign lock for the caller', async () => {
    const adminId = await seedProfile({ role: 'admin' })

    await previewWhatsAppCampaignService({ campaign: 'congratulations' }, adminId)

    const locks = await findLockRows('congratulations')
    expect(locks).toHaveLength(1)
    expect(locks[0].lockedByUserId).toBe(adminId)
  })

  it('preview is blocked while another admin holds the lock', async () => {
    const adminA = await seedProfile({ role: 'admin' })
    const adminB = await seedProfile({ role: 'admin' })
    await previewWhatsAppCampaignService({ campaign: 'congratulations' }, adminA)

    await expect(
      previewWhatsAppCampaignService({ campaign: 'congratulations' }, adminB),
    ).rejects.toMatchObject({ code: 'CAMPAIGN_LOCKED' })
  })

  it('different campaigns are lockable concurrently', async () => {
    const adminA = await seedProfile({ role: 'admin' })
    const adminB = await seedProfile({ role: 'admin' })
    await previewWhatsAppCampaignService({ campaign: 'congratulations' }, adminA)

    await expect(
      previewWhatsAppCampaignService({ campaign: 'signup_reminder' }, adminB),
    ).resolves.toBeDefined()
  })

  it('send releases the lock on completion', async () => {
    const adminId = await seedProfile({ role: 'admin' })
    await seedEnrollment({
      status: 'approved',
      phoneWhatsApp: '+358401234567',
    })

    await previewThenSend('congratulations', adminId)

    expect(await findLockRows('congratulations')).toHaveLength(0)
  })

  it('send rejects when the caller does not hold the lock', async () => {
    const adminId = await seedProfile({ role: 'admin' })

    await expect(
      sendWhatsAppCampaignService({ campaign: 'congratulations' }, adminId),
    ).rejects.toMatchObject({ code: 'CAMPAIGN_LOCKED' })
  })
})
