/* v8 ignore start */
import { and, asc, eq, isNull, ne, or } from 'drizzle-orm'
import type { CampaignRecipient } from '../domain/bulk-send.domain'
import type { CampaignCohort } from '../domain/templates.domain'
import { getDb } from '@/db'
import { enrollments, invitations } from '@/db/schema'

/**
 * WHERE predicate per campaign cohort — same shape as `emailGroupWhere` in
 * enrolment.repository.ts (see CONTEXT.md → Email Export Cohorts).
 */
function campaignCohortWhere(cohort: CampaignCohort) {
  switch (cohort) {
    case 'approved':
      return eq(enrollments.status, 'approved')
    case 'not_registered':
      return and(
        eq(enrollments.invitationSent, true),
        or(isNull(invitations.status), ne(invitations.status, 'accepted')),
      )
  }
}

/**
 * Returns the campaign cohort's recipients (id + phone + names). LEFT joins
 * invitations so the not_registered cohort can filter on invitation status.
 */
export async function findEnrollmentRecipientsByCampaign(
  cohort: CampaignCohort,
): Promise<Array<CampaignRecipient>> {
  const db = await getDb()
  return db
    .select({
      enrollmentId: enrollments.id,
      phoneWhatsApp: enrollments.phoneWhatsApp,
      preferredName: enrollments.preferredName,
      fullLegalName: enrollments.fullLegalName,
    })
    .from(enrollments)
    .leftJoin(invitations, eq(enrollments.invitationId, invitations.id))
    .where(campaignCohortWhere(cohort))
    .orderBy(asc(enrollments.createdAt))
}
/* v8 ignore end */
