import { render } from '@react-email/render'
import { Resend } from 'resend'
import { EMAIL_FROM, env } from '@/env'
import { EmailChangeVerificationEmail } from '@/emails/EmailChangeVerificationEmail'
import { AppError } from '@/utils/errors'

/**
 * Builds the email change verification link.
 */
export function buildVerifyLink(token: string): string {
  const appUrl = env.APP_URL
  return `${appUrl}/verify-email-change?token=${token}`
}

/**
 * Sends the email change verification email.
 * Throws AppError if sending fails.
 */
export async function sendEmailChangeVerification(
  newEmail: string,
  verifyLink: string,
): Promise<void> {
  const emailHtml = await render(
    EmailChangeVerificationEmail({ verifyLink, newEmail }),
  )

  const resend = new Resend(env.RESEND_API_KEY)
  const { error: emailError } = await resend.emails.send({
    from: EMAIL_FROM,
    to: newEmail,
    subject: 'Verify your new email address',
    html: emailHtml,
  })

  if (emailError) {
    throw new AppError({
      code: 'EMAIL_SEND_FAILED',
      status: 500,
      userMessage: 'Failed to send verification email. Please try again.',
      internalMessage: `Resend error: ${emailError.message}`,
    })
  }
}
