/* v8 ignore start */
import { and, asc, eq, isNull, ne, or } from 'drizzle-orm'
import type { EmailCampaignCohort } from '../domain/campaigns.domain'
import type { InvitationCampaignRecipient } from '../domain/bulk-invite.domain'
import { getDb } from '@/db'
import { enrollments, invitations } from '@/db/schema'

function campaignCohortWhere(cohort: EmailCampaignCohort) {
  cohort satisfies EmailCampaignCohort
  return and(
    eq(enrollments.status, 'approved'),
    or(isNull(invitations.status), ne(invitations.status, 'accepted')),
  )
}

export async function findEmailCampaignRecipients(
  cohort: EmailCampaignCohort,
): Promise<Array<InvitationCampaignRecipient>> {
  const db = await getDb()
  const rows = await db
    .select({
      enrollmentId: enrollments.id,
      email: enrollments.email,
      invitationId: invitations.id,
      invitationStatus: invitations.status,
      invitationExpiresAt: invitations.expiresAt,
      invitationToken: invitations.token,
    })
    .from(enrollments)
    .leftJoin(invitations, eq(invitations.email, enrollments.email))
    .where(campaignCohortWhere(cohort))
    .orderBy(asc(enrollments.createdAt))

  return rows.map((row) => ({
    enrollmentId: row.enrollmentId,
    email: row.email,
    invitation: row.invitationId
      ? {
          id: row.invitationId,
          status: row.invitationStatus!,
          expiresAt: row.invitationExpiresAt!,
          token: row.invitationToken!,
        }
      : null,
  }))
}

/* v8 ignore end */
