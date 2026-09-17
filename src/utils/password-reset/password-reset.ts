import { createServerFn } from '@tanstack/react-start'
import {
  requestPasswordResetSchema,
  resetPasswordSchema,
  validateResetTokenSchema,
} from '@/schemas/auth.schema'
import {
  requestPasswordResetService,
  resetPasswordService,
  validateResetTokenService,
} from '@/utils/password-reset/service/password-reset.service'

export const requestPasswordResetFn = createServerFn({ method: 'POST' })
  .validator(requestPasswordResetSchema)
  .handler(async ({ data }) =>
    requestPasswordResetService(data.email.toLowerCase().trim()),
  )

export const validateResetTokenFn = createServerFn({ method: 'POST' })
  .validator(validateResetTokenSchema)
  .handler(async ({ data }) => validateResetTokenService(data.token))

export const resetPasswordFn = createServerFn({ method: 'POST' })
  .validator(resetPasswordSchema)
  .handler(async ({ data }) =>
    resetPasswordService(data.token, data.newPassword),
  )
