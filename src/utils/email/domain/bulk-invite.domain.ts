export const MAX_PER_RUN = 100

export type InvitationState = {
  id: string
  status: string
  expiresAt: Date
  token: string
} | null

export type InvitationCampaignRecipient = {
  enrollmentId: string
  email: string
  invitation: InvitationState
}

export type PlannedInvitationEmail = {
  enrollmentId: string
  email: string
  invitationId: string | null
  invitation: InvitationState
  action: 'create' | 'reuse' | 'rotate'
}

export type SkipReason = 'link_still_valid' | 'revoked' | 'over_cap'

export type SkippedInvitationEmail = {
  enrollmentId: string
  reason: SkipReason
}

export type BulkInvitePlan = {
  toSend: Array<PlannedInvitationEmail>
  skipped: Array<SkippedInvitationEmail>
}

export type SkipSummary = {
  linkStillValid: number
  revoked: number
  overCap: number
}

export function summarizeInviteSkips(
  skipped: Array<SkippedInvitationEmail>,
): SkipSummary {
  const summary = { linkStillValid: 0, revoked: 0, overCap: 0 }
  for (const skip of skipped) {
    if (skip.reason === 'link_still_valid') summary.linkStillValid++
    else if (skip.reason === 'revoked') summary.revoked++
    else summary.overCap++
  }
  return summary
}

function resolvePlannedAction(
  invitation: InvitationState,
  now: Date,
  includeValidLinks: boolean,
): PlannedInvitationEmail['action'] | Exclude<SkipReason, 'over_cap'> {
  if (!invitation) return 'create'
  if (invitation.status === 'revoked') return 'revoked'
  if (invitation.status === 'pending' && invitation.expiresAt >= now) {
    return includeValidLinks ? 'reuse' : 'link_still_valid'
  }
  return 'rotate'
}

export function planBulkInvites(input: {
  recipients: Array<InvitationCampaignRecipient>
  now: Date
  cap?: number
  includeValidLinks?: boolean
}): BulkInvitePlan {
  const cap = input.cap ?? MAX_PER_RUN
  const toSend: Array<PlannedInvitationEmail> = []
  const skipped: Array<SkippedInvitationEmail> = []

  for (const recipient of input.recipients) {
    const action = resolvePlannedAction(
      recipient.invitation,
      input.now,
      input.includeValidLinks ?? false,
    )
    if (action === 'link_still_valid' || action === 'revoked') {
      skipped.push({ enrollmentId: recipient.enrollmentId, reason: action })
      continue
    }
    if (toSend.length >= cap) {
      skipped.push({ enrollmentId: recipient.enrollmentId, reason: 'over_cap' })
      continue
    }
    toSend.push({
      enrollmentId: recipient.enrollmentId,
      email: recipient.email,
      invitationId: recipient.invitation?.id ?? null,
      invitation: recipient.invitation,
      action,
    })
  }

  return { toSend, skipped }
}
