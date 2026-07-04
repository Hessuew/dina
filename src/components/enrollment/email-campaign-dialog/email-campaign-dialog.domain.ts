import type { EmailCampaignType } from '@/utils/email/domain/campaigns.domain'
import type {
  EmailCampaignPreview,
  EmailCampaignSendSummary,
} from '@/utils/email/service/email-campaign.service'
import { toUserError } from '@/utils/errors'

export const EMAIL_CAMPAIGN_OPTIONS: Array<{
  value: EmailCampaignType
  label: string
  description: string
}> = [
  {
    value: 'invitation',
    label: 'Invitation emails',
    description: 'Approved applicants who have not completed signup',
  },
]

function totalSkipped(skipped: EmailCampaignPreview['skipped']): number {
  return skipped.linkStillValid + skipped.revoked + skipped.overCap
}

export function resolvePreviewLabel(preview: EmailCampaignPreview): string {
  const suffix = preview.toSend === 1 ? '' : 's'
  return `${preview.toSend} email${suffix} will be sent`
}

export function resolveSkipDetail(
  skipped: EmailCampaignPreview['skipped'],
): string | null {
  if (totalSkipped(skipped) === 0) return null
  return [
    `${skipped.linkStillValid} link still valid`,
    `${skipped.revoked} revoked`,
    `${skipped.overCap} over batch limit`,
  ].join(' · ')
}

export function resolveResultLabel(summary: EmailCampaignSendSummary): string {
  const parts = [`${summary.sent} sent`]
  if (summary.failed > 0) parts.push(`${summary.failed} failed`)
  const skips = totalSkipped(summary.skipped)
  if (skips > 0) parts.push(`${skips} skipped`)
  return parts.join(', ')
}

export type StatusLine = { text: string; tone: 'strong' | 'muted' }

export function resolveStatusLines(state: {
  preview: EmailCampaignPreview | null
  summary: EmailCampaignSendSummary | null
  isLoading: boolean
}): Array<StatusLine> {
  if (state.isLoading) return [{ text: 'Loading...', tone: 'muted' }]
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

export function resolvePreviewFailure(error: unknown): PreviewFailure {
  const userError = toUserError(error)
  return userError.code === 'CAMPAIGN_LOCKED'
    ? { kind: 'locked' }
    : { kind: 'error', message: userError.message }
}

export function campaignToRelease(
  selected: EmailCampaignType | null,
  next: EmailCampaignType,
): EmailCampaignType | null {
  selected satisfies EmailCampaignType | null
  next satisfies EmailCampaignType
  return null
}

export function resolveCanSend(state: {
  preview: EmailCampaignPreview | null
  summary: EmailCampaignSendSummary | null
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
