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

type EmailExportContext = {
  status: EmailExportEnrollment['status']
  invitationSent: boolean
  isRegistered: boolean
}

const groupPredicates: Record<
  EnrollmentEmailExportGroup,
  (context: EmailExportContext) => boolean
> = {
  approved: (context) => context.status === 'approved',
  all: () => true,
  registered: (context) => context.isRegistered,
  not_registered: (context) => context.invitationSent && !context.isRegistered,
}

export function selectEnrollmentEmailsByGroup(input: {
  group: EnrollmentEmailExportGroup
  enrollments: Array<EmailExportEnrollment>
  invitations: Array<EmailExportInvitation>
}): Array<string> {
  const invitationsById = new Map(
    input.invitations.map((invitation) => [invitation.id, invitation]),
  )
  const include = groupPredicates[input.group]

  return input.enrollments.flatMap((enrollment) => {
    const invitation = enrollment.invitationId
      ? invitationsById.get(enrollment.invitationId)
      : undefined
    const isRegistered = invitation?.status === 'accepted'
    return include({
      status: enrollment.status,
      invitationSent: enrollment.invitationSent,
      isRegistered,
    })
      ? [enrollment.email]
      : []
  })
}
