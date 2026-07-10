import { env } from '@/env'
import { sendTransactionalEmail } from '@/utils/email'
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
  try {
    await sendTransactionalEmail({
      type: 'emailChangeVerification',
      to: newEmail,
      verifyLink,
    })
  } catch (error) {
    throw new AppError({
      code: 'EMAIL_SEND_FAILED',
      status: 500,
      userMessage: 'Failed to send verification email. Please try again.',
      internalMessage: `Email delivery error: ${error instanceof Error ? error.message : String(error)}`,
    })
  }
}
