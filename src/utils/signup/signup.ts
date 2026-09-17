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
  .validator(signupSchema)
  .handler(async ({ data }) => signupService(data))

export const verifyOtpFn = createServerFn({ method: 'POST' })
  .validator(verifyOtpSchema)
  .handler(async ({ data }) => verifyOtpService(data))

export const resendOtpFn = createServerFn({ method: 'POST' })
  .validator(resendOtpSchema)
  .handler(async ({ data }) => resendOtpService(data))
