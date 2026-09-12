import crypto from 'node:crypto'
import type { z } from 'zod'
import type { User } from '@supabase/supabase-js'
import type { updateProfileSchema } from '@/schemas/profile.schema'
import type { LogLevel } from '@/utils/observability/logger'
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
import { logServerEvent } from '@/utils/observability/logger'
import { elapsedMs, getRequestId } from '@/utils/observability/request-context'
import {
  getSupabaseAdminClient,
  getSupabaseServerClient,
} from '@/utils/supabase'

type ProfileAction = 'updateProfile' | 'updatePassword' | 'verifyEmailChange'

type ProfileLogContext = {
  action: ProfileAction
  startedAt: number
}

function logProfileEvent(
  level: LogLevel,
  event: string,
  context: ProfileLogContext,
  fields: Record<string, unknown> = {},
): void {
  logServerEvent(level, event, {
    requestId: getRequestId(),
    path: `serverFn:${context.action}`,
    status: level === 'error' ? 'failure' : 'success',
    durationMs: elapsedMs(context.startedAt),
    ...fields,
  })
}

export async function updateProfileBasicService(
  data: z.infer<typeof updateProfileSchema>,
  user: User,
) {
  const context: ProfileLogContext = {
    action: 'updateProfile',
    startedAt: performance.now(),
  }
  try {
    await updateProfileBasic(user.id, {
      fullName: data.fullName,
      bio: data.bio ?? null,
    })
  } catch (error) {
    logProfileEvent('error', 'profile_update_failed', context, {
      errorCategory: 'profile_persistence',
      userId: user.id,
    })
    throw error
  }

  logProfileEvent('info', 'profile_updated', context, {
    updateType: 'basic',
    userId: user.id,
  })

  return { emailChangePending: false, pendingEmail: undefined }
}

export async function updatePasswordService(
  newPassword: string,
  userId: string,
): Promise<void> {
  const context: ProfileLogContext = {
    action: 'updatePassword',
    startedAt: performance.now(),
  }

  try {
    const { error } = await getSupabaseServerClient().auth.updateUser({
      password: newPassword,
    })

    if (error) {
      logProfileEvent('error', 'password_update_failed', context, {
        errorCategory: 'password_update',
        providerCode: error.code ?? 'unknown',
        userId,
      })
      throw new AppError({
        code: 'PASSWORD_UPDATE_FAILED',
        status: 400,
        userMessage: error.message,
        internalMessage: 'Supabase auth password update failed',
      })
    }
  } catch (error) {
    if (error instanceof AppError) throw error
    logProfileEvent('error', 'password_update_failed', context, {
      errorCategory: 'password_update',
      userId,
    })
    throw error
  }

  logProfileEvent('info', 'password_updated', context, { userId })
}

export async function updateProfileWithEmailChangeService(
  data: z.infer<typeof updateProfileSchema>,
  user: User,
) {
  const context: ProfileLogContext = {
    action: 'updateProfile',
    startedAt: performance.now(),
  }
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

  try {
    await updateProfileWithEmailChange(user.id, {
      fullName: data.fullName,
      bio: data.bio ?? null,
      pendingEmail: data.email,
      emailChangeTokenHash: tokenHash,
      emailChangeTokenExpiresAt: expiresAt,
    })
  } catch (error) {
    logProfileEvent('error', 'email_change_request_failed', context, {
      errorCategory: 'email_change_persistence',
      userId: user.id,
    })
    throw error
  }

  const verifyLink = buildVerifyLink(token)

  try {
    await sendEmailChangeVerification(data.email, verifyLink)
  } catch (error) {
    logProfileEvent('error', 'email_change_request_failed', context, {
      errorCategory: 'email_change_email_delivery',
      userId: user.id,
    })
    await clearEmailChangeTokens(user.id)
    throw error
  }

  logProfileEvent('info', 'email_change_requested', context, {
    userId: user.id,
  })

  return { emailChangePending: true, pendingEmail: data.email }
}

export async function verifyEmailChangeService(
  token: string,
): Promise<{ success: boolean; message: string }> {
  const context: ProfileLogContext = {
    action: 'verifyEmailChange',
    startedAt: performance.now(),
  }
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
    logProfileEvent('error', 'email_change_update_failed', context, {
      errorCategory: 'email_change_auth_update',
      providerCode: updateError.code ?? 'unknown',
      userId: user.id,
    })
    await incrementEmailChangeAttempts(user.id)
    return {
      success: false,
      message: 'Failed to update your email. Please try again.',
    }
  }

  try {
    await completeEmailChange(user.id, user.pendingEmail!)
  } catch (error) {
    logProfileEvent('error', 'email_change_completion_failed', context, {
      errorCategory: 'email_change_persistence',
      userId: user.id,
    })
    throw error
  }

  logProfileEvent('info', 'email_change_completed', context, {
    userId: user.id,
  })

  return { success: true, message: 'Your email address has been updated.' }
}
