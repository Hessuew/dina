import { createServerFn } from '@tanstack/react-start'
import {
  resendOtpSchema,
  signupSchema,
  verifyOtpSchema,
} from '@/schemas/auth.schema'
import {
  resendOtpService,
  signupService,
  verifyOtpService,
} from '@/utils/signup/service/signup.service'

export const signupFn = createServerFn({ method: 'POST' })
  .inputValidator(signupSchema)
  .handler(async ({ data }) => signupService(data))

export const verifyOtpFn = createServerFn({ method: 'POST' })
  .inputValidator(verifyOtpSchema)
  .handler(async ({ data }) => verifyOtpService(data))

export const resendOtpFn = createServerFn({ method: 'POST' })
  .inputValidator(resendOtpSchema)
  .handler(async ({ data }) => resendOtpService(data))
