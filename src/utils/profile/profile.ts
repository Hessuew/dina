import crypto from 'node:crypto'
import { createServerFn } from '@tanstack/react-start'
import { render } from '@react-email/render'
import { eq } from 'drizzle-orm'
import { Resend } from 'resend'
import { AppError } from '@/utils/errors'
import { getDb } from '@/db'
import { profiles } from '@/db/schema'
import { env } from '@/env'
import { getCurrentUser } from '@/utils/auth/auth'
import { getSupabaseServerClient } from '@/utils/supabase'
import { EmailChangeVerificationEmail } from '@/emails/EmailChangeVerificationEmail'
import {
  updatePasswordSchema,
  updateProfileSchema,
} from '@/schemas/profile.schema'
import { checkEmailChangeRateLimit } from '@/utils/profile/domain/profile.domain'

export const updateProfileFn = createServerFn({ method: 'POST' })
  .inputValidator(updateProfileSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    const db = await getDb()

    if (data.email !== user.email) {
      const profile = await db.query.profiles.findFirst({
        where: eq(profiles.id, user.id),
        columns: { lastEmailChangeRequestAt: true },
      })

      const waitSeconds = checkEmailChangeRateLimit(
        profile?.lastEmailChangeRequestAt ?? null,
        new Date(),
      )
      if (waitSeconds !== null) {
        throw new AppError({
          code: 'EMAIL_CHANGE_RATE_LIMITED',
          status: 429,
          userMessage: `Please wait ${waitSeconds} seconds before requesting another email change.`,
          internalMessage: `Rate limited email change for user ${user.id}`,
        })
      }

      const token = crypto.randomBytes(32).toString('hex')
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)

      await db
        .update(profiles)
        .set({
          fullName: data.fullName,
          bio: data.bio,
          pendingEmail: data.email,
          emailChangeTokenHash: tokenHash,
          emailChangeTokenExpiresAt: expiresAt,
          emailChangeTokenAttempts: 0,
          lastEmailChangeRequestAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(profiles.id, user.id))

      const appUrl = env.APP_URL ?? 'http://localhost:3000'
      const verifyLink = `${appUrl}/verify-email-change?token=${token}`

      const emailHtml = await render(
        EmailChangeVerificationEmail({ verifyLink, newEmail: data.email }),
      )

      const resend = new Resend(env.RESEND_API_KEY)
      const { error: emailError } = await resend.emails.send({
        from: env.RESEND_FROM_EMAIL,
        to: data.email,
        subject: 'Verify your new email address',
        html: emailHtml,
      })

      if (emailError) {
        await db
          .update(profiles)
          .set({
            pendingEmail: null,
            emailChangeTokenHash: null,
            emailChangeTokenExpiresAt: null,
            emailChangeTokenAttempts: 0,
            lastEmailChangeRequestAt: null,
            updatedAt: new Date(),
          })
          .where(eq(profiles.id, user.id))

        throw new AppError({
          code: 'EMAIL_SEND_FAILED',
          status: 500,
          userMessage: 'Failed to send verification email. Please try again.',
          internalMessage: `Resend error: ${emailError.message}`,
        })
      }

      return { emailChangePending: true, pendingEmail: data.email }
    }

    await db
      .update(profiles)
      .set({
        fullName: data.fullName,
        bio: data.bio,
        updatedAt: new Date(),
      })
      .where(eq(profiles.id, user.id))

    return { emailChangePending: false, pendingEmail: undefined }
  })

export const updatePasswordFn = createServerFn({ method: 'POST' })
  .inputValidator(updatePasswordSchema)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()

    const { error } = await supabase.auth.updateUser({
      password: data.newPassword,
    })

    if (error) {
      throw new AppError({
        code: 'PASSWORD_UPDATE_FAILED',
        status: 400,
        userMessage: error.message,
        internalMessage: `Supabase auth error: ${error.message}`,
      })
    }
  })
