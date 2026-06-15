import crypto from 'node:crypto'
import type { z } from 'zod'
import type { User } from '@supabase/supabase-js'
import type { updateProfileSchema } from '@/schemas/profile.schema'
import {
  calculateTokenExpiry,
  checkEmailChangeRateLimit,
  generateEmailChangeToken,
  validateEmailChangeToken,
} from '@/utils/profile/domain/profile.domain'
import {
  buildVerifyLink,
  sendEmailChangeVerification,
} from '@/utils/profile/service/email.service'
import {
  clearEmailChangeTokens,
  completeEmailChange,
  findLastEmailChangeRequestAt,
  findProfileByEmailChangeToken,
  incrementEmailChangeAttempts,
  updateProfileBasic,
  updateProfileWithEmailChange,
} from '@/utils/profile/repository'
import { AppError } from '@/utils/errors'
import { getSupabaseAdminClient } from '@/utils/supabase'

export async function updateProfileBasicService(
  data: z.infer<typeof updateProfileSchema>,
  user: User,
) {
  await updateProfileBasic(user.id, {
    fullName: data.fullName,
    bio: data.bio ?? null,
  })

  return { emailChangePending: false, pendingEmail: undefined }
}

export async function updateProfileWithEmailChangeService(
  data: z.infer<typeof updateProfileSchema>,
  user: User,
) {
  const lastEmailChangeRequestAt = await findLastEmailChangeRequestAt(user.id)

  const waitSeconds = checkEmailChangeRateLimit(
    lastEmailChangeRequestAt,
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

  const { token, tokenHash } = generateEmailChangeToken()
  const expiresAt = calculateTokenExpiry()

  await updateProfileWithEmailChange(user.id, {
    fullName: data.fullName,
    bio: data.bio ?? null,
    pendingEmail: data.email,
    emailChangeTokenHash: tokenHash,
    emailChangeTokenExpiresAt: expiresAt,
  })

  const verifyLink = buildVerifyLink(token)

  try {
    await sendEmailChangeVerification(data.email, verifyLink)
  } catch (error) {
    await clearEmailChangeTokens(user.id)
    throw error
  }

  return { emailChangePending: true, pendingEmail: data.email }
}

export async function verifyEmailChangeService(
  token: string,
): Promise<{ success: boolean; message: string }> {
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
  const user = await findProfileByEmailChangeToken(tokenHash)

  if (!user) {
    return { success: false, message: 'Invalid or expired verification link.' }
  }

  const validity = validateEmailChangeToken(
    {
      emailChangeTokenExpiresAt: user.emailChangeTokenExpiresAt,
      emailChangeTokenAttempts: user.emailChangeTokenAttempts,
      pendingEmail: user.pendingEmail,
    },
    new Date(),
  )
  if (!validity.valid) {
    return { success: false, message: validity.message }
  }

  const supabaseAdmin = getSupabaseAdminClient()
  const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
    user.id,
    {
      email: user.pendingEmail!,
    },
  )

  if (updateError) {
    await incrementEmailChangeAttempts(user.id)
    return {
      success: false,
      message: 'Failed to update your email. Please try again.',
    }
  }

  await completeEmailChange(user.id, user.pendingEmail!)

  return { success: true, message: 'Your email address has been updated.' }
}
