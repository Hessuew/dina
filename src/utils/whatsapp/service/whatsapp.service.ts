import type { SendWhatsAppCampaignInput } from '@/schemas/whatsapp.schema'
import type { LogLevel } from '@/utils/observability/logger'
import type {
  BulkSendPlan,
  PlannedSend,
  SkipSummary,
} from '@/utils/whatsapp/domain/bulk-send.domain'
import type {
  CampaignType,
  WhatsAppTemplateName,
} from '@/utils/whatsapp/domain/templates.domain'
import {
  planBulkSend,
  summarizeSkips,
} from '@/utils/whatsapp/domain/bulk-send.domain'
import { resolveCampaign } from '@/utils/whatsapp/domain/templates.domain'
import { getWhatsAppSender } from '@/utils/whatsapp'
import { findEnrollmentRecipientsByCampaign } from '@/utils/whatsapp/repository/whatsapp.repository'
import {
  acquireWhatsAppCampaignLock,
  checkWhatsAppCampaignLockHeldBy,
  findSentEnrollmentIdsByTemplate,
  getLockedWhatsAppCampaigns,
  insertWhatsAppMessage,
  releaseWhatsAppCampaignLock,
} from '@/utils/repository'
import { authz } from '@/utils/authz'
import { CampaignLockedError, isAppError } from '@/utils/errors'
import { logServerEvent } from '@/utils/observability/logger'
import { elapsedMs, getRequestId } from '@/utils/observability/request-context'

export type CampaignPreview = {
  toSend: number
  skipped: SkipSummary
}

export type CampaignSendSummary = {
  sent: number
  failed: number
  skipped: SkipSummary
}

type WhatsAppCampaignLogContext = {
  campaign?: SendWhatsAppCampaignInput['campaign']
  path: string
  failureEvent: string
  startedAt: number
}

function logWhatsAppCampaignEvent(
  level: LogLevel,
  event: string,
  context: WhatsAppCampaignLogContext,
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

function shouldLogWhatsAppCampaignFailure(error: unknown): boolean {
  return !isAppError(error) || error.status >= 500
}

async function requireWhatsAppCampaignAdmin(
  userId: string,
  context: WhatsAppCampaignLogContext,
): Promise<void> {
  try {
    await authz(userId).hasRole('admin')
  } catch (error) {
    if (shouldLogWhatsAppCampaignFailure(error)) {
      logWhatsAppCampaignEvent('error', context.failureEvent, context, {
        errorCategory: 'campaign_authorization_persistence',
        userId,
      })
    }
    throw error
  }
}

export async function getWhatsAppCampaignLocksService(
  userId: string,
): Promise<Array<CampaignType>> {
  const context: WhatsAppCampaignLogContext = {
    path: 'serverFn:getWhatsAppCampaignLocks',
    failureEvent: 'whatsapp_campaign_locks_load_failed',
    startedAt: performance.now(),
  }
  await requireWhatsAppCampaignAdmin(userId, context)
  try {
    const campaigns = await getLockedWhatsAppCampaigns()
    logWhatsAppCampaignEvent(
      'info',
      'whatsapp_campaign_locks_loaded',
      context,
      { lockCount: campaigns.length },
    )
    return campaigns
  } catch (error) {
    logWhatsAppCampaignEvent(
      'error',
      'whatsapp_campaign_locks_load_failed',
      context,
      { errorCategory: 'campaign_lock_read' },
    )
    throw error
  }
}

export async function releaseWhatsAppCampaignService(
  data: SendWhatsAppCampaignInput,
  userId: string,
): Promise<void> {
  const context: WhatsAppCampaignLogContext = {
    campaign: data.campaign,
    path: 'serverFn:releaseWhatsAppCampaign',
    failureEvent: 'whatsapp_campaign_lock_release_failed',
    startedAt: performance.now(),
  }
  await requireWhatsAppCampaignAdmin(userId, context)
  try {
    await releaseWhatsAppCampaignLock(data.campaign, userId)
    logWhatsAppCampaignEvent(
      'info',
      'whatsapp_campaign_lock_released',
      context,
      { userId },
    )
  } catch (error) {
    logWhatsAppCampaignEvent(
      'error',
      'whatsapp_campaign_lock_release_failed',
      context,
      { errorCategory: 'campaign_lock_release', userId },
    )
    throw error
  }
}

// Inter-send pause: stays polite to the Cloud API rate limits without a queue.
const SEND_INTERVAL_MS = 100

function logWhatsAppMessageOutcome(input: {
  status: 'sent' | 'failed'
  planned: PlannedSend
  templateName: WhatsAppTemplateName
  userId: string
  context: WhatsAppCampaignLogContext
}): void {
  const failed = input.status === 'failed'
  logWhatsAppCampaignEvent(
    failed ? 'error' : 'info',
    failed
      ? 'whatsapp_campaign_message_failed'
      : 'whatsapp_campaign_message_sent',
    input.context,
    {
      status: input.status,
      errorCategory: failed ? 'whatsapp_message_delivery' : null,
      enrollmentId: input.planned.enrollmentId,
      templateName: input.templateName,
      userId: input.userId,
    },
  )
}

/* v8 ignore start */
async function planCampaign(
  data: SendWhatsAppCampaignInput,
): Promise<{ templateName: WhatsAppTemplateName; plan: BulkSendPlan }> {
  const { templateName, cohort } = resolveCampaign(data.campaign)
  const recipients = await findEnrollmentRecipientsByCampaign(cohort)
  const alreadySentEnrollmentIds =
    await findSentEnrollmentIdsByTemplate(templateName)
  const plan = planBulkSend({ recipients, alreadySentEnrollmentIds })
  return { templateName, plan }
}

async function planCampaignForSendWithTelemetry(
  data: SendWhatsAppCampaignInput,
  userId: string,
  context: WhatsAppCampaignLogContext,
): Promise<{ templateName: WhatsAppTemplateName; plan: BulkSendPlan }> {
  try {
    return await planCampaign(data)
  } catch (error) {
    logWhatsAppCampaignEvent(
      'error',
      'whatsapp_campaign_send_failed',
      context,
      {
        errorCategory: 'campaign_send_planning_persistence',
        userId,
      },
    )
    throw error
  }
}

async function requireWhatsAppCampaignLockForSend(
  data: SendWhatsAppCampaignInput,
  userId: string,
  context: WhatsAppCampaignLogContext,
): Promise<void> {
  let holdsLock: boolean
  try {
    holdsLock = await checkWhatsAppCampaignLockHeldBy(data.campaign, userId)
  } catch (error) {
    logWhatsAppCampaignEvent(
      'error',
      'whatsapp_campaign_send_failed',
      context,
      { errorCategory: 'campaign_lock_read', userId },
    )
    throw error
  }
  if (!holdsLock) throw new CampaignLockedError()
}

// Sends one planned message and logs the outcome; a provider failure is
// recorded as a `failed` row and never aborts the rest of the batch. Only the
// provider call is caught — a DB insert failure must propagate, otherwise a
// delivered message would be logged as `failed` and re-sent on the next run.
async function sendPlannedMessage(
  planned: PlannedSend,
  templateName: WhatsAppTemplateName,
  userId: string,
  context: WhatsAppCampaignLogContext,
): Promise<'sent' | 'failed'> {
  let providerMessageId: string | undefined
  let errorMessage: string | undefined
  try {
    ;({ providerMessageId } = await getWhatsAppSender().send({
      toE164: planned.e164,
      templateName,
      recipientName: planned.recipientName,
    }))
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : String(error)
  }
  const status: 'sent' | 'failed' = providerMessageId ? 'sent' : 'failed'
  try {
    await insertWhatsAppMessage({
      enrollmentId: planned.enrollmentId,
      recipientPhone: planned.e164,
      templateName,
      status,
      providerMessageId: providerMessageId ?? null,
      errorMessage,
      sentByUserId: userId,
    })
  } catch (error) {
    logWhatsAppCampaignEvent(
      'error',
      'whatsapp_campaign_message_record_failed',
      context,
      {
        errorCategory: 'campaign_message_persistence',
        enrollmentId: planned.enrollmentId,
        userId,
      },
    )
    throw error
  }
  logWhatsAppMessageOutcome({
    status,
    planned,
    templateName,
    userId,
    context,
  })
  return status
}

/** Admin-only dry run: what a campaign send would do right now. */
export async function previewWhatsAppCampaignService(
  data: SendWhatsAppCampaignInput,
  userId: string,
): Promise<CampaignPreview> {
  const context: WhatsAppCampaignLogContext = {
    campaign: data.campaign,
    path: 'serverFn:preview_whatsapp_campaign',
    failureEvent: 'whatsapp_campaign_preview_failed',
    startedAt: performance.now(),
  }
  await requireWhatsAppCampaignAdmin(userId, context)
  try {
    const acquired = await acquireWhatsAppCampaignLock(data.campaign, userId)
    if (!acquired) throw new CampaignLockedError()
    const { plan } = await planCampaign(data)
    const skipped = summarizeSkips(plan.skipped)
    const preview = { toSend: plan.toSend.length, skipped }
    logWhatsAppCampaignEvent('info', 'whatsapp_campaign_previewed', context, {
      userId,
      toSend: preview.toSend,
      skippedAlreadySent: skipped.alreadySent,
      skippedInvalidRecipients: skipped.invalidPhone,
      skippedOverCap: skipped.overCap,
    })
    return preview
  } catch (error) {
    if (!(error instanceof CampaignLockedError)) {
      logWhatsAppCampaignEvent(
        'error',
        'whatsapp_campaign_preview_failed',
        context,
        { errorCategory: 'campaign_preview_persistence', userId },
      )
    }
    throw error
  }
}

/**
 * Admin-only campaign send: plans the batch, then sends sequentially with a
 * small pause between messages, logging every attempt to `whatsapp_messages`.
 */
export async function sendWhatsAppCampaignService(
  data: SendWhatsAppCampaignInput,
  userId: string,
): Promise<CampaignSendSummary> {
  const context: WhatsAppCampaignLogContext = {
    campaign: data.campaign,
    path: 'serverFn:send_whatsapp_campaign',
    failureEvent: 'whatsapp_campaign_send_failed',
    startedAt: performance.now(),
  }
  await requireWhatsAppCampaignAdmin(userId, context)
  await requireWhatsAppCampaignLockForSend(data, userId, context)

  let sent = 0
  let failed = 0
  try {
    const { templateName, plan } = await planCampaignForSendWithTelemetry(
      data,
      userId,
      context,
    )
    for (const [index, planned] of plan.toSend.entries()) {
      if (index > 0) {
        await new Promise((resolve) => setTimeout(resolve, SEND_INTERVAL_MS))
      }
      const outcome = await sendPlannedMessage(
        planned,
        templateName,
        userId,
        context,
      )
      if (outcome === 'sent') sent++
      else failed++
    }

    const summary = { sent, failed, skipped: summarizeSkips(plan.skipped) }
    logWhatsAppCampaignEvent('info', 'whatsapp_campaign_completed', context, {
      status: failed > 0 ? 'partial_failure' : 'success',
      userId,
      sent,
      failed,
      skippedAlreadySent: summary.skipped.alreadySent,
      skippedInvalidRecipients: summary.skipped.invalidPhone,
      skippedOverCap: summary.skipped.overCap,
    })
    return summary
  } finally {
    await releaseWhatsAppCampaignLock(data.campaign, userId).catch(() => {
      logWhatsAppCampaignEvent(
        'error',
        'whatsapp_campaign_lock_release_failed',
        context,
        { errorCategory: 'campaign_lock_release', userId },
      )
    })
  }
}
/* v8 ignore end */
