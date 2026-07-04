import type { CampaignType } from '@/utils/whatsapp/domain/templates.domain'
import type {
  CampaignPreview,
  CampaignSendSummary,
} from '@/utils/whatsapp/service/whatsapp.service'
import { toUserError } from '@/utils/errors'

/** The two fixed campaign → cohort pairs (see templates.domain resolveCampaign). */
export const CAMPAIGN_OPTIONS: Array<{
  value: CampaignType
  label: string
  description: string
}> = [
  {
    value: 'congratulations',
    label: 'Congratulations',
    description: 'Approved enrollments — acceptance congratulations',
  },
  {
    value: 'signup_reminder',
    label: 'Signup reminder',
    description: 'Invited but not yet registered — reminder to complete signup',
  },
]

function totalSkipped(skipped: CampaignPreview['skipped']): number {
  return skipped.alreadySent + skipped.invalidPhone + skipped.overCap
}

/** Confirm-step headline: how many messages the send would dispatch. */
export function resolvePreviewLabel(preview: CampaignPreview): string {
  const suffix = preview.toSend === 1 ? '' : 's'
  return `${preview.toSend} message${suffix} will be sent`
}

/** Skip breakdown under the preview headline; null when nothing is skipped. */
export function resolveSkipDetail(
  skipped: CampaignPreview['skipped'],
): string | null {
  if (totalSkipped(skipped) === 0) return null
  const parts: Array<string> = []
  if (skipped.alreadySent > 0) parts.push(`${skipped.alreadySent} already sent`)
  if (skipped.invalidPhone > 0)
    parts.push(`${skipped.invalidPhone} invalid phone`)
  if (skipped.overCap > 0) parts.push(`${skipped.overCap} over batch limit`)
  return `Skipped: ${parts.join(' · ')}`
}

/** Result-step summary line after a send completes. */
export function resolveResultLabel(summary: CampaignSendSummary): string {
  const parts = [`${summary.sent} sent`]
  if (summary.failed > 0) parts.push(`${summary.failed} failed`)
  const skips = totalSkipped(summary.skipped)
  if (skips > 0) parts.push(`${skips} skipped`)
  return parts.join(', ')
}

export type StatusLine = { text: string; tone: 'strong' | 'muted' }

/** Status area view-model: what the dialog shows below the campaign picker. */
export function resolveStatusLines(state: {
  preview: CampaignPreview | null
  summary: CampaignSendSummary | null
  isLoading: boolean
}): Array<StatusLine> {
  if (state.isLoading) return [{ text: 'Loading…', tone: 'muted' }]
  if (state.summary) {
    return [{ text: resolveResultLabel(state.summary), tone: 'strong' }]
  }
  if (!state.preview) return []
  const lines: Array<StatusLine> = [
    { text: resolvePreviewLabel(state.preview), tone: 'strong' },
  ]
  const skipDetail = resolveSkipDetail(state.preview.skipped)
  if (skipDetail) lines.push({ text: skipDetail, tone: 'muted' })
  return lines
}

export type PreviewFailure =
  | { kind: 'locked' }
  | { kind: 'error'; message: string }

/** Classifies a preview failure: a locked campaign is UI state, not a toast. */
export function resolvePreviewFailure(error: unknown): PreviewFailure {
  const userError = toUserError(error)
  return userError.code === 'CAMPAIGN_LOCKED'
    ? { kind: 'locked' }
    : { kind: 'error', message: userError.message }
}

/** The lock to release when switching selection; null when nothing to release. */
export function campaignToRelease(
  selected: CampaignType | null,
  next: CampaignType,
): CampaignType | null {
  return selected !== null && selected !== next ? selected : null
}

/** Send is allowed only from a confirmed non-empty preview, once, while idle. */
export function resolveCanSend(state: {
  preview: CampaignPreview | null
  summary: CampaignSendSummary | null
  isLoading: boolean
  isSending: boolean
}): boolean {
  return (
    state.preview !== null &&
    state.preview.toSend > 0 &&
    state.summary === null &&
    !state.isLoading &&
    !state.isSending
  )
}
