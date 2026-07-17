import { render } from '@react-email/render'
import { Resend } from 'resend'
import { EmailDeliveryError } from '../types'
import type { EmailSender, TransactionalEmailMessage } from '../types'
import { EmailChangeVerificationEmail } from '@/emails/EmailChangeVerificationEmail'
import { InvitationEmail } from '@/emails/InvitationEmail'
import { OTPVerificationEmail } from '@/emails/OTPVerificationEmail'
import { PasswordResetEmail } from '@/emails/PasswordResetEmail'
import { env } from '@/env'

const INVITATION_EMAIL_SUBJECT =
  "You've been invited to join our Learning Platform"

async function renderEmail(message: TransactionalEmailMessage) {
  switch (message.type) {
    case 'invitation':
      return {
        subject: INVITATION_EMAIL_SUBJECT,
        html: await render(
          InvitationEmail({
            invitedByName: message.invitedByName,
            role: message.role,
            inviteLink: message.inviteLink,
            lecturerTitle: message.lecturerTitle,
          }),
        ),
      }
    case 'signupOtp':
      return {
        subject: 'Your verification code',
        html: await render(
          OTPVerificationEmail({
            otp: message.otp,
            expiryMinutes: message.expiryMinutes,
          }),
        ),
      }
    case 'passwordReset':
      return {
        subject: 'Reset your password',
        html: await render(
          PasswordResetEmail({
            resetLink: message.resetLink,
            expiryMinutes: message.expiryMinutes,
          }),
        ),
      }
    case 'emailChangeVerification':
      return {
        subject: 'Verify your new email address',
        html: await render(
          EmailChangeVerificationEmail({
            verifyLink: message.verifyLink,
            newEmail: message.to,
          }),
        ),
      }
  }
}

export class ResendEmailSender implements EmailSender {
  private readonly resend = new Resend(env.RESEND_API_KEY)

  async send(message: TransactionalEmailMessage) {
    const email = await renderEmail(message)
    const { data, error } = await this.resend.emails.send({
      from: env.RESEND_FROM,
      to: message.to,
      subject: email.subject,
      html: email.html,
    })
    if (error) throw new EmailDeliveryError(error.message)
    return { providerMessageId: data.id }
  }
}
