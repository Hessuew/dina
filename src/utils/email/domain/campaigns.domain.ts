import type { emailMessages, enrollments, invitations } from '@/db/schema'
import type { InvitationCampaignRecipient } from './bulk-invite.domain'

type ApprovedEnrollment = Pick<typeof enrollments.$inferSelect, 'id' | 'email'>
type CampaignInvitation = Pick<
  typeof invitations.$inferSelect,
  'id' | 'email' | 'status' | 'expiresAt' | 'token'
>

export type EmailCampaignType = 'invitation'
export type EmailCampaignCohort = 'approved_not_registered'
export type EmailType = (typeof emailMessages.$inferSelect)['emailType']

export function resolveEmailCampaign(campaign: EmailCampaignType): {
  emailType: EmailType
  cohort: EmailCampaignCohort
} {
  campaign satisfies EmailCampaignType
  return { emailType: 'invitation', cohort: 'approved_not_registered' }
}

export function buildEmailCampaignRecipients(input: {
  enrollments: Array<ApprovedEnrollment>
  invitations: Array<CampaignInvitation>
}): Array<InvitationCampaignRecipient> {
  const invitationsByEmail = new Map(
    input.invitations.map((invitation) => [invitation.email, invitation]),
  )

  return input.enrollments.flatMap((enrollment) => {
    const invitation = invitationsByEmail.get(enrollment.email)
    if (invitation?.status === 'accepted') return []

    return [
      {
        enrollmentId: enrollment.id,
        email: enrollment.email,
        invitation: invitation
          ? {
              id: invitation.id,
              status: invitation.status,
              expiresAt: invitation.expiresAt,
              token: invitation.token,
            }
          : null,
      },
    ]
  })
}
