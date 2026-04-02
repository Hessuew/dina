import { createFileRoute, redirect } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { loginSchema } from '@/schemas/auth.schema'
import { getSupabaseServerClient } from '@/utils/supabase'

export const loginFn = createServerFn({ method: 'POST' })
  .inputValidator(loginSchema)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    })

    if (error) {
      return {
        error: true,
        message: error.message,
      }
    }
  })

export const Route = createFileRoute('/_authed')({
  beforeLoad: ({ context }) => {
    if (!context.user) {
      throw redirect({
        to: '/login',
      })
    }
  },
  errorComponent: ({ error }) => {
    if (error.message === 'Not authenticated') {
      throw redirect({
        to: '/login',
      })
    }

    throw error
  },
})
