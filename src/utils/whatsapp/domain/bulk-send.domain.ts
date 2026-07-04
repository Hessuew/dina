import { normalizeToE164 } from './phone.domain'
import { resolveRecipientName } from './templates.domain'

/** Synchronous-loop bound: keeps a run inside Worker subrequest/CPU limits. */
export const MAX_PER_RUN = 100

export type CampaignRecipient = {
  enrollmentId: string
  phoneWhatsApp: string
  preferredName: string | null
  fullLegalName: string
}

export type PlannedSend = {
  enrollmentId: string
  e164: string
  recipientName: string
}

export type SkipReason = 'already_sent' | 'invalid_phone' | 'over_cap'

export type SkippedRecipient = {
  enrollmentId: string
  reason: SkipReason
}

export type BulkSendPlan = {
  toSend: Array<PlannedSend>
  skipped: Array<SkippedRecipient>
}

export type SkipSummary = {
  alreadySent: number
  invalidPhone: number
  overCap: number
}

/** Collapses the skip list into per-reason counts for the send summary. */
export function summarizeSkips(skipped: Array<SkippedRecipient>): SkipSummary {
  const summary: SkipSummary = { alreadySent: 0, invalidPhone: 0, overCap: 0 }
  for (const skip of skipped) {
    if (skip.reason === 'already_sent') summary.alreadySent++
    else if (skip.reason === 'invalid_phone') summary.invalidPhone++
    else summary.overCap++
  }
  return summary
}

/**
 * Pure planner for a campaign run: partitions cohort recipients into sends
 * and skips. Dedupes against already-sent enrollments, drops rows whose
 * free-text phone cannot be normalized to E.164, and caps sendable rows at
 * `cap` (default MAX_PER_RUN) — overflow is reported as `over_cap` so the
 * admin can simply re-run (dedupe makes re-runs safe). No IO.
 */
export function planBulkSend(input: {
  recipients: Array<CampaignRecipient>
  alreadySentEnrollmentIds: Set<string>
  cap?: number
}): BulkSendPlan {
  const cap = input.cap ?? MAX_PER_RUN
  const toSend: Array<PlannedSend> = []
  const skipped: Array<SkippedRecipient> = []

  for (const recipient of input.recipients) {
    if (input.alreadySentEnrollmentIds.has(recipient.enrollmentId)) {
      skipped.push({ enrollmentId: recipient.enrollmentId, reason: 'already_sent' })
      continue
    }
    const phone = normalizeToE164(recipient.phoneWhatsApp)
    if (!phone.ok) {
      skipped.push({ enrollmentId: recipient.enrollmentId, reason: 'invalid_phone' })
      continue
    }
    if (toSend.length >= cap) {
      skipped.push({ enrollmentId: recipient.enrollmentId, reason: 'over_cap' })
      continue
    }
    toSend.push({
      enrollmentId: recipient.enrollmentId,
      e164: phone.e164,
      recipientName: resolveRecipientName(
        recipient.preferredName,
        recipient.fullLegalName,
      ),
    })
  }

  return { toSend, skipped }
}
