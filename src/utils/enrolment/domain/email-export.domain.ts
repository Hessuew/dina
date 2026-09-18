import type { enrollments, invitations } from '@/db/schema'

export type EnrollmentEmailExportGroup =
  'approved' | 'all' | 'registered' | 'not_registered'

type EmailExportEnrollment = Pick<
  typeof enrollments.$inferSelect,
  'email' | 'status' | 'invitationSent' | 'invitationId'
>
type EmailExportInvitation = Pick<
  typeof invitations.$inferSelect,
  'id' | 'status'
>

export function selectEnrollmentEmailsByGroup(input: {
  group: EnrollmentEmailExportGroup
  enrollments: Array<EmailExportEnrollment>
  invitations: Array<EmailExportInvitation>
}): Array<string> {
  const invitationsById = new Map(
    input.invitations.map((invitation) => [invitation.id, invitation]),
  )

  return input.enrollments.flatMap((enrollment) => {
    const invitation = enrollment.invitationId
      ? invitationsById.get(enrollment.invitationId)
      : undefined
    const isRegistered = invitation?.status === 'accepted'

    if (input.group === 'approved' && enrollment.status !== 'approved') {
      return []
    }
    if (input.group === 'registered' && !isRegistered) return []
    if (
      input.group === 'not_registered' &&
      (!enrollment.invitationSent || isRegistered)
    ) {
      return []
    }
    return [enrollment.email]
  })
}
