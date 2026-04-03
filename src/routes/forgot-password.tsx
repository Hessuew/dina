import crypto from 'node:crypto'
import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { eq } from 'drizzle-orm'
import { render } from '@react-email/render'
import { Resend } from 'resend'
import { db } from '@/db'
import { profiles } from '@/db/schema'
import { env } from '@/env'
import { ForgotPasswordForm } from '@/components/forgot-password-form'
import { PasswordResetEmail } from '@/emails/PasswordResetEmail'
import { requestPasswordResetSchema } from '@/schemas/auth.schema'

const resend = new Resend(env.RESEND_API_KEY)

export const requestPasswordResetFn = createServerFn({ method: 'POST' })
  .inputValidator(requestPasswordResetSchema)
  .handler(async ({ data }) => {
    const email = data.email.toLowerCase().trim()

    // Find user by email
    const user = await db.query.profiles.findFirst({
      where: eq(profiles.email, email),
    })

    // Check 60s cooldown if user exists
    if (user?.lastResetRequestAt) {
      const timeSinceLastRequest =
        Date.now() - user.lastResetRequestAt.getTime()
      if (timeSinceLastRequest < 60 * 1000) {
        const waitSeconds = Math.ceil((60 * 1000 - timeSinceLastRequest) / 1000)
        return {
          success: false,
          message: `Please wait ${waitSeconds} seconds before requesting another reset link.`,
        }
      }
    }

    // If user doesn't exist, still return success (don't leak user existence)
    if (!user) {
      return {
        success: true,
        message:
          'If an account exists with this email, you will receive a password reset link.',
      }
    }

    // Generate secure random token
    const resetToken = crypto.randomBytes(32).toString('hex')
    const resetTokenHash = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex')
    const resetTokenExpiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

    // Update user with reset token
    await db
      .update(profiles)
      .set({
        resetTokenHash,
        resetTokenExpiresAt,
        resetTokenAttempts: 0,
        lastResetRequestAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(profiles.id, user.id))

    // Build reset link
    const appUrl = env.APP_URL || env.SERVER_URL || 'http://localhost:3000'
    const resetLink = `${appUrl}/reset-password?token=${resetToken}`

    // Send email
    const emailHtml = await render(
      PasswordResetEmail({
        resetLink,
        expiryMinutes: 10,
      }),
    )

    const { error: emailError } = await resend.emails.send({
      from: env.RESEND_FROM_EMAIL,
      to: email,
      subject: 'Reset your password',
      html: emailHtml,
    })

    if (emailError) {
      console.error('Failed to send password reset email:', emailError)
      return {
        success: false,
        message: 'Failed to send reset email. Please try again.',
      }
    }

    return {
      success: true,
      message:
        'If an account exists with this email, you will receive a password reset link.',
    }
  })

export const Route = createFileRoute('/forgot-password')({
  component: ForgotPasswordComp,
})

function ForgotPasswordComp() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <ForgotPasswordForm />
      </div>
    </div>
  )
}
