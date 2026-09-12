import { createServerFn } from '@tanstack/react-start'
import { getCurrentUser } from '@/utils/auth/auth'
import {
  updatePasswordSchema,
  updateProfileSchema,
} from '@/schemas/profile.schema'
import {
  updatePasswordService,
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
    const user = await getCurrentUser()
    await updatePasswordService(data.newPassword, user.id)
  })

export const verifyEmailChangeFn = createServerFn({ method: 'POST' })
  .inputValidator((data: { token: string }) => data)
  .handler(async ({ data }) => verifyEmailChangeService(data.token))
