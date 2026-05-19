import type { z } from 'zod'
import type { User } from '@supabase/supabase-js'
import type { updateProfileSchema } from '@/schemas/profile.schema'
import {
  calculateTokenExpiry,
  checkEmailChangeRateLimit,
  generateEmailChangeToken,
} from '@/utils/profile/domain/profile.domain'
import {
  buildVerifyLink,
  sendEmailChangeVerification,
} from '@/utils/profile/service/email.service'
import {
  clearEmailChangeTokens,
  findProfileById,
  updateProfileBasic,
  updateProfileWithEmailChange,
} from '@/utils/profile/repository'
import { AppError } from '@/utils/errors'

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
  const profile = await findProfileById(user.id)

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
