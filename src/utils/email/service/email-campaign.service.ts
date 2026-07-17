import type { SendEmailCampaignInput } from '@/schemas/email-campaign.schema'
import type {
  BulkInvitePlan,
  PlannedInvitationEmail,
  SkipSummary,
} from '@/utils/email/domain/bulk-invite.domain'
import type { EmailType } from '@/utils/email/domain/campaigns.domain'
import type { InvitationInsert } from '@/utils/email/repository/email-campaign.repository'
import {
  planBulkInvites,
  summarizeInviteSkips,
} from '@/utils/email/domain/bulk-invite.domain'
import { resolveEmailCampaign } from '@/utils/email/domain/campaigns.domain'
import { sendInvitationEmail } from '@/utils/email'
import {
  acquireEmailCampaignLock,
  checkEmailCampaignLockHeldBy,
  deleteCampaignInvitation,
  findEmailCampaignRecipients,
  insertCampaignInvitation,
  insertEmailMessage,
  markCampaignEnrollmentInvited,
  releaseEmailCampaignLock,
  updateCampaignInvitationToken,
} from '@/utils/email/repository/email-campaign.repository'
import {
  calculateInvitationExpiry,
  generateSecureToken,
} from '@/utils/invitation/domain/invitations.domain'
import { findProfileById } from '@/utils/enrolment/repository/enrolment.repository'
import { authz, withRequestCache } from '@/utils/authz'
import { CampaignLockedError, ValidationError } from '@/utils/errors'
import { env } from '@/env'

export type EmailCampaignPreview = {
  toSend: number
  skipped: SkipSummary
}

export type EmailCampaignSendSummary = {
  sent: number
  failed: number
  skipped: SkipSummary
}

const SEND_INTERVAL_MS = 600

async function planCampaign(
  data: SendEmailCampaignInput,
): Promise<{ emailType: EmailType; plan: BulkInvitePlan }> {
  const { emailType, cohort } = resolveEmailCampaign(data.campaign)
  const recipients = await findEmailCampaignRecipients(cohort)
  const plan = planBulkInvites({
    recipients,
    now: new Date(),
    includeValidLinks: data.includeValidLinks,
  })
  return { emailType, plan }
}

function buildInvitationRow(input: {
  email: string
  token: string
  expiresAt: Date
  userId: string
}): InvitationInsert {
  return {
    email: input.email,
    role: 'student',
    token: input.token,
    expiresAt: input.expiresAt,
    status: 'pending',
    invitedBy: input.userId,
  }
}

function resolveSenderName(
  profile: Awaited<ReturnType<typeof findProfileById>>,
) {
  return profile?.fullName || profile?.email || null
}

async function createInvitationForSend(
  planned: PlannedInvitationEmail,
  userId: string,
) {
  if (
    planned.action === 'reuse' &&
    planned.invitationId &&
    planned.invitation
  ) {
    return {
      id: planned.invitationId,
      token: planned.invitation.token,
      created: false,
    }
  }
  const token = generateSecureToken()
  const expiresAt = calculateInvitationExpiry(new Date())
  if (planned.action === 'rotate' && planned.invitationId) {
    await updateCampaignInvitationToken(planned.invitationId, token, expiresAt)
    return { id: planned.invitationId, token, created: false }
  }
  const invitation = await insertCampaignInvitation(
    buildInvitationRow({ email: planned.email, token, expiresAt, userId }),
  )
  return { id: invitation.id, token, created: true }
}

async function rollbackInvitationForSend(input: {
  planned: PlannedInvitationEmail
  invitationId: string
  created: boolean
  oldToken: string | null
  oldExpiresAt: Date | null
}) {
  if (input.created) {
    await deleteCampaignInvitation(input.invitationId)
    return
  }
  if (input.planned.invitationId && input.oldToken && input.oldExpiresAt) {
    await updateCampaignInvitationToken(
      input.planned.invitationId,
      input.oldToken,
      input.oldExpiresAt,
    )
  }
}

async function sendPlannedInvitation(input: {
  planned: PlannedInvitationEmail
  emailType: EmailType
  userId: string
  senderName: string
  lecturerTitle: string | null
}): Promise<'sent' | 'failed'> {
  const oldToken = input.planned.invitation?.token ?? null
  const oldExpiresAt = input.planned.invitation?.expiresAt ?? null
  const invitation = await createInvitationForSend(input.planned, input.userId)
  let providerMessageId: string | null = null
  let errorMessage: string | undefined
  try {
    providerMessageId = await sendInvitationEmail({
      to: input.planned.email,
      invitedByName: input.senderName,
      role: 'student',
      token: invitation.token,
      lecturerTitle: input.lecturerTitle,
      appUrl: env.APP_URL || 'http://localhost:3000',
    })
    await markCampaignEnrollmentInvited(
      input.planned.enrollmentId,
      invitation.id,
    )
  } catch (error) {
    console.error('Invitation email campaign send failed:', error)
    errorMessage = error instanceof Error ? error.message : String(error)
    await rollbackInvitationForSend({
      planned: input.planned,
      invitationId: invitation.id,
      created: invitation.created,
      oldToken,
      oldExpiresAt,
    })
  }
  const status = errorMessage ? 'failed' : 'sent'
  await insertEmailMessage({
    enrollmentId: input.planned.enrollmentId,
    recipientEmail: input.planned.email,
    emailType: input.emailType,
    status,
    providerMessageId,
    errorMessage,
    sentByUserId: input.userId,
  })
  return status
}

export async function previewEmailCampaignService(
  data: SendEmailCampaignInput,
  userId: string,
): Promise<EmailCampaignPreview> {
  return withRequestCache(async () => {
    await authz(userId).hasRole('admin')
    const acquired = await acquireEmailCampaignLock(data.campaign, userId)
    if (!acquired) throw new CampaignLockedError()
    const { plan } = await planCampaign(data)
    return {
      toSend: plan.toSend.length,
      skipped: summarizeInviteSkips(plan.skipped),
    }
  })
}

export async function sendEmailCampaignService(
  data: SendEmailCampaignInput,
  userId: string,
): Promise<EmailCampaignSendSummary> {
  return withRequestCache(async () => {
    await authz(userId).hasRole('admin')
    const holdsLock = await checkEmailCampaignLockHeldBy(data.campaign, userId)
    if (!holdsLock) throw new CampaignLockedError()
    try {
      return await sendLockedEmailCampaign(data, userId)
    } finally {
      await releaseEmailCampaignLock(data.campaign, userId).catch((error) => {
        console.error(
          'Failed to release email campaign lock after send:',
          error,
        )
      })
    }
  })
}

async function sendLockedEmailCampaign(
  data: SendEmailCampaignInput,
  userId: string,
): Promise<EmailCampaignSendSummary> {
  const profile = await findProfileById(userId)
  const senderName = resolveSenderName(profile)
  if (!senderName) throw new ValidationError('Email not found')
  const { emailType, plan } = await planCampaign(data)
  const result = await sendPlannedInvitations({
    plan,
    emailType,
    userId,
    senderName,
    lecturerTitle: profile?.lecturerTitle ?? null,
  })
  return { ...result, skipped: summarizeInviteSkips(plan.skipped) }
}

async function sendPlannedInvitations(input: {
  plan: BulkInvitePlan
  emailType: EmailType
  userId: string
  senderName: string
  lecturerTitle: string | null
}): Promise<{ sent: number; failed: number }> {
  let sent = 0
  let failed = 0
  for (const [index, planned] of input.plan.toSend.entries()) {
    if (index > 0) {
      await new Promise((resolve) => setTimeout(resolve, SEND_INTERVAL_MS))
    }
    const outcome = await sendPlannedInvitation({ ...input, planned })
    if (outcome === 'sent') sent++
    else failed++
  }
  return { sent, failed }
}
