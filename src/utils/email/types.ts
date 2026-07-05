export type InvitationEmailMessage = {
  to: string
  invitedByName: string
  inviteLink: string
  lecturerTitle?: string | null
  role: 'student' | 'teacher'
}

/**
 * Boundary for outbound email. Tests inject a fake; production uses Resend.
 */
export interface EmailSender {
  sendInvitation: (message: InvitationEmailMessage) => Promise<{
    providerMessageId: string | null
  }>
}
