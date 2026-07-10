import { ResendEmailSender } from './sender/resend-email-sender'
import type { EmailSender, TransactionalEmailMessage } from './types'

let senderInstance: EmailSender | null = null

// Public composition root for provider overrides outside direct imports.
// fallow-ignore-next-line unused-export
export function getEmailSender(): EmailSender {
  if (!senderInstance) senderInstance = new ResendEmailSender()
  return senderInstance
}

export function setEmailSender(sender: EmailSender): void {
  senderInstance = sender
}

export function sendTransactionalEmail(message: TransactionalEmailMessage) {
  return getEmailSender().send(message)
}

export async function sendInvitationEmail(input: {
  to: string
  invitedByName: string
  role: 'student' | 'teacher'
  token: string
  lecturerTitle?: string | null
  appUrl: string
}): Promise<string | null> {
  const inviteLink = `${input.appUrl}/signup?token=${input.token}`
  const result = await sendTransactionalEmail({
    type: 'invitation',
    to: input.to,
    invitedByName: input.invitedByName,
    role: input.role,
    inviteLink,
    lecturerTitle: input.lecturerTitle,
  })
  return result.providerMessageId
}
