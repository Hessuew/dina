import { render } from '@react-email/render'
import { Resend } from 'resend'
import type { EmailSender, InvitationEmailMessage } from '../types'
import { InvitationEmail } from '@/emails/InvitationEmail'
import { env } from '@/env'

const INVITATION_EMAIL_SUBJECT =
  "You've been invited to join our Learning Platform"

async function renderInvitationEmail(
  message: InvitationEmailMessage,
): Promise<string> {
  return render(
    InvitationEmail({
      invitedByName: message.invitedByName,
      role: message.role,
      inviteLink: message.inviteLink,
      lecturerTitle: message.lecturerTitle,
    }),
  )
}

export class ResendEmailSender implements EmailSender {
  async sendInvitation(message: InvitationEmailMessage) {
    const resend = new Resend(env.RESEND_API_KEY)
    const html = await renderInvitationEmail(message)
    const { data, error } = await resend.emails.send({
      from: env.RESEND_FROM_EMAIL,
      to: message.to,
      subject: INVITATION_EMAIL_SUBJECT,
      html,
    })
    if (error) throw new Error(error.message)
    return { providerMessageId: data.id }
  }
}
