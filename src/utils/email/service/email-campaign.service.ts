import type { SendEmailCampaignInput } from '@/schemas/email-campaign.schema'
import type { LogLevel } from '@/utils/observability/logger'
import type {
  BulkInvitePlan,
  PlannedInvitationEmail,
  SkipSummary,
} from '@/utils/email/domain/bulk-invite.domain'
import type { EmailType } from '@/utils/email/domain/campaigns.domain'
import type { InvitationInsert } from '@/utils/repository/invitations.repository'
import {
  planBulkInvites,
  summarizeInviteSkips,
} from '@/utils/email/domain/bulk-invite.domain'
import {
  buildEmailCampaignRecipients,
  resolveEmailCampaign,
} from '@/utils/email/domain/campaigns.domain'
import { sendInvitationEmail } from '@/utils/email'
import {
  calculateInvitationExpiry,
  generateSecureToken,
} from '@/utils/invitation/domain/invitations.domain'
import {
  acquireEmailCampaignLock,
  checkEmailCampaignLockHeldBy,
  deleteInvitationById,
  findApprovedEnrollments,
  findInvitationsByEmails,
  findProfileById,
  getLockedEmailCampaigns,
  insertEmailMessage,
  insertInvitation,
  markEnrollmentInvitationSent,
  releaseEmailCampaignLock,
  updateInvitationToken,
} from '@/utils/repository'
import { authz } from '@/utils/authz'
import {
  CampaignLockedError,
  ValidationError,
  isAppError,
} from '@/utils/errors'
import { env } from '@/env'
import { logServerEvent } from '@/utils/observability/logger'
import { elapsedMs, getRequestId } from '@/utils/observability/request-context'

export type EmailCampaignPreview = {
  toSend: number
  skipped: SkipSummary
}

export type EmailCampaignSendSummary = {
  sent: number
  failed: number
  skipped: SkipSummary
}

type EmailCampaignLogContext = {
  campaign?: SendEmailCampaignInput['campaign']
  path: string
  failureEvent: string
  startedAt: number
}

function logEmailCampaignEvent(
  level: LogLevel,
  event: string,
  context: EmailCampaignLogContext,
  fields: Record<string, unknown> = {},
): void {
  logServerEvent(level, event, {
    requestId: getRequestId(),
    path: context.path,
    campaign: context.campaign,
    status: level === 'error' ? 'failure' : 'success',
    durationMs: elapsedMs(context.startedAt),
    ...fields,
  })
}

function shouldLogEmailCampaignFailure(error: unknown): boolean {
  return !isAppError(error) || error.status >= 500
}

async function requireEmailCampaignAdmin(
  userId: string,
  context: EmailCampaignLogContext,
): Promise<void> {
  try {
    await authz(userId).hasRole('admin')
  } catch (error) {
    if (shouldLogEmailCampaignFailure(error)) {
      logEmailCampaignEvent('error', context.failureEvent, context, {
        errorCategory: 'campaign_authorization_persistence',
        userId,
      })
    }
    throw error
  }
}

export async function getEmailCampaignLocksService(
  userId: string,
): Promise<Array<SendEmailCampaignInput['campaign']>> {
  const context: EmailCampaignLogContext = {
    path: 'serverFn:getEmailCampaignLocks',
    failureEvent: 'email_campaign_locks_load_failed',
    startedAt: performance.now(),
  }
  await requireEmailCampaignAdmin(userId, context)
  try {
    const campaigns = await getLockedEmailCampaigns()
    logEmailCampaignEvent('info', 'email_campaign_locks_loaded', context, {
      lockCount: campaigns.length,
    })
    return campaigns
  } catch (error) {
    logEmailCampaignEvent(
      'error',
      'email_campaign_locks_load_failed',
      context,
      {
        errorCategory: 'campaign_lock_read',
      },
    )
    throw error
  }
}

export async function releaseEmailCampaignService(
  data: SendEmailCampaignInput,
  userId: string,
): Promise<void> {
  const context: EmailCampaignLogContext = {
    campaign: data.campaign,
    path: 'serverFn:releaseEmailCampaign',
    failureEvent: 'email_campaign_lock_release_failed',
    startedAt: performance.now(),
  }
  await requireEmailCampaignAdmin(userId, context)
  try {
    await releaseEmailCampaignLock(data.campaign, userId)
    logEmailCampaignEvent('info', 'email_campaign_lock_released', context, {
      userId,
    })
  } catch (error) {
    logEmailCampaignEvent(
      'error',
      'email_campaign_lock_release_failed',
      context,
      {
        errorCategory: 'campaign_lock_release',
        userId,
      },
    )
    throw error
  }
}

const SEND_INTERVAL_MS = 600

function logInvitationOutcome(input: {
  status: 'sent' | 'failed'
  planned: PlannedInvitationEmail
  invitationId?: string
  invitationCreated: boolean
  userId: string
  context: EmailCampaignLogContext
  errorCategory?: string
}): void {
  const failed = input.status === 'failed'
  logEmailCampaignEvent(
    failed ? 'error' : 'info',
    failed
      ? 'email_campaign_invitation_failed'
      : 'email_campaign_invitation_sent',
    input.context,
    {
      status: input.status,
      errorCategory: failed
        ? (input.errorCategory ?? 'invitation_email_delivery')
        : null,
      enrollmentId: input.planned.enrollmentId,
      invitationId: input.invitationId,
      userId: input.userId,
      invitationAction: input.planned.action,
      invitationCreated: input.invitationCreated,
    },
  )
}

async function planCampaign(
  data: SendEmailCampaignInput,
): Promise<{ emailType: EmailType; plan: BulkInvitePlan }> {
  const { emailType } = resolveEmailCampaign(data.campaign)
  const enrollments = await findApprovedEnrollments()
  const invitations = await findInvitationsByEmails(
    enrollments.map((enrollment) => enrollment.email),
  )
  const recipients = buildEmailCampaignRecipients({
    enrollments,
    invitations,
  })
  const plan = planBulkInvites({
    recipients,
    now: new Date(),
    includeValidLinks: data.includeValidLinks,
  })
  return { emailType, plan }
}

async function planCampaignForSendWithTelemetry(
  data: SendEmailCampaignInput,
  userId: string,
  context: EmailCampaignLogContext,
): Promise<{ emailType: EmailType; plan: BulkInvitePlan }> {
  try {
    return await planCampaign(data)
  } catch (error) {
    logEmailCampaignEvent('error', 'email_campaign_send_failed', context, {
      errorCategory: 'campaign_send_planning_persistence',
      userId,
    })
    throw error
  }
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
    await updateInvitationToken(planned.invitationId, token, expiresAt)
    return { id: planned.invitationId, token, created: false }
  }
  const invitation = await insertInvitation(
    buildInvitationRow({ email: planned.email, token, expiresAt, userId }),
  )
  return { id: invitation.id, token, created: true }
}

async function createInvitationForSendWithTelemetry(
  planned: PlannedInvitationEmail,
  userId: string,
  context: EmailCampaignLogContext,
) {
  try {
    return await createInvitationForSend(planned, userId)
  } catch (error) {
    logEmailCampaignEvent(
      'error',
      'email_campaign_invitation_failed',
      context,
      {
        status: 'failed',
        errorCategory: 'invitation_persistence',
        enrollmentId: planned.enrollmentId,
        invitationId: planned.invitationId,
        userId,
        invitationAction: planned.action,
      },
    )
    throw error
  }
}

async function rollbackInvitationForSend(input: {
  planned: PlannedInvitationEmail
  invitationId: string
  created: boolean
  oldToken: string | null
  oldExpiresAt: Date | null
}) {
  if (input.created) {
    await deleteInvitationById(input.invitationId)
    return
  }
  if (input.planned.invitationId && input.oldToken && input.oldExpiresAt) {
    await updateInvitationToken(
      input.planned.invitationId,
      input.oldToken,
      input.oldExpiresAt,
    )
  }
}

function emailCampaignErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

type DeliverAndMarkResult = {
  providerMessageId: string | null
  errorMessage?: string
  errorCategory?: string
}

async function tryDeliverAndMark(input: {
  planned: PlannedInvitationEmail
  invitation: { id: string; token: string; created: boolean }
  senderName: string
  lecturerTitle: string | null
}): Promise<DeliverAndMarkResult> {
  let providerMessageId: string | null
  try {
    providerMessageId = await sendInvitationEmail({
      to: input.planned.email,
      invitedByName: input.senderName,
      role: 'student',
      token: input.invitation.token,
      lecturerTitle: input.lecturerTitle,
      appUrl: env.APP_URL || 'http://localhost:3000',
    })
  } catch (error) {
    return {
      providerMessageId: null,
      errorMessage: emailCampaignErrorMessage(error),
      errorCategory: 'invitation_email_delivery',
    }
  }
  try {
    await markEnrollmentInvitationSent(
      input.planned.enrollmentId,
      input.invitation.id,
    )
    return { providerMessageId }
  } catch (error) {
    return {
      providerMessageId,
      errorMessage: emailCampaignErrorMessage(error),
      errorCategory: 'campaign_enrollment_persistence',
    }
  }
}

async function deliverAndMarkInvitation(input: {
  planned: PlannedInvitationEmail
  invitation: { id: string; token: string; created: boolean }
  senderName: string
  lecturerTitle: string | null
}): Promise<DeliverAndMarkResult> {
  const result = await tryDeliverAndMark(input)
  if (result.errorMessage) {
    await rollbackInvitationForSend({
      planned: input.planned,
      invitationId: input.invitation.id,
      created: input.invitation.created,
      oldToken: input.planned.invitation?.token ?? null,
      oldExpiresAt: input.planned.invitation?.expiresAt ?? null,
    })
  }
  return result
}

async function insertEmailMessageWithTelemetry(
  row: Parameters<typeof insertEmailMessage>[0],
  userId: string,
  context: EmailCampaignLogContext,
): Promise<void> {
  try {
    await insertEmailMessage(row)
  } catch (error) {
    logEmailCampaignEvent(
      'error',
      'email_campaign_message_record_failed',
      context,
      {
        errorCategory: 'campaign_message_persistence',
        enrollmentId: row.enrollmentId,
        userId,
      },
    )
    throw error
  }
}

async function sendPlannedInvitation(input: {
  planned: PlannedInvitationEmail
  emailType: EmailType
  userId: string
  senderName: string
  lecturerTitle: string | null
  context: EmailCampaignLogContext
}): Promise<'sent' | 'failed'> {
  const invitation = await createInvitationForSendWithTelemetry(
    input.planned,
    input.userId,
    input.context,
  )
  const delivery = await deliverAndMarkInvitation({
    planned: input.planned,
    invitation,
    senderName: input.senderName,
    lecturerTitle: input.lecturerTitle,
  })
  const status = delivery.errorMessage ? 'failed' : 'sent'
  await insertEmailMessageWithTelemetry(
    {
      enrollmentId: input.planned.enrollmentId,
      recipientEmail: input.planned.email,
      emailType: input.emailType,
      status,
      providerMessageId: delivery.providerMessageId,
      errorMessage: delivery.errorMessage,
      sentByUserId: input.userId,
    },
    input.userId,
    input.context,
  )
  logInvitationOutcome({
    status,
    planned: input.planned,
    invitationId: invitation.id,
    invitationCreated: invitation.created,
    userId: input.userId,
    context: input.context,
    errorCategory: delivery.errorCategory,
  })
  return status
}

export async function previewEmailCampaignService(
  data: SendEmailCampaignInput,
  userId: string,
): Promise<EmailCampaignPreview> {
  const context: EmailCampaignLogContext = {
    campaign: data.campaign,
    path: 'serverFn:preview_email_campaign',
    failureEvent: 'email_campaign_preview_failed',
    startedAt: performance.now(),
  }
  await requireEmailCampaignAdmin(userId, context)
  try {
    const acquired = await acquireEmailCampaignLock(data.campaign, userId)
    if (!acquired) throw new CampaignLockedError()
    const { plan } = await planCampaign(data)
    const skipped = summarizeInviteSkips(plan.skipped)
    const preview = { toSend: plan.toSend.length, skipped }
    logEmailCampaignEvent('info', 'email_campaign_previewed', context, {
      userId,
      toSend: preview.toSend,
      skippedLinkStillValid: skipped.linkStillValid,
      skippedRevoked: skipped.revoked,
      skippedOverCap: skipped.overCap,
    })
    return preview
  } catch (error) {
    if (!(error instanceof CampaignLockedError)) {
      logEmailCampaignEvent('error', 'email_campaign_preview_failed', context, {
        errorCategory: 'campaign_preview_persistence',
        userId,
      })
    }
    throw error
  }
}

export async function sendEmailCampaignService(
  data: SendEmailCampaignInput,
  userId: string,
): Promise<EmailCampaignSendSummary> {
  const context: EmailCampaignLogContext = {
    campaign: data.campaign,
    path: 'serverFn:send_email_campaign',
    failureEvent: 'email_campaign_send_failed',
    startedAt: performance.now(),
  }
  await requireEmailCampaignAdmin(userId, context)
  let holdsLock: boolean
  try {
    holdsLock = await checkEmailCampaignLockHeldBy(data.campaign, userId)
  } catch (error) {
    logEmailCampaignEvent('error', 'email_campaign_send_failed', context, {
      errorCategory: 'campaign_lock_read',
      userId,
    })
    throw error
  }
  if (!holdsLock) throw new CampaignLockedError()
  try {
    return await sendLockedEmailCampaign(data, userId, context)
  } finally {
    await releaseEmailCampaignLock(data.campaign, userId).catch(() => {
      logEmailCampaignEvent(
        'error',
        'email_campaign_lock_release_failed',
        context,
        { errorCategory: 'campaign_lock_release', userId },
      )
    })
  }
}

async function sendLockedEmailCampaign(
  data: SendEmailCampaignInput,
  userId: string,
  context: EmailCampaignLogContext,
): Promise<EmailCampaignSendSummary> {
  let profile: Awaited<ReturnType<typeof findProfileById>>
  try {
    profile = await findProfileById(userId)
  } catch (error) {
    logEmailCampaignEvent('error', 'email_campaign_send_failed', context, {
      errorCategory: 'campaign_sender_profile_read',
      userId,
    })
    throw error
  }
  const senderName = resolveSenderName(profile)
  if (!senderName) throw new ValidationError('Email not found')
  const { emailType, plan } = await planCampaignForSendWithTelemetry(
    data,
    userId,
    context,
  )
  const result = await sendPlannedInvitations({
    plan,
    emailType,
    userId,
    senderName,
    lecturerTitle: profile?.lecturerTitle ?? null,
    context,
  })
  const summary = { ...result, skipped: summarizeInviteSkips(plan.skipped) }
  logEmailCampaignEvent('info', 'email_campaign_completed', context, {
    status: result.failed > 0 ? 'partial_failure' : 'success',
    userId,
    sent: result.sent,
    failed: result.failed,
    skipped: summary.skipped,
  })
  return summary
}

async function sendPlannedInvitations(input: {
  plan: BulkInvitePlan
  emailType: EmailType
  userId: string
  senderName: string
  lecturerTitle: string | null
  context: EmailCampaignLogContext
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
