import crypto from 'node:crypto'
import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { profiles } from '@/db/schema'
import { getSupabaseAdminClient } from '@/utils/supabase'
import { ResetPasswordForm } from '@/components/reset-password-form'

export const validateResetTokenFn = createServerFn({ method: 'POST' })
  .inputValidator((d: { token: string }) => d)
  .handler(async ({ data }) => {
    if (!data.token) {
      return {
        valid: false,
        message: 'No reset token provided',
      }
    }

    const tokenHash = crypto
      .createHash('sha256')
      .update(data.token)
      .digest('hex')

    const user = await db.query.profiles.findFirst({
      where: eq(profiles.resetTokenHash, tokenHash),
    })

    if (!user) {
      return {
        valid: false,
        message: 'Invalid reset token',
      }
    }

    if (!user.resetTokenExpiresAt) {
      return {
        valid: false,
        message: 'Reset token has expired',
      }
    }

    if (new Date() > user.resetTokenExpiresAt) {
      return {
        valid: false,
        message: 'Reset token has expired. Please request a new one.',
      }
    }

    if (user.resetTokenAttempts >= 5) {
      return {
        valid: false,
        message: 'Too many failed attempts. Please request a new reset link.',
      }
    }

    return {
      valid: true,
      message: 'Token is valid',
    }
  })

export const resetPasswordFn = createServerFn({ method: 'POST' })
  .inputValidator((d: { token: string; newPassword: string }) => d)
  .handler(async ({ data }) => {
    if (!data.token || !data.newPassword) {
      return {
        success: false,
        message: 'Missing required fields',
      }
    }

    if (data.newPassword.length < 8) {
      return {
        success: false,
        message: 'Password must be at least 8 characters',
      }
    }

    const tokenHash = crypto
      .createHash('sha256')
      .update(data.token)
      .digest('hex')

    const user = await db.query.profiles.findFirst({
      where: eq(profiles.resetTokenHash, tokenHash),
    })

    if (!user) {
      return {
        success: false,
        message: 'Invalid reset token',
      }
    }

    if (!user.resetTokenExpiresAt) {
      return {
        success: false,
        message: 'Reset token has expired',
      }
    }

    if (new Date() > user.resetTokenExpiresAt) {
      return {
        success: false,
        message: 'Reset token has expired. Please request a new one.',
      }
    }

    if (user.resetTokenAttempts >= 5) {
      return {
        success: false,
        message: 'Too many failed attempts. Please request a new reset link.',
      }
    }

    const supabaseAdmin = getSupabaseAdminClient()

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      {
        password: data.newPassword,
      },
    )

    if (updateError) {
      console.error('Failed to update password:', updateError)

      await db
        .update(profiles)
        .set({
          resetTokenAttempts: user.resetTokenAttempts + 1,
          updatedAt: new Date(),
        })
        .where(eq(profiles.id, user.id))

      return {
        success: false,
        message: 'Failed to reset password. Please try again.',
      }
    }

    await db
      .update(profiles)
      .set({
        resetTokenHash: null,
        resetTokenExpiresAt: null,
        resetTokenAttempts: 0,
        lastResetRequestAt: null,
        updatedAt: new Date(),
      })
      .where(eq(profiles.id, user.id))

    return {
      success: true,
      message: 'Password reset successfully',
    }
  })

export const Route = createFileRoute('/reset-password')({
  validateSearch: (search: Record<string, unknown>) => {
    return {
      token: (search.token as string) || '',
    }
  },
  component: ResetPasswordComp,
})

function ResetPasswordComp() {
  const { token } = Route.useSearch()

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <ResetPasswordForm token={token} />
      </div>
    </div>
  )
}
