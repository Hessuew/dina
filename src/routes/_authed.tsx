import { createFileRoute, redirect } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { loginSchema } from '@/schemas/auth.schema'
import { loginService } from '@/utils/auth/login'
import { toUserError } from '@/utils/errors'

export const loginFn = createServerFn({ method: 'POST' })
  .inputValidator(loginSchema)
  .handler(({ data }) => loginService(data))

export const Route = createFileRoute('/_authed')({
  beforeLoad: ({ context }) => {
    if (!context.user) {
      throw redirect({
        to: '/login',
      })
    }
  },
  errorComponent: ({ error }) => {
    const userError = toUserError(error)

    if (userError.code === 'AUTHENTICATION_REQUIRED') {
      throw redirect({
        to: '/login',
      })
    }

    throw error
  },
})
