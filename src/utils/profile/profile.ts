import { createServerFn } from '@tanstack/react-start'
import { AppError } from '@/utils/errors'
import { getCurrentUser } from '@/utils/auth/auth'
import { getSupabaseServerClient } from '@/utils/supabase'
import {
  updatePasswordSchema,
  updateProfileSchema,
} from '@/schemas/profile.schema'
import {
  updateProfileBasicService,
  updateProfileWithEmailChangeService,
  verifyEmailChangeService,
} from '@/utils/profile/service/profile.service'

export const updateProfileFn = createServerFn({ method: 'POST' })
  .inputValidator(updateProfileSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()

    if (data.email === user.email) {
      return await updateProfileBasicService(data, user)
    }

    return await updateProfileWithEmailChangeService(data, user)
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

export const verifyEmailChangeFn = createServerFn({ method: 'POST' })
  .inputValidator((data: { token: string }) => data)
  .handler(async ({ data }) => verifyEmailChangeService(data.token))
